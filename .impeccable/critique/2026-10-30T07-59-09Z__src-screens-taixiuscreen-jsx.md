---
target: TaiXiuScreen
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
p2_count: 3
target_identity: "file:E:\\Semester7\\MMA\\aibox-app\\src\\screens\\TaiXiuScreen.jsx"
target_fingerprint: "sha256:0dca3f1ffb880cd4d404ca8f7d8bf678b49b8cfd8798c69bce50d89885f2dab9"
target_path: "E:\\Semester7\\MMA\\aibox-app\\src\\screens\\TaiXiuScreen.jsx"
timestamp: 2026-10-30T07-59-09Z
slug: src-screens-taixiuscreen-jsx
---
# Critique — TaiXiuScreen

Method: design review only (detector not applicable, native platform)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Lắc/banner/toast rõ; nhưng mức cược bị kẹp theo số dư mà không nói (500 → 300) |
| 2 | Match System / Real World | 2 | TÀI đỏ / XỈU xanh đảo nghĩa thắng–thua quen thuộc; "Lãi ròng" là thuật ngữ tài chính |
| 3 | User Control and Freedom | 3 | Có ☰, back, đổi cửa; nhưng cược đã đặt là không hoàn tác và không có xác nhận |
| 4 | Consistency and Standards | 2 | Hai cách chọn cược (stepper + preset); chuỗi hard-code tiếng Việt trong khi màn khác dùng i18n; "1 ăn 1" lặp 3 lần |
| 5 | Error Prevention | 2 | Chặn cược <100 và preset vượt số dư; nhưng 1 chạm đặt tới 5.000 token |
| 6 | Recognition Rather Than Recall | 3 | Khoảng tổng và luật hiện trên nút; không có "cược lại ván trước"; preset mờ không nói vì sao |
| 7 | Flexibility and Efficiency | 2 | Không có lặp nhanh / gấp đôi; chỉnh bước 100 hoặc chọn preset |
| 8 | Aesthetic and Minimalist Design | 2 | 4 card thống kê + pill trang trí + "1 ăn 1" ×3 làm loãng điểm nhấn |
| 9 | Error Recovery | 3 | Toast nói rõ thiếu bao nhiêu token; ErrorState có nút Nạp |
| 10 | Help and Documentation | 3 | Luật + disclaimer 18+ ngay trong màn; thiếu ví dụ token cụ thể cho lợi thế nhà cái |
| **Total** | | **25/40** | **Acceptable (62,5%)** |

## Design Specificity Verdict

**LLM assessment:** Nửa authored. Phần thật sự thuộc AIBox: xúc xắc vẽ bằng `View`, banner kết quả một dòng, lịch sử 3 cột, dòng quy đổi "≈ câu hỏi AI". Phần generic: pill "Tài xỉu 3 xúc xắc", 4 card thống kê chia đều, hai nút cược màu cảm xúc — bố cục này dùng được cho bất kỳ game mini nào nếu đổi tên. Chất riêng đến từ palette/mono/dice, không đến từ cấu trúc.

**Deterministic scan:** not applicable (native platform).

## Overall Impression

Bàn cược đọc được trong 5 giây và luật minh bạch — điểm mạnh hiếm. Nhưng màn đang xếp theo thứ tự "kể chuyện" (bàn chơi → thống kê → chọn cược → đặt cược) thay vì theo tay người chơi: hành động chính bị đẩy xuống dưới, và hai nút cược dùng màu thắng/thua để mô tả hai cửa trung tính. Cơ hội lớn nhất: biến cụm "mức cược + TÀI/XỈU" thành thanh hành động cố định ở đáy, phần còn lại cuộn phía trên.

## What's Working

- **Banner kết quả + live region:** một dòng "6-5-3 · tổng 14 → TÀI · thắng +500" vừa đọc bằng mắt vừa đọc bằng trình đọc màn hình; không phải suy luận từ 3 viên xúc xắc.
- **Quy đổi token → câu hỏi AI ngay dưới preset:** token không còn là con số trừu tượng; đúng Product Principle #1 "chi phí nhìn thấy trước khi bấm".
- **Luật công khai + disclaimer 18+ trong màn:** nói rõ 6/216 = 2,78%, "không đổi ra tiền", "RNG trên máy" — minh bạch hơn mặt bằng app mô phỏng.

## Priority Issues

### [P1] Hành động chính nằm dưới màn hình đầu
- **What:** Trên máy ~640–700dp (720×1280, hoặc font scale 1.3), cụm TÀI/XỈU bắt đầu quanh y≈640dp nên bị cắt/ phải vuốt mới thấy. Thứ tự hiện tại: bàn chơi (≈204dp) → 4 thẻ thống kê (≈56) → thẻ mức cược (≈204) → nút cược (96).
- **Why it matters:** Người chơi mới mở màn thấy xúc xắc và số liệu nhưng không thấy chỗ bấm; vi phạm chính "The Thumb-First Rule" trong DESIGN.md.
- **Fix:** Bỏ pill trang trí và gộp 4 thẻ thống kê thành một dải chip cuộn ngang; giảm xúc xắc 64→56; đưa "Mức cược + TÀI/XỈU" thành bottom action bar cố định trên `insets.bottom`, phần trên cuộn tự do.
- **Suggested command:** `/impeccable layout`

### [P1] TÀI màu đỏ, XỈU màu xanh — mượn màu trạng thái cho hai cửa trung tính
- **What:** `betTai` dùng `dangerDim/danger`, `betXiu` dùng `successDim/success`. Khi cược TÀI thắng, banner và xúc xắc chuyển xanh trong lúc nút TÀI vẫn đỏ.
- **Why it matters:** Người chơi đọc "TÀI = cửa xấu/lỗ", "XỈU = cửa tốt/lãi"; tín hiệu xung đột ở đúng khoảnh khắc thắng/thua. Vi phạm "The Status-Only Rule" của chính hệ thống.
- **Fix:** Hai nút cùng nền `surfaceAlt`, viền `borderSoft`; phân biệt bằng nhãn 24px + khoảng tổng; chỉ dùng success/danger cho kết quả (banner, dice tone, lịch sử).
- **Suggested command:** `/impeccable colorize`

### [P1] Một chạm đặt tới 5.000 token, không có bước chặn
- **What:** Hai nút cao 96px sát nhau; không xác nhận, không giữ, không hoàn tác. 5.000 token ≈ 5–10 câu hỏi AI.
- **Why it matters:** Chạm nhầm khi cuộn hoặc khi tay ướt làm mất một phần ví; người mới chưa hiểu luật cũng có thể mất tiền ngay ván đầu.
- **Fix:** Với mức ≥1.000, yêu cầu **giữ 400ms** (vòng tiến trình trên nút) thay vì thêm sheet; mức ≤500 giữ 1 chạm. Nhãn đổi thành "Giữ để cược 5.000" khi ở mức cao.
- **Suggested command:** `/impeccable harden`

### [P2] Nhiễu thị giác: kicker, "1 ăn 1" ×3, 4 thẻ thống kê ngang hàng
- **What:** Pill "Tài xỉu 3 xúc xắc" là eyebrow trang trí (craft-floor cấm); "1 ăn 1" có ở header meta, cả hai nút và ghi chú; 4 thẻ thống kê chia đều sự chú ý với bàn cược.
- **Why it matters:** Mắt không có điểm dừng; màn dài ~1.400px khiến luật và lịch sử hiếm khi được đọc.
- **Fix:** Xoá pill, giữ "Ván thứ N" làm metadata phải; bỏ "1 ăn 1" khỏi nút (giữ 1 chỗ); gộp thống kê thành `12 ván · 58% thắng · +1.500` trên một dòng chip.
- **Suggested command:** `/impeccable distill`

### [P2] Hai cách chọn cược và preset mờ không giải thích
- **What:** Stepper (2 nút + giá trị) và 4 preset = 6 control cho một quyết định; preset vượt số dư chỉ mờ 0.5, không nói lý do.
- **Why it matters:** Vượt ngưỡng 4 lựa chọn cùng lúc (working memory); người chơi tưởng app lỗi khi preset 5.000 không bấm được.
- **Fix:** Giữ preset, bỏ stepper (hoặc ngược lại, nhưng chỉ một); dưới hàng preset thêm "Tối đa 5.000 · số dư 3.200" khi có preset bị chặn.
- **Suggested command:** `/impeccable distill`

### [P2] Trình đọc màn hình và i18n chưa khớp phần còn lại của app
- **What:** `historyItem` là `View` có `accessibilityLabel` nhưng không `accessible` → Android đọc 3 mảnh rời ("3-5-6", "tổng 14 · TÀI", "+500"). Kết quả được announce 2 lần (banner `accessibilityLiveRegion` + `announceForAccessibility`). Toàn bộ chuỗi game hard-code tiếng Việt, trong khi các màn khác dùng `t()`.
- **Why it matters:** Người dùng TalkBack mất ngữ cảnh thắng/thua; đổi `EXPO_PUBLIC_LANG=en` thì riêng màn này vẫn tiếng Việt.
- **Fix:** Thêm `accessible` + label đầy đủ ("Ván 3-5-6, tổng 14, cửa Tài, thắng 500 token, 2 phút trước"); bỏ một kênh announce; đưa chuỗi vào `src/i18n`.
- **Suggested command:** `/impeccable harden`

## Persona Red Flags

**Casey (Distracted Mobile User):** Nút cược có thể nằm dưới fold trên máy 640dp; đổi mức cược phải cuộn lên rồi cuộn xuống; preset 1.000 và 5.000 sát nhau trong hàng 4 nút — chạm nhầm khi tay ướt là mất 5.000 token; OfflineBar chiếm thêm chỗ đầu màn dù game chơi offline được.

**Jordan (Confused First-Timer):** "Lãi ròng", "bước 100", "1 ăn 1" chưa được giải thích tại chỗ; pill "Tài xỉu 3 xúc xắc" không dạy được gì; preset mờ không nói vì sao; nút TÀI đỏ khiến cô ấy nghĩ TÀI là cửa xấu.

**Sam (Accessibility-Dependent User):** Lịch sử đọc rời rạc từng mảnh; thông báo kết quả bị lặp; chữ 12px trong thẻ rộng 76px ("Tỉ lệ thắng") xuống 2 dòng ở font scale 1.6 làm hàng thẻ so le.

## Minor Observations

- `chatsHint(500)` in "≈ 0,5–1 câu hỏi AI (mỗi câu ~500–1.000 token)" — dài, xuống 2 dòng ở font scale lớn; nên rút còn "≈ 0,5–1 câu hỏi AI".
- Icon `target` cho tag "Tài xỉu" không phải xúc xắc (Feather không có dice) — bỏ tag là hết vấn đề.
- `hapticError()` khi thua bình thường khiến kết quả hợp lệ giống lỗi hệ thống; nên dùng rung nhẹ/trung tính.
- "Số ván"/"Lãi ròng" chỉ tính trong 200 giao dịch gần nhất (`MAX_TRANSACTIONS`) nhưng nhãn không nói.
- `ErrorState` chen giữa thống kê và mức cược, đẩy nội dung xuống; nên đặt trong thẻ mức cược.
- Header meta "Cược token nội bộ · trả 1 ăn 1" lặp thông tin đã có trên nút.

## Questions to Consider

- Nếu chỉ giữ một vùng bấm được trên màn này, đó có nên là thanh TÀI/XỈU cố định ở đáy?
- Điều gì khiến người chơi tin đây là "bàn cược của AIBox" chứ không phải game mini gắn vào app?
- Có nên hiện "ví còn 3.200 token ≈ 4–6 câu hỏi AI" ngay trên thanh cược để chi phí luôn ở trong tầm mắt?
