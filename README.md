# AIBox — React Native App (JavaScript)

Nền tảng AI Marketplace + Prediction Market + Token Trading, xây bằng React Native (Expo) + JavaScript.
Đăng nhập **chỉ bằng Google** qua Firebase Authentication; hồ sơ người dùng (role, trạng thái, tên, avatar)
lưu trên **Firestore**; ví token / positions / quests lưu local theo `uid` Firebase.

## 1. Cài đặt

```bash
cd aibox-app
npm install
```

Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

Điền 2 biến:

| Biến | Ý nghĩa |
| --- | --- |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Web client ID của Google OAuth (bắt buộc) |
| `EXPO_PUBLIC_ADMIN_EMAILS` | Email được cấp role System Admin, cách nhau dấu phẩy |

## 2. Cấu hình Firebase (bắt buộc, làm 1 lần)

1. **Tạo/bật Authentication**
   - Firebase Console → Authentication → Get started
   - Sign-in method → bật **Google** → chọn email hỗ trợ → Save
   - Mở Google provider → **Web SDK configuration** → copy **Web client ID**
     (dạng `767101615493-xxxx.apps.googleusercontent.com`) → dán vào `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

2. **Bật Firestore Database**
   - Firestore Database → Create database → chọn production mode → chọn region gần (asia-southeast1).

3. **Deploy Security Rules**
   - Firestore Database → Rules → dán nội dung `firestore.rules` → Publish.
   - ⚠️ Sửa danh sách `adminEmails()` trong `firestore.rules` cho khớp `.env`
     (Rules chạy trên server nên không đọc được biến `EXPO_PUBLIC_*`).
   - Chưa deploy rules thì app vẫn đăng nhập được nhưng sẽ hiện cảnh báo
     "Chưa đồng bộ được hồ sơ với Firestore" và mọi user đều là `user`.

4. **Thêm app Android + SHA-1**
   - Project settings → Your apps → Add app → Android
   - Package name: `com.aibox.app`
   - Lấy SHA-1 của keystore:
     ```bash
     cd android && ./gradlew signingReport
     ```
     (hoặc `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`)
   - Dán SHA-1 vào app Android trong Firebase Console. Thiếu SHA-1 → Google trả về lỗi
     `DEVELOPER_ERROR` / không có `idToken`.

5. **iOS (tuỳ chọn)**: thêm app iOS với bundle id `com.aibox.app`, tải `GoogleService-Info.plist`,
   rồi thêm `iosUrlScheme` vào plugin trong `app.json`:
   ```json
   ["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<REVERSED_CLIENT_ID>" }]
   ```

## 3. Chạy app

> **Không chạy được trong Expo Go.** `@react-native-google-signin` là native module,
> cần dev build.

```bash
npx expo run:android    # build + cài lên máy/emulator (lần đầu sẽ lâu)
npx expo start --dev-client
```

Các lần sau chỉ cần `npx expo start --dev-client`.

Nếu đổi `.env` → phải restart Metro (`npx expo start -c`) vì biến `EXPO_PUBLIC_*`
được nhúng lúc bundle.

## 4. Luồng đăng nhập

```
Bấm "Tiếp tục với Google"
  → GoogleSignin.signIn()        (native, trả idToken)
  → GoogleAuthProvider.credential(idToken)
  → signInWithCredential()       (Firebase Auth, tự lưu phiên vào AsyncStorage)
  → ensureUserProfile()          (đọc/tạo users/{uid} trên Firestore)
  → AUTH_SESSION                 (tạo player record local theo uid, giữ ví riêng)
```

- Firebase tự restore phiên khi mở lại app → không còn session 7 ngày / refresh watchdog.
- `onSnapshot` trên `users/{uid}`: admin đổi role hoặc ban → app cập nhật ngay;
  bị ban giữa phiên → tự động đăng xuất kèm thông báo.
- Admin được xác định bằng `EXPO_PUBLIC_ADMIN_EMAILS`, hoặc sửa field `role` trên Firestore.
- Firestore lỗi (chưa bật / chưa deploy rules) **không chặn đăng nhập**:
  app dùng hồ sơ tạm và hiện cảnh báo đồng bộ.

## 5. Tính năng

1. **AI Hub** — 12 model AI (GPT-4o, Claude 3.5, Gemini Pro, DALL-E 3, Midjourney...) — chat interface, mỗi call tốn token
2. **Markets** — 12 prediction markets — mua YES/NO shares bằng token
3. **Portfolio** — positions + P&L + transaction history
4. **Transfer** — chuyển token cho người dùng khác (chỉ thấy người đã đăng nhập trên cùng máy + trader nền)
5. **Leaderboard** — top trader + vị trí của bạn
6. **Daily Reward** — nhận token miễn phí mỗi ngày + streak bonus
7. **Quests / Store / Copy Trade / Notifications**
8. **Admin CMS** — markets, AI models, users (role/ban trên Firestore), risk
9. **Profile** — sửa tên + avatar, đăng xuất Google

## 6. Cấu trúc project

```
aibox-app/
  src/
    components/   (UI components .jsx)
    screens/      (screens .jsx, admin/ cho CMS)
    data/         (mockData.js, accounts.js, quests.js, storeItems.js)
    config/       (firebase.js — init Auth/Firestore, đọc .env)
    services/     (auth.js — Google sign-in, users.js — Firestore users/{uid})
    context/      (AppContext.jsx — global state + AsyncStorage)
    utils/        (format, rewards, analyst)
    navigation/   (AppNavigator.jsx)
  App.js
  firestore.rules
  .env.example
  app.json
  package.json
```

## 7. Tech Stack

- **JavaScript** (không TypeScript)
- React Native (Expo SDK 52) + Expo Dev Client
- Firebase Auth (Google) + Cloud Firestore (`firebase@10.14.1` — bản có RN persistence)
- `@react-native-google-signin/google-signin`
- React Navigation (bottom tabs + stack)
- AsyncStorage (ví token, markets, quests, comments theo uid)
- React Native SVG (charts), Dark mode UI

## Disclaimer

AIBox là nền tảng giải trí. Token là credit nội bộ, KHÔNG có giá trị tiền tệ. Prediction market là game dự đoán, không phải cá cược.
