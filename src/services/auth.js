// services/auth.js — Firebase email/password and Google authentication.
//
// Google: GoogleSignin (native) → idToken → Firebase credential
// Email: Firebase email/password provider (works in Expo Go and dev builds)
// Firebase tự quản refresh token + lưu phiên bằng AsyncStorage, nên KHÔNG cần
// tự làm session/expiry như bản mock trước đây.
//
// Yêu cầu môi trường: phải build dev client (npx expo run:android) vì
// @react-native-google-signin là native module — không chạy trong Expo Go.
// Vì vậy module native được require LAZY: chạy trong Expo Go sẽ thấy thông báo
// "cần dev build" thay vì crash ngay khi mở app.

import { Platform, TurboModuleRegistry } from 'react-native';
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  authInstance,
  GOOGLE_WEB_CLIENT_ID,
  isFirebaseConfigured,
  missingFirebaseFields,
} from '../config/firebase';

// Module native có được nhúng vào app không? (Expo Go → không có)
export function isGoogleSignInNativeAvailable() {
  try {
    return Boolean(TurboModuleRegistry.get('RNGoogleSignin'));
  } catch (e) {
    return false;
  }
}

let cachedModule;
// require lazy: TurboModuleRegistry.getEnforcing bên trong package sẽ throw nếu
// không có native module, nên chỉ gọi khi thật sự cần.
function loadGoogleSignin() {
  if (cachedModule !== undefined) return cachedModule;
  try {
    cachedModule = require('@react-native-google-signin/google-signin');
  } catch (e) {
    cachedModule = null;
  }
  return cachedModule;
}

// Cần đủ 3 thứ: config Firebase + Google Web Client ID + native module (dev build)
export function isGoogleSignInConfigured() {
  return (
    isFirebaseConfigured
    && Boolean(GOOGLE_WEB_CLIENT_ID)
    && isGoogleSignInNativeAvailable()
  );
}

// Thông báo thiếu cấu hình, liệt kê đúng biến còn trống trong .env
export function getSetupError() {
  if (!isFirebaseConfigured) {
    const list = missingFirebaseFields.length > 0
      ? missingFirebaseFields.join(', ')
      : 'EXPO_PUBLIC_FIREBASE_*';
    return (
      'Chưa cấu hình Firebase.\n\n'
      + `Điền vào .env: ${list}\n`
      + '(Firebase Console → Project settings → Your apps → SDK setup and configuration)\n'
      + 'Sau đó restart Metro: npx expo start -c'
    );
  }
  if (!GOOGLE_WEB_CLIENT_ID) {
    return (
      'Chưa cấu hình Google Web Client ID.\n\n'
      + 'Thêm EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID vào file .env '
      + '(Firebase Console → Authentication → Google → Web SDK configuration).'
    );
  }
  if (!isGoogleSignInNativeAvailable()) {
    return (
      'Bạn đang chạy bằng Expo Go — Expo Go không chứa Google Sign-In native.\n\n'
      + 'Cần build dev client:\n'
      + '  npx expo run:android\n'
      + 'Sau đó mở app AIBox vừa cài trên máy (không quét QR bằng Expo Go).'
    );
  }
  return null;
}

// Cấu hình GoogleSignin đúng 1 lần, trước khi gọi signIn()
let googleConfigured = false;
function configureGoogleSignin(GoogleSignin) {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
  googleConfigured = true;
}

// Rút gọn Firebase User thành object thuần để đưa vào React state
export function mapFirebaseUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Người dùng'),
    photoURL: user.photoURL || null,
    provider: user.providerData?.some(item => item.providerId === 'google.com') ? 'google' : 'email',
  };
}

// Lắng nghe trạng thái đăng nhập (Firebase tự restore phiên từ AsyncStorage)
export function subscribeAuth(callback) {
  // Chưa cấu hình Firebase → coi như chưa đăng nhập để app vẫn mở được màn login
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(authInstance, user => callback(mapFirebaseUser(user)));
}

// Đăng nhập bằng Google. Trả { ok, error?, cancelled? } — không throw ra UI.
export async function signInWithGoogle() {
  const setupError = getSetupError();
  if (setupError) return { ok: false, error: setupError };

  const mod = loadGoogleSignin();
  if (!mod) return { ok: false, error: getSetupError() || 'Không nạp được Google Sign-In native.' };
  const { GoogleSignin, statusCodes } = mod;
  configureGoogleSignin(GoogleSignin);

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await GoogleSignin.signIn();
    // v13+ trả { type: 'success' | 'cancelled', data: { idToken } }
    // v12 trả thẳng object người dùng → đọc cả 2 kiểu cho chắc
    const idToken = response?.data?.idToken || response?.idToken;
    if (!idToken) {
      return {
        ok: false,
        error:
          'Google không trả về idToken. Kiểm tra lại Web Client ID và SHA-1 '
          + 'của app Android trong Firebase Console.',
      };
    }

    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(authInstance, credential);
    return { ok: true };
  } catch (error) {
    const code = error?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED) return { ok: false, cancelled: true };
    if (code === statusCodes.IN_PROGRESS) return { ok: false, error: 'Đang xử lý đăng nhập, thử lại sau vài giây.' };
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { ok: false, error: 'Thiết bị chưa có hoặc chưa cập nhật Google Play Services.' };
    }
    return { ok: false, error: error?.message || 'Đăng nhập Google thất bại.' };
  }
}

function emailAuthError(error) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'Địa chỉ email không hợp lệ.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email hoặc mật khẩu không chính xác.';
    case 'auth/email-already-in-use':
      return 'Email này đã được đăng ký. Hãy đăng nhập thay vì tạo tài khoản mới.';
    case 'auth/weak-password':
      return 'Mật khẩu cần có ít nhất 6 ký tự.';
    case 'auth/operation-not-allowed':
      return 'Email/mật khẩu chưa được bật trong Firebase Authentication.';
    case 'auth/network-request-failed':
      return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
    default:
      return error?.message || 'Xác thực thất bại. Vui lòng thử lại.';
  }
}

export async function signInWithEmail(email, password) {
  if (!authInstance) return { ok: false, error: getSetupError() };
  try {
    await signInWithEmailAndPassword(authInstance, email.trim().toLowerCase(), password);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: emailAuthError(error) };
  }
}

export async function registerWithEmail(email, password) {
  if (!authInstance) return { ok: false, error: getSetupError() };
  try {
    await createUserWithEmailAndPassword(authInstance, email.trim().toLowerCase(), password);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: emailAuthError(error) };
  }
}

// Đăng xuất cả Google (chọn lại tài khoản) và Firebase
export async function signOutGoogle() {
  const mod = loadGoogleSignin();
  if (mod) {
    try {
      await mod.GoogleSignin.signOut();
    } catch (e) {
      // Không đăng nhập bằng GoogleSignin (ví dụ phiên cũ / Expo Go) → bỏ qua
    }
  }
  if (authInstance) await firebaseSignOut(authInstance);
}
