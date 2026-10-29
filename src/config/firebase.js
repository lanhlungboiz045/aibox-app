// config/firebase.js — Khởi tạo Firebase (Auth + Firestore) cho AIBox
//
// Toàn bộ config đọc từ file .env (xem .env.example). Nhờ vậy đổi sang project
// Firebase khác chỉ cần sửa .env + restart Metro, không phải sửa code.
//
// Các khoá dưới đây là "web app config" — KHÔNG phải bí mật (chúng nằm trong
// bundle web bình thường). Bảo mật thật nằm ở firestore.rules.
//
// LƯU Ý: Google Sign-In cần thêm OAuth Web Client ID (khác config web ở trên).
// Lấy tại Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration.
// Android còn phải thêm SHA-1 của keystore vào app Android trong Firebase Console.

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const env = process.env;

export const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// 3 field này là tối thiểu để Firebase Auth/Firestore chạy được
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

// Danh sách field còn thiếu — hiển thị trong màn đăng nhập để dễ sửa .env
export const missingFirebaseFields = [
  ['EXPO_PUBLIC_FIREBASE_API_KEY', firebaseConfig.apiKey],
  ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
  ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
  ['EXPO_PUBLIC_FIREBASE_APP_ID', firebaseConfig.appId],
].filter(([, value]) => !value).map(([name]) => name);

// Web client ID của Google OAuth (bắt buộc để lấy idToken cho Firebase)
export const GOOGLE_WEB_CLIENT_ID = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

// Danh sách email được cấp role admin ngay lần đăng nhập đầu tiên
// (nhớ khai báo lại y hệt trong firestore.rules → adminEmails())
export const ADMIN_EMAILS = String(env.EXPO_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

// Chỉ khởi tạo khi .env đã có config, tránh crash trắng màn hình ở lần chạy đầu
let app = null;
let auth = null;
let firestore = null;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  // Auth + AsyncStorage: giữ đăng nhập qua các lần mở app.
  // initializeAuth ném lỗi nếu auth đã được khởi tạo (hot reload) → fallback getAuth.
  // getReactNativePersistence chỉ có trong build "react-native" của @firebase/auth;
  // nếu Metro resolve sai build thì hàm này undefined → cảnh báo rõ thay vì im lặng.
  if (typeof getReactNativePersistence === 'function') {
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (e) {
      auth = getAuth(app);
    }
  } else {
    if (__DEV__) {
      console.warn(
        '[firebase] Không tìm thấy getReactNativePersistence — phiên đăng nhập sẽ không được lưu. '
        + 'Kiểm tra version firebase (cần 10.14.x) và restart Metro với -c.'
      );
    }
    auth = getAuth(app);
  }

  firestore = getFirestore(app);
}

export const firebaseApp = app;
export const authInstance = auth;
export const db = firestore;

let googleConfigured = false;

// Cấu hình GoogleSignin đúng 1 lần, trước khi gọi signIn()
export function configureGoogleSignin() {
  if (googleConfigured || !GOOGLE_WEB_CLIENT_ID) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
  googleConfigured = true;
}

export const googleAuthProvider = new GoogleAuthProvider();
