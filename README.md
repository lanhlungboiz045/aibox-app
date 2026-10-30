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

Điền các biến trong `.env`:

| Biến | Ý nghĩa |
| --- | --- |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `apiKey` trong firebaseConfig (Project settings → Your apps → Web app) |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `appId` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Web client ID của Google OAuth (bắt buộc để đăng nhập) |
| `EXPO_PUBLIC_ADMIN_EMAILS` | Email được cấp role System Admin, cách nhau dấu phẩy |

> Đổi sang project Firebase khác chỉ cần thay 6 giá trị `EXPO_PUBLIC_FIREBASE_*`
> trong `.env` rồi restart Metro — không phải sửa code.
> App vẫn mở được khi thiếu config: màn đăng nhập sẽ liệt kê đúng biến còn trống.

## 2. Cấu hình Firebase (bắt buộc, làm 1 lần)

1. **Tạo Firestore + lấy config web**
   - Firebase Console → Project settings → **Your apps** → Add app → **Web** (`</>`).
   - Copy 6 giá trị trong `firebaseConfig` vào `.env` (`EXPO_PUBLIC_FIREBASE_*`).

2. **Tạo/bật Authentication**
   - Firebase Console → Authentication → Get started
   - Sign-in method → bật **Google** → chọn email hỗ trợ → Save
   - Mở Google provider → **Web SDK configuration** → copy **Web client ID**
     (dạng `<project-number>-xxxx.apps.googleusercontent.com`) → dán vào `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

3. **Bật Firestore Database**
   - Firestore Database → Create database → chọn production mode → chọn region gần (asia-southeast1).

4. **Deploy Security Rules**
   - Firestore Database → Rules → dán nội dung `firestore.rules` → Publish.
   - ⚠️ Sửa danh sách `adminEmails()` trong `firestore.rules` cho khớp `.env`
     (Rules chạy trên server nên không đọc được biến `EXPO_PUBLIC_*`).
   - Chưa deploy rules thì app vẫn đăng nhập được nhưng sẽ hiện cảnh báo
     "Chưa đồng bộ được hồ sơ với Firestore" và mọi user đều là `user`.

5. **Thêm app Android + SHA-1**
   - Project settings → Your apps → Add app → Android
   - Package name: `com.aibox.app`
   - Bỏ qua bước tải `google-services.json` và "Add Firebase SDK" (app dùng Firebase JS SDK).
   - Lấy SHA-1 của keystore:
     ```bash
     cd android && ./gradlew signingReport
     ```
     (hoặc `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`)
   - Dán SHA-1 vào app Android trong Firebase Console. Thiếu SHA-1 → Google trả về lỗi
     `DEVELOPER_ERROR` / không có `idToken`.

6. **iOS (tuỳ chọn)**: thêm app iOS với bundle id `com.aibox.app`, tải `GoogleService-Info.plist`,
   rồi thêm `iosUrlScheme` vào plugin trong `app.json`:
   ```json
   ["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<REVERSED_CLIENT_ID>" }]
   ```

## 3. Chạy app

> **Không chạy được trong Expo Go.** `@react-native-google-signin` là native module,
> cần dev build. Quét QR bằng Expo Go sẽ báo lỗi / tự thoát app.

```bash
npx expo run:android    # build + cài lên máy/emulator (lần đầu sẽ lâu)
npx expo start --dev-client
```

Các lần sau chỉ cần `npx expo start --dev-client` rồi mở app **AIBox** đã cài.

### Test nhanh bằng Expo Go (không cần build)

```bash
npx expo start -c --go     # -g: mở ở chế độ Expo Go
```

Trong Expo Go, màn đăng nhập có nút **"Vào chế độ demo (chỉ dev)"**:
nút này chỉ hiện khi `__DEV__` và máy không có Google Sign-In native, tạo ví local
(uid `demo-expo-go`) để test toàn bộ UI/chức năng mà **không** đăng nhập Google.
Đăng xuất sẽ xoá ví demo. Đây không phải login thật — bản build dev client mới có Google Sign-In.

Yêu cầu máy build (Windows):
- JDK 17 (`JAVA_HOME` trỏ tới bản JDK 17)
- Android SDK + `ANDROID_HOME` (ví dụ `C:\Users\<tên>\AppData\Local\Android\Sdk`)
- Điện thoại bật **USB debugging** hoặc emulator đang chạy (`adb devices` phải thấy thiết bị)

Thư mục `android/` do `expo prebuild` sinh ra (đã gitignore) — xoá đi vẫn build lại được.

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

1. **AI Hub** — 12 model AI (GPT-4o, Claude 3.5, Gemini Pro, DALL-E 3, Midjourney...) — chat interface, trừ token theo usage thật của API
2. **Markets** — 12 prediction markets — mua YES/NO shares bằng token
3. **Portfolio** — positions + P&L + transaction history
4. **Transfer** — chuyển token cho người dùng khác (chỉ thấy người đã đăng nhập trên cùng máy + trader nền)
5. **Leaderboard** — top trader + vị trí của bạn
6. **Daily Reward** — nhận token miễn phí mỗi ngày + streak bonus
7. **Quests / Store / Copy Trade / Notifications**
8. **Admin CMS** — markets, AI models, users (role/ban trên Firestore), risk
9. **Profile** — sửa tên + avatar, đăng xuất Google
10. **Cấu hình AI thật** — Profile → Cấu hình AI: nhập Base URL / API key / model (OpenAI-compatible), test kết nối, lưu trên máy
11. **Catalog / Usage Dashboard / Nạp token** — xem danh mục model, thống kê token theo model, nạp credit (mô phỏng)

## 5.1. Gọi AI thật (OpenAI-compatible)

App gọi endpoint chuẩn `POST {BASE_URL}/chat/completions` nên dùng được OpenAI,
OpenRouter, DeepSeek, Groq, Gemini (OpenAI-compat), AI Box, Ollama/LM Studio...

**Cách nhanh nhất khi test trên điện thoại:** mở app → **Profile → Cấu hình AI** →
bấm preset (Pollinations / OpenAI / OpenRouter / DeepSeek / Groq / Gemini / AI Box / Ollama) → dán API key →
**Kiểm tra kết nối** → **Lưu cấu hình**. Không cần build lại, không cần sửa `.env`.

> Chưa có API key? Chọn preset **Pollinations (free)** — gateway công khai, **không cần key**,
> gọi được AI thật ngay (có thể bị giới hạn tốc độ, độ trễ ~5–15s/câu).

> Với **Gemini** nên dùng `gemini-3.1-flash-lite`: trả lời nhanh và không tốn token cho phần
> "thinking". Các model Gemini 3.x khác bật suy luận mặc định, có thể ăn hết `max_tokens`
> khiến câu trả lời ngắn/rỗng — khi đó tăng max token hoặc đổi model.

**Cách tính token bị trừ:** app không còn dùng giá cố định cho từng model. Sau mỗi lần gọi
thành công, app đọc `usage.total_tokens` do API trả về (prompt + completion, gồm cả token
"thinking") và trừ đúng số đó. Nếu gateway không trả `usage`, app ước lượng ~4 ký tự/token.
Ví cần tối thiểu **10 token** để bắt đầu; nếu số dư ít hơn chi phí thật thì chỉ trừ tối đa
bằng số dư (không âm ví). Gọi lỗi/timeout thì không trừ token.

**Cách khai báo trong `.env`** (áp dụng cho cả máy khác):

```
EXPO_PUBLIC_AI_BASE_URL=https://api.groq.com/openai/v1
EXPO_PUBLIC_AI_API_KEY=gsk_...
EXPO_PUBLIC_AI_MODEL=llama-3.3-70b-versatile
EXPO_PUBLIC_AI_FORCE_MODEL=true
```

Đổi `.env` phải restart Metro với `-c` (biến `EXPO_PUBLIC_*` được nhúng lúc bundle).
Để trống → app tự dùng câu trả lời **MOCK** (vẫn demo đủ luồng, có nhãn MOCK).

Chi tiết code: `src/config/ai.js` (preset, model map), `src/services/ai.js`
(fetch + timeout + map lỗi tiếng Việt + test kết nối), `src/screens/AISettingsScreen.jsx`.

⚠️ **Bảo mật:** API key nằm trên thiết bị (AsyncStorage) và biến `EXPO_PUBLIC_*` nằm trong
bundle → chỉ phù hợp đồ án/demo. Triển khai thật phải đặt key ở backend/proxy, app gọi server của bạn.

## 5.2. Lịch sử chat

Mỗi cuộc chat được lưu tự động vào AsyncStorage theo từng cặp **(uid, modelId)** với key
`@aibox_chat_history_v1:{uid}:{modelId}` → đăng nhập tài khoản khác hoặc mở model khác không
thấy lẫn lịch sử của nhau.

- Giữ **40 tin nhắn gần nhất** mỗi model; nội dung cắt tối đa 8000 ký tự (tránh phình storage).
- Chỉ lưu dữ liệu hiển thị: `role`, `content`, `timestamp`, `tokenCost`.
- Khi gọi API chỉ gửi **20 tin gần nhất** làm context để prompt không phình to.
- Xoá: nút 🗑️ trên header khi đang chat (xoá cuộc chat hiện tại) hoặc nút
  "Xoá lịch sử chat (N tin nhắn)" ở danh sách model (xoá toàn bộ). Cả hai đều hỏi xác nhận và
  ghi rõ **token đã trừ không được hoàn lại**.
- Xoá lịch sử chỉ xoá nội dung chat, không ảnh hưởng số dư token.

Chi tiết code: `src/services/chatHistory.js` (`loadChatHistory`, `saveModelHistory`,
`clearModelHistory`, `clearAllChatHistory`, `countByModel`), UI ở `src/screens/AIHubScreen.jsx`
(badge 💬 trên `AIModelCard`).

## 6. Cấu trúc project

```
aibox-app/
  src/
    components/   (UI components .jsx)
    screens/      (screens .jsx, admin/ cho CMS)
    data/         (mockData.js, accounts.js, quests.js, storeItems.js)
    config/       (firebase.js — init Auth/Firestore, ai.js — preset AI gateway, đọc .env)
    services/     (auth.js — Google sign-in, users.js — Firestore users/{uid}, ai.js — gọi AI thật)
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
