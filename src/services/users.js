// services/users.js — Quản lý hồ sơ người dùng trên Firestore
//
// Collection: users/{uid}
//   uid, email, displayName, username, avatar, photoURL,
//   role: 'user' | 'admin', status: 'active' | 'banned',
//   provider: 'google' | 'email', createdAt, lastLoginAt
//
// Role/status là nguồn sự thật ở Firestore. Ví token / giao dịch / quests vẫn
// nằm local (AsyncStorage) để demo offline, key theo uid của Firebase.

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, ADMIN_EMAILS } from '../config/firebase';

const USERS_COLLECTION = 'users';
const MAX_DIRECTORY = 100;

// Chưa điền config Firebase trong .env → trả lỗi rõ ràng thay vì crash
const NO_DB_ERROR = 'Chưa cấu hình Firebase trong .env (thiếu apiKey/projectId/appId).';

// Email trong whitelist .env → admin ngay từ lần đầu đăng nhập
export function defaultRoleFor(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalized) ? 'admin' : 'user';
}

// Lỗi Firestore hay gặp → câu tiếng Việt dễ hiểu cho UI
export function friendlyFirestoreError(error) {
  const code = error?.code || '';
  if (code.includes('permission-denied')) {
    return 'Firestore từ chối truy cập (permission-denied). Kiểm tra lại Rules đã deploy chưa.';
  }
  if (code.includes('unavailable') || code.includes('network')) {
    return 'Không kết nối được Firestore (mạng hoặc project chưa bật Firestore).';
  }
  if (code.includes('not-found')) {
    return 'Chưa bật Firestore Database cho project này.';
  }
  return error?.message || 'Lỗi không xác định khi đọc/ghi Firestore.';
}

function buildProfileFields(fbUser) {
  const email = String(fbUser.email || '').toLowerCase();
  return {
    uid: fbUser.uid,
    email,
    displayName: fbUser.displayName || email.split('@')[0] || 'Người dùng',
    photoURL: fbUser.photoURL || null,
    provider: fbUser.provider || 'google',
  };
}

// Đọc hồ sơ; nếu chưa có thì tạo mới. Luôn trả profile để app không bị chặn
// khi Firestore chưa cấu hình (khi đó syncError có giá trị).
export async function ensureUserProfile(fbUser) {
  const fields = buildProfileFields(fbUser);
  const fallback = {
    ...fields,
    username: fields.displayName,
    avatar: null,
    role: defaultRoleFor(fields.email),
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  if (!db) return { profile: fallback, syncError: NO_DB_ERROR };

  try {
    const ref = doc(db, USERS_COLLECTION, fbUser.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, fallback);
      return { profile: fallback, syncError: null };
    }

    const data = snap.data();
    const emailAdmin = defaultRoleFor(fields.email) === 'admin';
    // Whitelist .env luôn thắng: đảm bảo admin không tự mất quyền khi rules chặn update
    const role = emailAdmin ? 'admin' : (data.role === 'admin' ? 'admin' : 'user');

    const patch = {
      email: fields.email,
      displayName: fields.displayName,
      lastLoginAt: new Date().toISOString(),
    };
    // Chỉ lấy ảnh Google khi hồ sơ chưa có field photoURL: người dùng đã tự chọn
    // avatar emoji (photoURL = null) thì không bị ảnh Google ghi đè mỗi lần login.
    if (!('photoURL' in data)) patch.photoURL = fields.photoURL;
    if (role !== data.role) patch.role = role;

    await updateDoc(ref, patch);
    return { profile: { ...data, ...patch, role }, syncError: null };
  } catch (error) {
    return { profile: fallback, syncError: friendlyFirestoreError(error) };
  }
}

export async function getUserProfile(uid) {
  if (!db) return { profile: null, error: NO_DB_ERROR };
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    return { profile: snap.exists() ? snap.data() : null, error: null };
  } catch (error) {
    return { profile: null, error: friendlyFirestoreError(error) };
  }
}

// Real-time: admin đổi role/ban ở máy khác thì app cập nhật ngay
export function subscribeUserProfile(uid, callback) {
  if (!db) {
    callback({ profile: null, error: NO_DB_ERROR });
    return () => {};
  }
  return onSnapshot(
    doc(db, USERS_COLLECTION, uid),
    snap => callback({ profile: snap.exists() ? snap.data() : null, error: null }),
    error => callback({ profile: null, error: friendlyFirestoreError(error) })
  );
}

// Cập nhật các field người dùng được tự sửa (không cho đổi role/status)
export async function updateUserProfile(uid, fields) {
  const allowed = {};
  if (typeof fields.username === 'string') allowed.username = fields.username.trim();
  if (typeof fields.avatar === 'string') allowed.avatar = fields.avatar;
  if (typeof fields.displayName === 'string') allowed.displayName = fields.displayName.trim();
  // Chọn avatar emoji → xoá ảnh Google để avatar hiển thị đúng
  if (fields.photoURL === null) allowed.photoURL = null;
  if (typeof fields.photoURL === 'string') allowed.photoURL = fields.photoURL;
  if (Object.keys(allowed).length === 0) return { ok: true };
  if (!db) return { ok: false, error: NO_DB_ERROR };

  try {
    await updateDoc(doc(db, USERS_COLLECTION, uid), allowed);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyFirestoreError(error) };
  }
}

// Admin đổi quyền
export async function updateUserRole(uid, role) {
  if (!db) return { ok: false, error: NO_DB_ERROR };
  try {
    await updateDoc(doc(db, USERS_COLLECTION, uid), { role });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyFirestoreError(error) };
  }
}

// Admin ban / unban
export async function updateUserStatus(uid, status) {
  if (!db) return { ok: false, error: NO_DB_ERROR };
  try {
    await updateDoc(doc(db, USERS_COLLECTION, uid), { status });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyFirestoreError(error) };
  }
}

// Danh sách người dùng cho Admin CMS
export async function listUserProfiles() {
  if (!db) return { users: [], error: NO_DB_ERROR };
  try {
    const snap = await getDocs(
      query(collection(db, USERS_COLLECTION), orderBy('email'), limit(MAX_DIRECTORY))
    );
    const users = snap.docs.map(item => ({ id: item.id, ...item.data() }));
    return { users, error: null };
  } catch {
    // orderBy cần index nếu collection lớn → fallback đọc không sort
    try {
      const snap = await getDocs(query(collection(db, USERS_COLLECTION), limit(MAX_DIRECTORY)));
      const users = snap.docs.map(item => ({ id: item.id, ...item.data() }));
      return { users, error: null };
    } catch (fallbackError) {
      return { users: [], error: friendlyFirestoreError(fallbackError) };
    }
  }
}
