---
target: AI Hub (src/screens/AIHubScreen.jsx)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 4
target_identity: "file:E:\\Semester7\\MMA\\aibox-app\\src\\screens\\AIHubScreen.jsx"
target_fingerprint: "sha256:8eae80b01a64dba039b3539ab68c0e1261bc07e306c08e2f0f66647be57def34"
target_path: "E:\\Semester7\\MMA\\aibox-app\\src\\screens\\AIHubScreen.jsx"
timestamp: 2026-10-31T16-46-09Z
slug: src-screens-aihubscreen-jsx
---
# Critique — src/screens/AIHubScreen.jsx (lần 1)

- Phương pháp: `design review only (detector not applicable, native platform)` — Assessment A đơn lẻ theo spec native.
- Bằng chứng: đọc mã nguồn (AIHubScreen, ChatBubble, AIModelCard, AppHeader, TokenBadge, CategoryFilter, ui kit, tokens/palettes, AppContext.sendAIMessage, services/ai.js). **Không có thiết bị/emulator nào kết nối (`adb devices` rỗng) → không chụp được màn hình**; mọi kết luận về hình ảnh dựa trên cây style + suy luận layout.
- Mã được chấm: working tree (chưa commit) trên nền `b3cad40`, gồm refactor "unify data source" ở AIHubScreen/AppContext/services/ai.
- Mục tiêu do người gọi không chỉ định; tự chốt về mặt phẳng lõi của sản phẩm (AI Hub) vì đây là luồng chính trong PRODUCT.md và là file vừa bị sửa nhiều nhất.

## Bảng điểm

| # | Heuristic (Nielsen) | Điểm 0-4 | Vấn đề chính |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Typing/stop/meta/skeleton rõ; nhưng model thực sự trả lời không hiện ở đâu cả |
| 2 | Match System/Real World | 2 | Header ghi tên model người dùng chọn trong khi request có thể đi model khác; card hiện "4.8 sao"/"12.5K dùng" là số bịa |
| 3 | User Control and Freedom | 3 | Dừng 1 chạm, huỷ không trừ token, back huỷ request; thiếu hoàn tác sau khi xoá lịch sử, không tạo lại câu trả lời |
| 4 | Consistency and Standards | 2 | `styles.headerActions` không tồn tại → layout vỡ; Alert thay cho BottomSheet/inline; i18n nửa vời; tiền không qua `formatToken` |
| 5 | Error Prevention | 3 | Chặn offline, chặn số dư < 10, lỗi trả lại bản nháp; nhưng không báo giá trước khi tiêu token |
| 6 | Recognition Rather Than Recall | 3 | Gợi ý câu hỏi, số tin đã lưu theo model, giá từng tin; đổi model phải thoát ra danh sách |
| 7 | Flexibility and Efficiency | 2 | Không gửi bằng bàn phím, không copy/tạo lại, không đổi model trong khung chat, không tìm trong lịch sử |
| 8 | Aesthetic and Minimalist Design | 2 | Card model 6 tín hiệu không giúp chọn; chrome chiếm gần nửa viewport đầu; chi phí là thứ nhỏ nhất màn |
| 9 | Error Recovery | 3 | ErrorState + "Thử lại" + giữ bản nháp; lỗi nằm ở footer danh sách, có thể trôi khỏi tầm nhìn |
| 10 | Help and Documentation | 2 | Không có chỗ nào giải thích token bị trừ thế nào, dù đó là luận điểm của sản phẩm |

**Tổng: 25/40 — Acceptable** (10/10 heuristic áp dụng, không có `n/a`)

## Design Specificity Verdict

**LLM assessment:** Khung chat rất AIBox: mỗi câu trả lời mang giá token của chính nó, thanh meta nói rõ "Trực tiếp" hay "Trả lời mô phỏng", nút Dừng cam kết không trừ token. Đó là bản sắc "bàn giao dịch ban đêm" được viết bằng dữ liệu, không bằng trang trí. Nhưng màn danh sách model thì hoàn toàn thay thế được: logo + tên + mô tả + 3 tag năng lực + sao đánh giá + "12.5K dùng" + pill "Theo mức dùng" — bê nguyên sang bất kỳ app tổng hợp AI nào vẫn chạy. Tệ hơn: thứ duy nhất khác nhau giữa 9 card (giá) lại in giống hệt nhau trên cả 9, còn thứ không có thật (rating, popularity) thì in to và có màu.

**Deterministic scan:** not applicable (native platform).

**Visual overlays:** không có; detector chỉ đọc web markup.

## Overall Impression

Đây là nửa trên của một sản phẩm rất có chủ đích và nửa dưới của một template. Phần chat xử lý lỗi tốt hơn mặt bằng chung: gửi hỏng thì rút bong bóng, trả lại chữ, mời thử lại; dừng thì không trừ tiền; đọc lịch sử lỗi thì không treo khung xương. Nhưng đúng lúc người dùng cần tin app nhất — "tôi đang nói chuyện với model nào, tốn bao nhiêu" — giao diện lại nói một đằng, hệ thống làm một nẻo. Cơ hội lớn nhất: biến chi phí thành nhân vật chính của màn chat thay vì dòng chú thích 12px.

## What's Working

1. **Đường thất bại được thiết kế, không phải vá.** Gửi lỗi → xoá tin vừa gửi, trả nguyên văn vào ô nhập, hiện `ErrorState` có "Thử lại" gửi đúng prompt cũ. Đọc lịch sử lỗi → banner chạm để thử lại, chat vẫn dùng được. Đây là mức hoàn thiện hiếm.
2. **Giá dính vào sản phẩm, không dính vào màn hình.** `ChatBubble` in `-N token` ngay dưới từng câu trả lời, `metaBar` in mode/độ trễ/giá của lần gọi gần nhất. Luận điểm "1 token = 1 token thật" hiện ra ở đúng chỗ người dùng đang nhìn.
3. **Kỷ luật hệ thống.** 48dp cho mọi vùng chạm, `accessibilityLabel` gần như đầy đủ, skeleton thay spinner, `maxFontSizeMultiplier` có mặt ở hầu hết text, không hard-code hex ngoài `mockData`.

## Priority Issues

### [P0] Giao diện khẳng định một danh tính model không có thật

- **What:** `AIHubScreen` giờ luôn hiện tên model người dùng chọn (`selectedModelName`), và `services/ai.js` thêm `withModelIdentity()` chèn system prompt: *"Bạn đang chạy trên mô hình \"${name}\"… hãy trả lời đúng tên mô hình này"*. Trong khi `resolveModel()` gửi lên API model đã cấu hình, và khi lỗi tên model còn tự fallback về `cfg.model`. Comment trong diff cũ bị xoá nói thẳng điều ngược lại: *"header không bao giờ hiện 'GPT-4o' trong khi thực tế gọi Gemini"*.
- **Why it matters:** Chọn "Claude 3.5 Sonnet" nhưng request có thể chạy Pollinations `openai`, và app còn **dạy model nói dối** rằng nó là Claude. Với một đồ án lấy "AI thật, tính tiền theo usage thật" làm positioning, đây là lỗi niêm tin chí mạng: hội đồng chỉ cần hỏi "em đang gọi model nào?" là app tự bịa câu trả lời. Nó cũng phá Product Principle 4 ("Trung thực về dữ liệu").
- **Fix:** Bỏ `withModelIdentity()`. Khôi phục logic cũ: header hiện model **thực sự** được resolve (`resolveModel`/`result.model`), và nếu danh mục chỉ là "khung chat dùng chung" thì nói đúng như vậy — một dòng dưới header: "Khung chat chung · model thật: <cfg.model>". Cách bền hơn: map mỗi card sang một model thật và khoá card không cấu hình được.
- **Suggested command:** `/impeccable clarify`

### [P1] `styles.headerActions` không tồn tại → layout vỡ ở cả hai màn

- **What:** `AIHubScreen.jsx:491` và `:660` dùng `<View style={styles.headerActions}>` nhưng `StyleSheet.create` của file không định nghĩa khoá này (APIKeys, Logs, AdminUsers đều có). View nhận `style={undefined}` → mặc định `flexDirection: 'column'`, `alignItems: 'stretch'`, nên hai `IconButton` 48×48 (xoá lịch sử, cài đặt AI) **xếp dọc**, chiếm ~96px ngay dưới header, lệch trái, không có nền hay khoảng cách.
- **Why it matters:** Trên màn 640dp, gần 1/5 chiều cao bị một cột icon lạc lõng ăn mất trước khi người dùng thấy model đầu tiên hay tin nhắn đầu tiên. Đây là thứ hội đồng thấy trong 2 giây đầu và đọc là "app lỗi".
- **Fix:** Thêm `headerActions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: layout.gutter, paddingTop: spacing.xs }` — hoặc tốt hơn, cho `AppHeader` một slot `actions` để hai icon nằm cùng hàng với tiêu đề và `TokenBadge`, bỏ hẳn hàng thứ hai.
- **Suggested command:** `/impeccable layout`

### [P1] Card model bán bằng số bịa, không bán bằng giá

- **What:** Mỗi card in `model.rating` (4.0–4.9 "sao") và `formatTokenShort(model.popularity)` ("12.5K dùng") — cả hai là hằng số trong `mockData.js`, không có nguồn. Trong khi đó pill chi phí ghi "Theo mức dùng" giống hệt nhau trên cả 9 card, và `model.tokenCost` (10–50) có trong data nhưng không hiện ở đâu.
- **Why it matters:** PRODUCT.md cấm rõ: *"Không được bịa dữ liệu người dùng, đánh giá, hay số liệu hiệu năng"*. Đây là vi phạm trực tiếp, và nó chiếm đúng chỗ đáng lẽ phải là thông tin quyết định: câu này tốn bao nhiêu. Người dùng phải mở từng model để biết giá; 4/9 model là "text" nên hàng chip lọc gần như không phân biệt gì.
- **Fix:** Xoá rating + popularity khỏi card. Đưa lên card thứ người dùng cần: "≈ 40 token/lượt · ~1 câu hỏi", giá trị mặc định, và nhãn "đã dùng gần đây" nếu có lịch sử. Sắp xếp mặc định theo chi phí hoặc theo lần dùng cuối; giữ chip lọc chỉ khi còn ≥2 loại thực sự có mặt.
- **Suggested command:** `/impeccable distill`

### [P1] Chi phí vô hình trước khi tiêu, và lép vế sau khi tiêu

- **What:** Trước khi gửi, màn chỉ kiểm tra `MIN_AI_CALL_BALANCE` và bắn `Alert.alert` khi thiếu — không có ước lượng nào. Sau khi gửi, giá nằm ở dòng meta 12px màu `textFaint` và `-N token` 12px dưới bong bóng; trong khi số dư chỉ đổi lặng lẽ trong `TokenBadge`.
- **Why it matters:** Product Principle 1 hứa *"Mọi hành động tốn token đều hiện giá và quy đổi ra câu hỏi AI trước khi xác nhận"* — màn tiêu token nhiều nhất app lại là màn duy nhất không làm được điều đó. Người dùng không biết một câu hỏi dài 2.000 ký tự sẽ đốt bao nhiêu cho tới khi xong.
- **Fix:** Thêm ước lượng ngay trên thanh nhập: `≈ {estimateTokens(input)}–{estimate+300} token · {n} câu hỏi` (dùng `estimateTokens` sẵn có). Sau khi trả lời, nâng "biên lai" lên thành một dòng có trọng lượng: `-{formatToken(cost)} token · còn {balance}` với chữ mono 14px, và cho bong bóng cuối cuộn tới là thấy. Thay `Alert` thiếu tiền bằng banner inline có CTA "Nạp token".
- **Suggested command:** `/impeccable layout`

### [P1] Câu trả lời AI hiện markdown thô, không copy được

- **What:** `ChatBubble` render `message.content` trong một `<Text>` duy nhất. Không có renderer markdown trong `package.json`. Model trả về `**đậm**`, `###`, danh sách `-`, và code fence ``` ``` `` `` — tất cả hiện nguyên ký tự. Không có nút copy, không long-press copy, không "tạo lại".
- **Why it matters:** Với một app chat AI, câu trả lời có code là kịch bản thường gặp (chip gợi ý còn mời "Giải thích đoạn code này"). Người dùng nhận về một khối chữ có dấu sao, và muốn lấy code thì phải bôi đen bằng tay trên điện thoại.
- **Fix:** Tối thiểu: tách code fence thành khối `surfaceAlt` + mono + nút copy (`expo-clipboard` đã có trong deps), và render đậm/nghiêng/danh sách. Thêm hàng hành động dưới bong bóng AI: Copy · Tạo lại.
- **Suggested command:** `/impeccable harden`

## Persona Red Flags

**Casey (người dùng điện thoại một tay — persona chính của PRODUCT.md):** mọi điều hướng nằm ở góc trên-trái (☰), đúng vùng xa ngón cái nhất; không có bottom nav nên đổi mục luôn là 2 chạm ở nửa trên màn. Muốn đổi model giữa cuộc chat phải bấm ← (trên-trái) rồi chọn lại card — mất ngữ cảnh, không có "model gần đây". Danh sách 9 card cuộn dài, không có mục yêu thích.

**Jordan (người mới):** "Theo mức dùng" không nói được gì; "Trực tiếp · đang gọi mô hình thật" và "Đang dùng câu trả lời mô phỏng" là hai nhãn kỹ thuật không có chỗ giải thích; 4.8 sao khiến Jordan tin có người đã đánh giá. Không có chỗ nào nói "1 token mua được gì" trước khi nạp tiền.

**Riley (stress test):** chọn Claude rồi hỏi "bạn là model gì?" sẽ nhận câu trả lời do chính app soạn sẵn trong system prompt — sai lệch có chủ đích. Lịch sử lưu tối đa 40 tin/model và cắt nội dung ở 8.000 ký tự **âm thầm**, không thông báo; mở lại app thấy tin cũ biến mất.

**Hội đồng chấm (persona riêng của đồ án):** mở app, thấy 9 model có sao và lượt dùng như app thật, hỏi "số này ở đâu ra?" → không có nguồn. Hỏi "có thật gọi GPT-4o không?" → app trả lời có, dù gateway là Pollinations. Đúng loại câu hỏi làm hỏng phần "AI thật" của đồ án.

## Minor Observations

- `ChatBubble` in `-${message.tokenCost} token` bằng số thô → "1250" thay vì "1.250"; và dùng `type.numeric` (tabular-nums) chứ không phải `type.mono` như "The Money Is Monospace Rule".
- `AppHeader` đặt tiêu đề 16px giữa màn với nút ← bên trái và pill số dư bên phải — pattern iOS; Material top app bar canh trái, và DESIGN.md ghi 24px.
- `Alert.alert` dùng cho "Không đủ token" và xác nhận xoá lịch sử, trong khi DESIGN.md yêu cầu lỗi inline (không Alert) và UI kit đã có `BottomSheet`.
- `MiniBanner` đặt `numberOfLines={1}` trong khung 64px → câu "Chưa cấu hình AI thật — đang trả lời mô phỏng" bị cắt ở font scale 1.3×.
- `TypingRow` đổi dấu chấm mỗi 400ms và đặt `accessibilityLiveRegion="polite"` → TalkBack có thể đọc lại liên tục; cũng không tôn trọng `useReduceMotion()`.
- i18n: chỉ 2 chuỗi trong màn dùng `t()`; ~40 chuỗi còn lại hard-code tiếng Việt → bật `EXPO_PUBLIC_LANG=en` ra màn nửa Việt nửa Anh.
- `sendError` nằm ở `ListFooterComponent` — nếu người dùng đã cuộn lên đọc câu trả lời cũ thì thông báo lỗi nằm ngoài tầm nhìn.
- Nút xoá-toàn-bộ chỉ xuất hiện khi `totalHistory > 0` → hàng icon đổi độ rộng, vị trí nút cài đặt nhảy theo.

## Questions to Consider

- Nếu cả 9 card đều gọi về một endpoint, tại sao vẫn cần một danh mục 9 model? Bản trung thực sẽ là "một model bạn cấu hình + danh mục khoá để mở khoá bằng key" — hay đó chính là điều nên nói với hội đồng?
- Nếu chi phí là nhân vật chính — to nhất màn hình, mono, cập nhật sau từng lượt như số dư ngân hàng — thì màn chat này mạnh hơn bao nhiêu?
- Danh mục model cần "đánh giá 4.8 sao", hay cần đúng một câu: "model này đốt bao nhiêu token cho một câu trả lời"?
