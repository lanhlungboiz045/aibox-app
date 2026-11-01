# AIBox — React Native App (JavaScript)

Ứng dụng AIBox kết hợp AI Hub, ví token nội bộ và trò chơi Tài Xỉu, xây bằng React Native (Expo) + JavaScript.
Đăng nhập bằng **email/mật khẩu hoặc Google** qua Firebase Authentication; hồ sơ người dùng (role, trạng thái, tên, avatar)
lưu trên **Firestore**; ví token / giao dịch / quests lưu local theo `uid` Firebase.

## 1. Cài đặt

```bash
cd aibox-app
npm install
```

Kiểm tra chất lượng (không cần thiết bị/emulator):

```bash
npm run lint   # ESLint theo eslint-config-expo
npm test       # Jest cho util thuần + reducer + i18n
npm run check  # chạy cả hai
```

CI chạy lint + test trên mọi push/PR vào `main` (`.github/workflows/ci.yml`).

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
| `EXPO_PUBLIC_THEME` | `light` hoặc `dark` để ép giao diện; bỏ trống = theo hệ điều hành |
| `EXPO_PUBLIC_LANG` | `vi` (mặc định) hoặc `en` cho khung đa ngôn ngữ |

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
   - Quyền admin yêu cầu `request.auth.token.email_verified == true`: email/password
     tự đăng ký (chưa xác thực) không thể tự phong admin bằng cách trùng email admin.
     Tài khoản Google luôn có email đã xác thực.
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

Trong màn đăng nhập, tài khoản mẫu chỉ hiện ở bản dev và dùng ví local riêng:

| Role | Email | Mật khẩu |
|---|---|---|
| Quản trị hệ thống | `admin@aibox.local` | `Admin123!` |
| Người dùng | `user@aibox.local` | `User123!` |

Đây là tài khoản giả lập để thử giao diện, không phải tài khoản Firebase thật.
Đăng xuất giữ nguyên ví local của từng tài khoản mẫu.

Đăng nhập/tạo tài khoản email thật dùng Firebase Authentication. Bật provider
**Email/Password** tại Firebase Console → Authentication → Sign-in method.
Tài khoản đăng ký mới nhận role `user`; chỉ admin được cấp quyền `admin`.
Google Sign-In thật vẫn cần dev client (không chạy trong Expo Go).

### Quyền theo role

| Role | Quyền xem và sử dụng |
|---|---|
| `user` | Các chức năng AI, ví, giao dịch và dữ liệu cá nhân; không xem CMS hoặc cấu hình AI dùng chung |
| `admin` | Toàn bộ chức năng, Admin CMS và cấu hình AI dùng chung |

Drawer và Profile chỉ hiện mục phù hợp với role. Các màn CMS và cấu hình AI cũng được chặn khi điều hướng trực tiếp. API key và lịch sử request thông thường vẫn được giới hạn theo tài khoản đang đăng nhập.
Đây là kiểm soát ở giao diện/client; không thay thế kiểm tra quyền ở Firestore Rules hoặc backend cho dữ liệu và thao tác production.

Yêu cầu máy build (Windows):
- JDK 17 (`JAVA_HOME` trỏ tới bản JDK 17)
- Android SDK + `ANDROID_HOME` (ví dụ `C:\Users\<tên>\AppData\Local\Android\Sdk`)
- Điện thoại bật **USB debugging** hoặc emulator đang chạy (`adb devices` phải thấy thiết bị)

Thư mục `android/` do `expo prebuild` sinh ra (đã gitignore) — xoá đi vẫn build lại được.

Nếu đổi `.env` → phải restart Metro (`npx expo start -c`) vì biến `EXPO_PUBLIC_*`
được nhúng lúc bundle.

## 4. Luồng đăng nhập

Email/mật khẩu dùng Firebase `signInWithEmailAndPassword()` / `createUserWithEmailAndPassword()`.
Google Sign-In dùng `GoogleSignin.signIn()` → `GoogleAuthProvider.credential(idToken)` →
`signInWithCredential()`. Cả hai luồng đều đọc/tạo `users/{uid}` rồi khởi tạo player record
local theo UID Firebase để giữ ví riêng.

- Firebase tự restore phiên khi mở lại app → không còn session 7 ngày / refresh watchdog.
- `onSnapshot` trên `users/{uid}`: admin đổi role hoặc ban → app cập nhật ngay;
  bị ban giữa phiên → tự động đăng xuất kèm thông báo.
- Tài khoản đăng nhập mới mặc định có role `user`; quyền `admin` chỉ đến từ whitelist quản trị hoặc thay đổi của admin.
- Khi nâng state local v4 lên v5, app giữ số dư và lịch sử giao dịch của tài khoản thật, bỏ dữ liệu vật phẩm/vị thế và tài khoản hệ thống mẫu; role `creator` cũ được đưa về `user`. Các giao dịch market đã ghi trước đó vẫn nằm trong lịch sử ví.
- Firestore lỗi (chưa bật / chưa deploy rules) **không chặn đăng nhập**:
  app dùng hồ sơ tạm và hiện cảnh báo đồng bộ.

## 5. Tính năng

1. **AI Hub** — chat với các model AI, trừ token theo usage thật của API
2. **Ví token** — số dư, lịch sử giao dịch và chuyển token giữa các tài khoản trên cùng thiết bị
3. **Tài Xỉu** — game 3 xúc xắc dùng token nội bộ; kết quả, lịch sử ván còn lưu và luật chơi hiển thị trong màn game
4. **Daily Reward / Nhiệm vụ** — nhận token hằng ngày và hoàn thành nhiệm vụ AI, Tài Xỉu, chuyển token
5. **Thông báo / Profile** — quản lý hồ sơ và hoạt động tài khoản
6. **Admin CMS** — AI models, người dùng (role/ban trên Firestore), rủi ro dòng tiền
7. **Cấu hình AI thật** — admin nhập Base URL / API key / model (OpenAI-compatible), test kết nối, lưu trên máy
8. **Catalog / Usage Dashboard / Nạp token** — xem danh mục model, thống kê token theo model, nạp credit (mô phỏng)

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

## 5.3. Trạng thái mạng, cache & hiệu năng

- `src/hooks/useNetworkStatus.js` theo dõi mạng bằng `@react-native-community/netinfo` (có sẵn
  trong Expo Go). Khi mất mạng, Home và AI Hub hiện dải cảnh báo kèm nút **Thử lại**.
- Chế độ **live** chặn gửi tin nhắn mới khi offline (giữ nguyên câu hỏi trong ô nhập); chế độ
  **mô phỏng** vẫn chat được vì không cần mạng.
- Cache RAM: danh sách API key và lịch sử chat theo `(uid, modelId)` được giữ trong bộ nhớ để
  mở lại màn hình hiện ngay, không nháy khung xương; dữ liệu vẫn ghi AsyncStorage như cũ.
- Màn khởi động dùng `BootSkeleton`, danh sách chat/log dùng `FlatList` với `initialNumToRender`,
  `maxToRenderPerBatch`, `windowSize`, `removeClippedSubviews` (Android) để cuộn mượt.
- Animation mount (`FadeIn`) và skeleton tôn trọng cài đặt **giảm chuyển động** của hệ điều hành.

## 5.4. Giao diện thích ứng: theme sáng/tối, cỡ chữ, tablet, a11y, i18n

**Theme sáng/tối.** Bảng màu nằm ở `src/theme/palettes.js` (`darkColors`, `lightColors`), `src/theme/tokens.js`
chọn bảng theo `Appearance.getColorScheme()` ngay khi module được nạp rồi export ra `colors` như cũ — nên
mọi `StyleSheet.create` đang dùng `colors.*` **không phải sửa**. Vì giá trị màu được chụp lúc nạp module,
đổi theme trong lúc app đang chạy (hoặc bật dark mode ở hệ điều hành) cần **mở lại app**. Muốn ép theme:
`EXPO_PUBLIC_THEME=light` (hoặc `dark`) trong `.env`.

**Tương phản.** Mọi cặp chữ/nền bắt buộc đạt WCAG AA (≥ 4.5:1) ở **cả hai** bảng màu; nền đặc
(`accentStrong`, `dangerBg`, `warningBg`) chỉ dùng chữ `colors.onAccent`/`colors.onBright`. Nút Google giữ
nền trắng cố định (nhận diện thương hiệu) với chữ tối.

**Nút dùng chung.** `src/components/ui/Button.jsx` có chiều cao cố định 48dp, căn giữa nội dung và hỗ trợ
primary, secondary cùng trạng thái disabled/loading. Trường nhập và hàng nội dung vẫn co giãn theo chữ.
`AppHeader` chuẩn hoá nút menu/back, tiêu đề/phụ đề và chip số dư; màn đăng nhập không hiển thị số dư.

**Tablet ≥ 720px.** Token `centeredContent` (`width: '100%'`, `maxWidth: 720`, `alignSelf: 'center'`) được
thêm vào `contentContainerStyle` của các màn chính, nên trên tablet nội dung canh giữa thay vì giãn hết bề
ngang. Các `ScrollView horizontal` (hàng chip) cố ý **không** áp để vẫn cuộn đúng.

**Trợ năng (a11y).** Mọi phần tử bấm được có `accessibilityRole="button"`; nút chỉ có icon có
`accessibilityLabel`; chip lọc có `accessibilityState={{ selected }}`; vùng chạm tối thiểu 44×44 (kèm
`hitSlop` 8 cho icon nhỏ); drawer đặt `accessibilityViewIsModal` + `onAccessibilityEscape` để đóng bằng cử
chỉ thoát. Dải offline dùng `accessibilityRole="alert"`.

**Đa ngôn ngữ.** `src/i18n/index.js` chứa 2 từ điển `vi`/`en` và hàm `t(key, vars)` (nội suy `{name}`),
`useI18n()` cho component. Đặt `EXPO_PUBLIC_LANG=en` để chạy bản tiếng Anh (đổi cần restart Metro). Phạm vi
hiện tại: drawer, tiêu đề các màn chính, trạng thái lỗi/offline dùng chung, Onboarding và một số nhãn ở
Home/AI Hub/Logs; phần copy còn lại trong thân màn hình vẫn là tiếng Việt và chuyển dần sang `t()` theo từng
màn. `__tests__/i18n.test.js` chặn drift: 2 bản dịch phải đủ cùng bộ key, không rỗng và khớp placeholder.

## 5.5. Onboarding, trạng thái rỗng & micro-interaction

**Onboarding lần đầu.** `src/components/Onboarding.jsx` hiện 3 slide (hỏi AI bằng token → ví & chi tiêu →
dữ liệu ở lại trên máy) **trước** màn đăng nhập, chỉ ở lần mở app đầu tiên. Đi hết 3 slide (tối đa 3 chạm)
hoặc **Bỏ qua** (1 chạm) đều vào app ngay; cờ đã xem lưu ở AsyncStorage `aibox_onboarding_v1`. Cờ này thuộc
thiết bị (không theo uid) nên đổi tài khoản không phải xem lại. Muốn xem lại khi test: xoá app hoặc
`AsyncStorage.removeItem('aibox_onboarding_v1')`. Root chờ đọc cờ xong mới mount (vẫn là `BootSkeleton`) để
không nháy màn đăng nhập rồi mới bật onboarding.

**Trạng thái rỗng có minh hoạ.** `EmptyState` dựng minh hoạ 2 lớp bằng `View` (vòng `accentDim` +
đĩa `accentStrong` + 2 chấm nhấn) thay cho 1 icon đơn, nên Home / AI Hub / Logs / danh sách trống trông "có
chủ đích" thay vì giống thông báo lỗi. Minh hoạ đặt `accessibilityElementsHidden` để screen reader chỉ đọc
tiêu đề + gợi ý + nút hành động. Có biến thể `compact` cho khối nhỏ trong thẻ.

**Micro-interaction.** `PressableScale` (`src/components/ui/PressableScale.jsx`) = `Pressable` + scale 0.97
trong 120ms + 1 nhịp haptic nhẹ: dùng cho card model AI và 4 ô shortcut ở Home; `Button` giữ nguyên nhún
0.97. Cả hai đều **không animation** khi bật giảm chuyển động.

**Giảm chuyển động (reduce motion).** `src/hooks/useReduceMotion.js` đọc cài đặt hệ điều hành **một lần**
cho cả app (cache ở module + 1 listener `reduceMotionChanged`), export `useReduceMotion()` cho component và
`getReduceMotion()` cho hàm thường (onPress, Modal). Khi bật: `FadeIn` hiện ngay, `Skeleton` đứng yên ở 1
mức sáng, drawer mở không trượt (`animationType="none"`), toast hiện/ẩn tức thì, nút/card không scale (chỉ
đổi độ mờ nhẹ để vẫn có phản hồi). Haptic vẫn giữ vì không ảnh hưởng tiền đình.

## 5.6. Bỏ bottom tab bar — điều hướng bằng drawer

`AppNavigator` **không còn** `createBottomTabNavigator`: các màn chính (`Home`, `AIHub`, `TaiXiu`, lịch sử giao dịch)
nằm chung stack với các màn phụ, `initialRouteName="Home"`. Chuyển màn bằng nút **☰** ở header:
`useAppDrawer()` (`src/hooks/useAppDrawer.js`) giữ state mở/đóng và trả `drawerProps` để rải vào
`<AppDrawer {...drawerProps} />`; `AppDrawer` gọi `navigation.navigate(route)` nên quay lại màn đã có trong
stack thay vì chồng thêm màn mới.

Vì tab bar trước đây tự chừa `insets.bottom`, các màn chính cộng `insets.bottom` vào `paddingBottom`
của nội dung; chat AI Hub cộng `insets.bottom` vào thanh nhập. Drawer mở từ header các màn chính.

Đánh đổi: đổi màn tốn 2 chạm (☰ → mục) thay vì 1 chạm, bù lại nội dung không bị chiếm 56px + safe area ở
đáy và không còn tab bar che bàn phím.

## 5.7. Game Tài xỉu — cá cược token nội bộ

Màn `TaiXiuScreen` (vào từ drawer → nhóm **Giải trí**) là game 3 xúc xắc dùng token của app.
Luật nằm ở `src/utils/taiXiu.js` (thuần JS, test được bằng Node), tiền được tính **trong reducer**
`PLACE_TAIXIU_BET` của `AppContext` để số dư và lịch sử không bao giờ lệch nhau:

- 3 xúc xắc 1–6; tổng **4–10 = XỈU**, **11–17 = TÀI**. Đúng cửa lãi **0,96× cược**; sai cửa mất cược.
- **Bộ ba 111–666** (6/216 kết quả, 2,78%) thắng bất kể cửa, lãi ròng **2× cược**.
  Thưởng cửa thường được làm tròn xuống token nguyên. Với mức bộ ba này, kỳ vọng toán học
  nghiêng về người chơi khoảng **3,61% tiền cược** trước ảnh hưởng làm tròn.
- Mức cược tối thiểu 100 token, không có trần cố định; người chơi nhập số nguyên tùy ý đến tối đa số dư.
  Các preset 100/500/1.000/5.000 vẫn có sẵn; `getValidStake()` xác thực cả ở UI lẫn reducer.
- RNG `Math.random` chạy trên máy. Màn hình ghi rõ: token là credit nội bộ, không nạp/rút bằng tiền thật,
  không đổi ra tiền; nội dung 18+.

**Chi phí vẫn nhìn thấy trước khi cược.** Một lượt chat (prompt + lịch sử + câu trả lời) tốn khoảng
**500–1.000 token**, nên `src/utils/economy.js` gom con số đó về một chỗ (`TOKENS_PER_CHAT_MIN/MAX/TYPICAL`)
và cung cấp `chatsRange(tokens)` để quy đổi token → số câu hỏi AI. Màn Tài xỉu hiện mức cược quy đổi
ra câu hỏi AI và mức cược tối đa theo số dư; màn Nạp token hiện mỗi gói dùng được bao nhiêu câu.

Gói nạp dùng chung thang giá với màn **Các gói**: 1 token = 1đ giá trị, nạp lẻ **0,9đ/token** →
10.000 token/9.000đ, 50.000/45.000đ, 100.000/90.000đ, 500.000/450.000đ. Gói token theo tháng giảm sâu
hơn theo bậc (0,78đ/token ở gói 90K xuống 0,468đ/token ở gói 2 Triệu), nên hai màn không lệch giá.
Kinh tế token không đổi (1 API token = 1 token app), chỉ đổi đơn vị hiển thị cho dễ hình dung.

**Không thêm field vào account.** Mỗi ván ghi 1 transaction `type: 'TAIXIU'` với `amount` = tiền ròng, kèm
`side`/`dice`/`total`/`triple`; thống kê và danh sách ván được suy ra từ toàn bộ transaction Tài Xỉu còn lưu.
Lịch sử giao dịch được giữ riêng với danh mục game tại màn **Lịch sử giao dịch**.

Trải nghiệm: mức cược **≥ 1.000** hoặc cược toàn bộ số dư cần xác nhận qua bảng
(`BottomSheet`: thắng/thua/số dư sau ván thắng); các mức nhỏ hơn vào ván ngay. Xúc xắc lắc ~700ms rồi
công bố kết quả bằng banner + toast (toast là kênh duy nhất TalkBack đọc,
nội dung là số dư mới) + haptic. Máy bật "giảm chuyển động" thì bỏ animation, công bố ngay.
Không đủ 100 token thì hiện `ErrorState` kèm nút **Nạp token** thay vì chặn màn; game chạy local nên offline
vẫn cược được, chỉ hiện thêm `OfflineBar`.

## 5.8. Header, token và thông tin bản demo

Các màn ứng dụng dùng `src/components/ui/AppHeader.jsx`: màn chính mở drawer bằng biểu tượng menu; màn con
dùng biểu tượng quay lại. Chip số dư và `TokenIcon` lấy chung cách hiển thị từ `TokenBadge`, còn `formatToken`
nhóm hàng nghìn bằng dấu chấm kiểu Việt Nam. Số liệu dùng font sans-serif với `tabular-nums`.

`Button` là nút hành động dùng chung, chiều cao cố định 48dp và nội dung căn giữa; các biến thể gồm primary,
secondary và disabled. Các thao tác riêng của trò chơi, như nút Tài/Xỉu và mức cược, giữ hình thức riêng để
thể hiện trạng thái và số liệu của game.

Thông tin kỹ thuật/giới hạn demo không còn đặt ở cuối các màn hình nghiệp vụ. Người dùng có thể mở **Về bản
demo** từ Hồ sơ; màn này giải thích lưu trữ dữ liệu trên thiết bị, thông báo nội bộ, AI mô phỏng, thanh toán
mô phỏng, phạm vi phân tích quản trị và các bước cần thiết trước khi phát hành.

## 6. Cấu trúc project

```
aibox-app/
  __tests__/      (utils/, context/ — Jest + jest-expo)
  src/
    components/   (UI components .jsx, ui/ cho UI kit, ErrorBoundary.jsx, Onboarding.jsx, Die.jsx)
    screens/      (screens .jsx, admin/ cho CMS, TaiXiuScreen.jsx — game Tài xỉu)
    data/         (mockData.js, accounts.js, quests.js)
    config/       (firebase.js — init Auth/Firestore, ai.js — preset AI gateway, đọc .env)
    services/     (auth.js — Google sign-in, users.js — Firestore users/{uid}, ai.js — gọi AI thật)
    context/      (AppContext.jsx — provider/side-effect, appReducer.js — state thuần + sanitize)
    hooks/        (useNetworkStatus.js — mạng, useReduceMotion.js — giảm chuyển động, useAppDrawer.js — mở/đóng drawer)
    theme/        (palettes.js — bảng màu sáng/tối, tokens.js — spacing/type/colors)
    i18n/         (index.js — từ điển vi/en + t()/useI18n)
    utils/        (format, rewards, economy — quy đổi token ↔ câu hỏi AI, spend, clipboard, apiKeys, taiXiu — luật game Tài xỉu)
    navigation/   (AppNavigator.jsx)
  App.js
  firestore.rules
  .eslintrc.js
  .github/workflows/ci.yml
  .env.example
  app.json
  package.json
```

## 7. Tech Stack

- **JavaScript** (không TypeScript)
- React Native (Expo SDK 52) + Expo Dev Client
- Firebase Auth (Google) + Cloud Firestore (`firebase@10.14.1` — bản có RN persistence)
- `@react-native-google-signin/google-signin`
- React Navigation (stack + drawer, **không bottom tab**)
- AsyncStorage (ví token, giao dịch, thông báo và quests theo uid)
- `@react-native-community/netinfo` (trạng thái mạng), `expo-haptics`, `expo-clipboard`
- React Native SVG (charts), theme sáng/tối (theo hệ điều hành hoặc `EXPO_PUBLIC_THEME`)
- Jest (`jest-expo`) + ESLint (`eslint-config-expo`), CI bằng GitHub Actions

## Disclaimer

AIBox cung cấp công cụ AI và trò chơi Tài Xỉu. Token là credit nội bộ, KHÔNG có giá trị tiền tệ và không thể đổi thành tiền thật.
