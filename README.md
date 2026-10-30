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

## 5.3. AI Market Analyst

Nút "Hỏi AI về kèo này" trong chi tiết market gửi dữ liệu kèo (câu hỏi, mô tả, giá YES/NO,
volume, liquidity, hạn kết thúc) lên model đã chọn.

Prompt **không ép khuôn cố định** vì mỗi loại kèo cần cách phân tích khác nhau (bóng đá khác
tài chính, chính trị khác giải trí). Model được tự chọn cách trình bày — đoạn văn, gạch đầu dòng
hay chia mục ngắn — miễn là người đọc thấy rõ:

- quan điểm nghiêng bên nào và vì sao,
- xác suất ước tính (con số cụ thể) so với giá thị trường,
- bằng chứng/yếu tố đặc thù của lĩnh vực đó,
- rủi ro và điều kiện khiến nhận định sai,
- nên làm gì tiếp theo (bên mua, vùng giá %, % số dư, chốt lời/cắt lỗ) hoặc đứng ngoài chờ tín hiệu.

Prompt chỉ **gợi ý trọng tâm** theo danh mục: thể thao → phong độ, lực lượng, sân nhà, đối đầu;
tài chính/crypto → mốc giá, dòng tiền, vĩ mô, thanh khoản; chính trị → thăm dò, tiền lệ, lịch sự
kiện; công nghệ/giải trí → lộ trình sản phẩm, tin rò rỉ, độ lan truyền. Quy tắc giữ lại: phải nêu
quan điểm dứt khoát kèm con số (không thay bằng "cần theo dõi thêm"), giá dùng đơn vị % cho khớp
app, vị thế tối đa 5% số dư với kèo thể thao/crypto/chính trị và 10% với loại khác.

Khi chưa cấu hình AI thật, `src/utils/analyst.js` sinh bản MOCK: ước tính xác suất bằng heuristic
(giá lệch xa 50 khi thanh khoản mỏng → kéo về gần 50), từ đó chọn YES/NO, tính edge, độ tin cậy,
vùng giá vào, chốt lời; kèm 3 yếu tố cần soi theo đúng danh mục của kèo.

## 5.4. Trạng thái mạng, cache & hiệu năng

- `src/hooks/useNetworkStatus.js` theo dõi mạng bằng `@react-native-community/netinfo` (có sẵn
  trong Expo Go). Khi mất mạng, Home và AI Hub hiện dải cảnh báo kèm nút **Thử lại**.
- Chế độ **live** chặn gửi tin nhắn mới khi offline (giữ nguyên câu hỏi trong ô nhập); chế độ
  **mô phỏng** vẫn chat được vì không cần mạng.
- Cache RAM: danh sách API key và lịch sử chat theo `(uid, modelId)` được giữ trong bộ nhớ để
  mở lại màn hình hiện ngay, không nháy khung xương; dữ liệu vẫn ghi AsyncStorage như cũ.
- Màn khởi động dùng `BootSkeleton`, danh sách chat/log dùng `FlatList` với `initialNumToRender`,
  `maxToRenderPerBatch`, `windowSize`, `removeClippedSubviews` (Android) để cuộn mượt.
- Animation mount (`FadeIn`) và skeleton tôn trọng cài đặt **giảm chuyển động** của hệ điều hành.

## 5.5. Giao diện thích ứng: theme sáng/tối, cỡ chữ, tablet, a11y, i18n

**Theme sáng/tối.** Bảng màu nằm ở `src/theme/palettes.js` (`darkColors`, `lightColors`), `src/theme/tokens.js`
chọn bảng theo `Appearance.getColorScheme()` ngay khi module được nạp rồi export ra `colors` như cũ — nên
mọi `StyleSheet.create` đang dùng `colors.*` **không phải sửa**. Vì giá trị màu được chụp lúc nạp module,
đổi theme trong lúc app đang chạy (hoặc bật dark mode ở hệ điều hành) cần **mở lại app**. Muốn ép theme:
`EXPO_PUBLIC_THEME=light` (hoặc `dark`) trong `.env`.

**Tương phản.** Mọi cặp chữ/nền bắt buộc đạt WCAG AA (≥ 4.5:1) ở **cả hai** bảng màu; nền đặc
(`accentStrong`, `dangerBg`, `warningBg`) chỉ dùng chữ `colors.onAccent`/`colors.onBright`. Nút Google giữ
nền trắng cố định (nhận diện thương hiệu) với chữ tối.

**Cỡ chữ 130–200%.** Không còn `height` cố định cho nút/ô nhập/hàng — thay bằng `minHeight`, nên chữ phóng
to vẫn không bị cắt. Chữ trong `Text` đặt `maxFontSizeMultiplier` 1.5–1.8, không dùng cỡ < 12 và `Button`
không còn `numberOfLines={1}` (nhãn dài xuống dòng thay vì bị "…").

**Tablet ≥ 720px.** Token `centeredContent` (`width: '100%'`, `maxWidth: 720`, `alignSelf: 'center'`) được
thêm vào `contentContainerStyle` của các màn chính, nên trên tablet nội dung canh giữa thay vì giãn hết bề
ngang. Các `ScrollView horizontal` (hàng chip) cố ý **không** áp để vẫn cuộn đúng.

**Trợ năng (a11y).** Mọi phần tử bấm được có `accessibilityRole="button"`; nút chỉ có icon có
`accessibilityLabel`; chip lọc có `accessibilityState={{ selected }}`; vùng chạm tối thiểu 44×44 (kèm
`hitSlop` 8 cho icon nhỏ); drawer đặt `accessibilityViewIsModal` + `onAccessibilityEscape` để đóng bằng cử
chỉ thoát. Dải offline dùng `accessibilityRole="alert"`.

**Đa ngôn ngữ.** `src/i18n/index.js` chứa 2 từ điển `vi`/`en` và hàm `t(key, vars)` (nội suy `{name}`),
`useI18n()` cho component. Đặt `EXPO_PUBLIC_LANG=en` để chạy bản tiếng Anh (đổi cần restart Metro). Hiện đã
áp cho drawer, tiêu đề các màn chính, các trạng thái lỗi/offline dùng chung và một số nhãn ở Home/AI Hub/Logs;
phần copy còn lại trong thân màn hình vẫn là tiếng Việt và chuyển dần sang `t()` theo từng màn.

## 5.6. Onboarding, trạng thái rỗng & micro-interaction

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

## 5.7. Bỏ bottom tab bar — điều hướng bằng drawer

`AppNavigator` **không còn** `createBottomTabNavigator`: 5 màn chính (`Home`, `AIHub`, `Markets`, `Portfolio`,
`Leaderboard`) nằm chung stack với các màn phụ, `initialRouteName="Home"`. Chuyển màn bằng nút **☰** ở header:
`useAppDrawer()` (`src/hooks/useAppDrawer.js`) giữ state mở/đóng và trả `drawerProps` để rải vào
`<AppDrawer {...drawerProps} />`; `AppDrawer` gọi `navigation.navigate(route)` nên quay lại màn đã có trong
stack thay vì chồng thêm màn mới.

Vì tab bar trước đây tự chừa `insets.bottom`, các màn chính đã cộng `insets.bottom` vào `paddingBottom`
của danh sách (Home, AI Hub) và của `contentContainerStyle` (Markets, Portfolio, Leaderboard); chat AI Hub
cộng `insets.bottom` vào thanh nhập. Drawer vẫn chỉ mở được từ 5 màn chính — màn phụ đi bằng nút back.

Đánh đổi: đổi màn tốn 2 chạm (☰ → mục) thay vì 1 chạm, bù lại nội dung không bị chiếm 56px + safe area ở
đáy và không còn tab bar che bàn phím.

## 5.8. Game Tài xỉu — cá cược token nội bộ

Màn `TaiXiuScreen` (vào từ drawer → nhóm **Giải trí**) là game 3 xúc xắc dùng token của app.
Luật nằm ở `src/utils/taiXiu.js` (thuần JS, test được bằng Node), tiền được tính **trong reducer**
`PLACE_TAIXIU_BET` của `AppContext` để số dư và lịch sử không bao giờ lệch nhau:

- 3 xúc xắc 1–6; tổng **4–10 = XỈU**, **11–17 = TÀI**; trả **1 ăn 1** (thắng +stake, thua −stake).
- **Bộ ba 111–666** (tổng 3 hoặc 18): nhà cái ăn cả 2 cửa — lợi thế duy nhất của nhà cái, 6/216 ván (2,78%).
- Mức cược `MIN_STAKE = 10`, `MAX_STAKE = 500`, bước 10, có preset 10/50/100/500; `clampStake()` kẹp cả
  theo số dư nên không thể cược quá ví.
- RNG `Math.random` chạy trên máy. Màn hình ghi rõ: token là credit nội bộ, không nạp/rút bằng tiền thật,
  không đổi ra tiền; nội dung 18+.

**Không thêm field vào account.** Mỗi ván ghi 1 transaction `type: 'TAIXIU'` với `amount` = tiền ròng, kèm
`side`/`dice`/`total`/`triple`; thống kê (số ván, thắng, tỉ lệ, lãi ròng) và dải 12 ván gần nhất đều suy ra
từ chính các transaction đó. Nhờ vậy dữ liệu cũ không phải migrate, `sanitizeAccount` giữ nguyên, và lịch sử
cược xuất hiện luôn trong Portfolio (chip lọc **Game**) và trong `TransactionItem`.

Trải nghiệm: 1 chạm là 1 ván — xúc xắc lắc ~700ms rồi công bố kết quả bằng banner + toast + haptic +
`AccessibilityInfo.announceForAccessibility`. Máy bật "giảm chuyển động" thì bỏ animation, công bố ngay.
Không đủ 10 token thì hiện `ErrorState` kèm nút **Nạp token** thay vì chặn màn; game chạy local nên offline
vẫn cược được, chỉ hiện thêm `OfflineBar`.

## 6. Cấu trúc project

```
aibox-app/
  src/
    components/   (UI components .jsx, ui/ cho UI kit, Onboarding.jsx, Die.jsx — mặt xúc xắc)
    screens/      (screens .jsx, admin/ cho CMS, TaiXiuScreen.jsx — game Tài xỉu)
    data/         (mockData.js, accounts.js, quests.js, storeItems.js)
    config/       (firebase.js — init Auth/Firestore, ai.js — preset AI gateway, đọc .env)
    services/     (auth.js — Google sign-in, users.js — Firestore users/{uid}, ai.js — gọi AI thật)
    context/      (AppContext.jsx — global state + AsyncStorage)
    hooks/        (useNetworkStatus.js — mạng, useReduceMotion.js — giảm chuyển động, useAppDrawer.js — mở/đóng drawer)
    theme/        (palettes.js — bảng màu sáng/tối, tokens.js — spacing/type/colors)
    i18n/         (index.js — từ điển vi/en + t()/useI18n)
    utils/        (format, rewards, analyst, spend, clipboard, apiKeys, taiXiu — luật game Tài xỉu)
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
- React Navigation (stack: 5 màn chính + màn phụ, **không bottom tab**; chuyển màn bằng drawer ☰ trên header mọi màn chính)
- AsyncStorage (ví token, markets, quests, comments theo uid)
- `@react-native-community/netinfo` (trạng thái mạng), `expo-haptics`, `expo-clipboard`
- React Native SVG (charts), theme sáng/tối (theo hệ điều hành hoặc `EXPO_PUBLIC_THEME`)

## Disclaimer

AIBox là nền tảng giải trí. Token là credit nội bộ, KHÔNG có giá trị tiền tệ. Prediction market là game dự đoán, không phải cá cược.
