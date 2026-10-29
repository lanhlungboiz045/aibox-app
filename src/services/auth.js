// services/auth.js — Đăng nhập Google (Firebase Auth) cho React Native
//
// Luồng: GoogleSignin (native) → idToken → Firebase credential → signInWithCredential
// Firebase tự quản refresh token + lưu phiên bằng AsyncStorage, nên KHÔNG cần
// tự làm session/expiry như bản mock trước đây.
//
// Yêu cầu môi trường: phải build dev client (npx expo run:android) vì
// @react-native-google-signin là native module — không chạy trong Expo Go.

import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  authInstance,
  configureGoogleSignin,
  GOOGLE_WEB_CLIENT_ID,
  isFirebaseConfigured,
  missingFirebaseFields,
} from '../config/firebase';

// Cần đủ 2 thứ: config Firebase trong .env + Google Web Client ID
export function isGoogleSignInConfigured() {
  return isFirebaseConfigured && Boolean(GOOGLE_WEB_CLIENT_ID);
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
  return null;
}

// Rút gọn Firebase User thành object thuần để đưa vào React state
export function mapFirebaseUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Người dùng'),
    photoURL: user.photoURL || null,
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

  configureGoogleSignin();

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

// Đăng xuất cả Google (chọn lại tài khoản) và Firebase
export async function signOutGoogle() {
  try {
    await GoogleSignin.signOut();
  } catch (e) {
    // Không đăng nhập bằng GoogleSignin (ví dụ phiên cũ) → bỏ qua
  }
  if (authInstance) await firebaseSignOut(authInstance);
}
