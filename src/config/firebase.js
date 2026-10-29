// config/firebase.js — Khởi tạo Firebase (Auth + Firestore) cho AIBox
//
// Config dưới đây là "web app config" của Firebase: các khoá này KHÔNG phải bí mật
// (chúng nằm trong bundle web bình thường). Bảo mật thật nằm ở Firestore Rules.
// Nếu muốn tách khỏi source code: chuyển sang process.env.EXPO_PUBLIC_FIREBASE_*
// và khai báo trong file .env (xem .env.example).
//
// LƯU Ý: Google Sign-In cần thêm OAuth Web Client ID (không nằm trong config web ở trên).
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

export const firebaseConfig = {
  apiKey: 'AIzaSyBzWi7orcyD-Cj05EmCLbJtf7QU8kB5eqM',
  authDomain: 'bonus6-41a9b.firebaseapp.com',
  projectId: 'bonus6-41a9b',
  storageBucket: 'bonus6-41a9b.firebasestorage.app',
  messagingSenderId: '767101615493',
  appId: '1:767101615493:web:8bab4ab8caf4728fb018ec',
};

// Web client ID của Google OAuth (bắt buộc để lấy idToken cho Firebase)
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

// Danh sách email được cấp role admin ngay lần đăng nhập đầu tiên
export const ADMIN_EMAILS = String(process.env.EXPO_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

// Chỉ khởi tạo 1 lần (Fast Refresh có thể chạy lại module này)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Auth + AsyncStorage: giữ đăng nhập qua các lần mở app.
// initializeAuth ném lỗi nếu auth đã được khởi tạo (hot reload) → fallback getAuth.
// getReactNativePersistence chỉ có trong build "react-native" của @firebase/auth;
// nếu Metro resolve sai build thì hàm này undefined → cảnh báo rõ thay vì im lặng.
let auth;
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

export const authInstance = auth;
export const db = getFirestore(app);

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
