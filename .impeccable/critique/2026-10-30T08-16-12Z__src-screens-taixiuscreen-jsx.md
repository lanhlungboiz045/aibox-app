---
target: TaiXiuScreen
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:E:\\Semester7\\MMA\\aibox-app\\src\\screens\\TaiXiuScreen.jsx"
target_fingerprint: "sha256:35f3d45a710a50dd71322b9a0f575792a40953f5b17478cec9177ad10a116b0a"
target_path: "E:\\Semester7\\MMA\\aibox-app\\src\\screens\\TaiXiuScreen.jsx"
timestamp: 2026-10-30T08-16-12Z
slug: src-screens-taixiuscreen-jsx
---
# Critique — src/screens/TaiXiuScreen.jsx (lần 3)

- Phương pháp: Assessment A (native Android/Expo Go, không có detector/browser → chạy A đơn lẻ theo spec native).
- Code được chấm: commit `efe7b73`.
- Sau khi chấm, 2 lỗi P1 đầu đã sửa trong `3f83a69` (toast báo số dư, ẩn odds khi không đủ token) cùng vài P3 (bỏ mono cả câu, `200+ ván`, bỏ rung trùng).
- Ghi chú: lần chấm trước đạt 28/40 nhưng **không lưu snapshot** (code đổi tiếp nên fingerprint lệch) → trend chỉ có lần 1 và lần này.

## Bảng điểm

| # | Heuristic (Nielsen) | Điểm 0-4 | Vấn đề chính |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Lắc/banner rõ; toast không nêu số dư mới, số dư chỉ ở header |
| 2 | Match System/Real World | 2 | Toast "tổng 14" dễ đọc thành số dư; "giữ 0,4 giây" là quy ước lạ |
| 3 | User Control and Freedom | 2 | Bấm là cược không huỷ; khoá 700ms; không hoàn tác ván đã đặt |
| 4 | Consistency and Standards | 2 | Cùng nút đổi tap→hold theo mức cược; literal lệch thang token |
| 5 | Error Prevention | 3 | Hold ≥1.000, preset vượt số dư khoá, clamp; nhưng TalkBack bỏ hold |
| 6 | Recognition Rather Than Recall | 3 | Preset/odds/khoảng tổng hiện rõ; cử chỉ giữ phải nhớ, biến mất ở mức 500 |
| 7 | Flexibility and Efficiency | 2 | 4 preset cố định, không nhập mức cược, lịch sử chỉ 12 ô |
| 8 | Aesthetic and Minimalist Design | 2 | 12 ô tô màu + 4 đoạn luật + bar ~190px; kết quả chính chỉ 14px |
| 9 | Error Recovery | 3 | Toast nói rõ nguyên nhân + CTA nạp; toast tự tắt và che nút |
| 10 | Help and Documentation | 3 | Luật, lợi thế nhà cái 2,78%, disclaimer rõ; nằm dưới 2 màn cuộn |

**Tổng: 25/40 — Acceptable**

## Design Specificity Verdict

Rất AIBox ở chỗ quy đổi chi phí ra câu hỏi AI ngay tại điểm đặt cược (`chatsRange`), số mono + `formatToken`, và hold-to-bet như phanh ngân sách. Giọng văn luật/cảnh báo cũng đúng bản sắc trung thực, không hứa lợi nhuận. Nhưng bố cục là khuôn chung của mọi app cá cược: card bàn chơi → banner kết quả → lưới lịch sử → thanh 2 nút đáy. Banner một dòng và lưới 12 ô là phần generic nhất, bê sang app khác vẫn chạy.

## Overall Impression

Màn được viết cẩn thận hơn mức trung bình: phản hồi thật (rung, toast, animation), luật công khai, guardrail tiền bạc có chủ đích. Vấn đề không phải thiếu thành phần mà là các thành phần đánh nhau: toast chiếm đúng chỗ thanh cược, số trong toast mơ hồ, cùng một nút có hai luật tương tác. Màu trạng thái bị tiêu quá nhiều cho lịch sử nên thắng/thua hiện tại lại nhỏ và chìm. Sửa 3 điểm P1 là màn lên Good ngay.

## What's Working

- **Chi phí hiện trước khi bấm, đúng chỗ ngón tay:** `betBar` gộp "Mức cược" + `≈ {chatsRange(...)} câu hỏi AI` + "Thắng +X · thua −X", preset khoá khi vượt số dư.
- **Phòng lỗi có giải thích:** hold 0,4s cho mức ≥1.000 kèm toast nêu lý do khi thả sớm; luật + lợi thế nhà cái 6/216 = 2,78% + disclaimer 18+.
- **A11y có suy nghĩ:** 3 xúc xắc gộp 1 nhãn, `Die` ẩn khỏi TalkBack, toast là kênh live duy nhất, tôn trọng `useReduceMotion`.

## Priority Issues

### [P1] Toast kết quả ghi "tổng 14" — đọc thành số dư (đã sửa `3f83a69`)
- What: `toast.success(\`Thắng +500 token · tổng ${result.total}\`)`, nhưng `result.total` là tổng 3 xúc xắc.
- Why it matters: Sau khi thắng, người chơi cần số dư mới; "tổng 14" là thông tin sai lệch trên kênh duy nhất TalkBack đọc.
- Fix: Đổi thành "Thắng +500 · số dư 5.500" dùng `balance` sau ván; bỏ chữ "tổng" hoặc ghi rõ "xúc xắc 3-5-6".
- Suggested command: /impeccable clarify

### [P1] Số dư < 100: thanh cược vẫn hứa "Thắng +100 · thua −100" (đã sửa `3f83a69`)
- What: Khi `stakeAmount === 0`, nhãn dùng fallback `stakeAmount || MIN_STAKE` nên hiện "Mức cược 0" cạnh odds +100/−100.
- Why it matters: Màn hứa một ván không thể đặt, ngược nguyên tắc "chi phí thấy trước"; người chơi bấm nút disabled mà không hiểu.
- Fix: Khi `stakeAmount < MIN_STAKE`, thay cụm odds bằng "Chưa đủ token để cược" và ẩn dòng quy đổi AI.
- Suggested command: /impeccable harden

### [P1] Cùng nút TÀI/XỈU đổi từ chạm sang giữ tuỳ mức cược
- What: `holdMode` bật khi `stakeAmount >= 1000`; dưới ngưỡng `onPress` đặt ngay, trên ngưỡng chạm bị từ chối.
- Why it matters: Người dùng học "chạm TÀI để chơi", đổi preset 500→1.000 thì nút như hỏng giữa các lần bấm.
- Fix: Một mô hình duy nhất: luôn chạm, mức ≥1.000 mở sheet xác nhận "Đặt 1.000 vào TÀI?"; hoặc luôn yêu cầu giữ.
- Suggested command: /impeccable clarify

### [P2] Toast nổi ở đáy che đúng thanh cược sau mỗi ván
- What: `ToastHost` absolute `bottom: 0`; thanh cược cũng ở đáy, cao ~190px.
- Why it matters: Ngay sau kết quả — lúc muốn chơi tiếp — phần "Mức cược/odds/nút" bị che 2,6s; người chơi một tay phải chờ.
- Fix: Đặt toast phía trên thanh cược, hoặc chỉ dùng toast cho lỗi và để banner gánh kết quả.
- Suggested command: /impeccable layout

### [P2] Stake bị kẹp ngầm, không preset nào sáng
- What: `stakeAmount = clampStake(stake, balance)`; số dư 300 → hiện "Mức cược 300", preset 100/500 đều không `active`, không báo gì.
- Why it matters: Người dùng thấy mức cược mình chưa chọn và không chọn lại được đúng mức đó; trạng thái "đang chọn" mất tác dụng.
- Fix: Thêm chip "Theo số dư" đang chọn, hoặc tự hạ về preset hợp lệ lớn nhất kèm toast một dòng.
- Suggested command: /impeccable clarify

### [P2] Màu trạng thái lấn át, kết quả chính lại 14px
- What: 12 ô lịch sử tô `successDim`/`dangerDim`, xúc xắc cũng đổi tone, banner `type.bodyStrong` 14px.
- Why it matters: "Status-Only" thành nền trang trí diện rộng; 12 khối màu hút mắt khỏi câu thắng/thua vừa xảy ra.
- Fix: Lịch sử chỉ tô màu chữ/số +/− trên nền trung tính; nâng câu kết quả lên `type.subtitle` và tách "THẮNG +500" thành dòng riêng.
- Suggested command: /impeccable quieter

### [P3] Literal lệch thang token trong StyleSheet
- What: `gap: 2`, `lineHeight: 18`, `minHeight: 64`, `minWidth: 88`, `height: 3`, `borderWidth: 1.5` cho nút (spec 1px).
- Why it matters: DESIGN.md cấm hard-code ngoài token; các giá trị này lệch khỏi thang 4/8/12/16 khi chỉnh theme sau này.
- Fix: Thêm token nhỏ (`gapTight`, `cardMinHeight`) hoặc dùng `spacing.xs`/`touch.min`; đưa `lineHeight` vào `type.small`.
- Suggested command: /impeccable polish

### [P3] `fontFamily: 'monospace'` viết inline, phủ mono lên cả câu tiếng Việt
- What: Mono khai báo lại 7 lần thay vì `...type.mono`; `statsText` mono toàn câu.
- Why it matters: "Money Is Monospace" chỉ áp cho con số; chữ tiếng Việt trong mono khó đọc và trái token.
- Fix: Dùng `...type.mono` cho phần số, để nhãn chữ dùng `type.small` system font.
- Suggested command: /impeccable typeset

### [P3] "Ván thứ N" không tính mốc cắt lịch sử
- What: Dùng `played + 1`, nhưng `played` đếm trong cửa sổ `MAX_TRANSACTIONS`.
- Why it matters: Sau 200 giao dịch, số ván quay về nhỏ trong khi dòng thống kê đã ghi "ván gần nhất" — hai chỗ nói khác nhau.
- Fix: Dùng cùng một nguồn đếm và cùng hậu tố "gần nhất" cho cả hai vị trí.
- Suggested command: /impeccable clarify

### [P3] ErrorState dùng icon "refresh-cw" cho hành động "Nạp token"
- What: `ErrorState` render `icon="refresh-cw"` cho mọi CTA; màn này truyền `retryLabel={t('common.topup')}`.
- Why it matters: Icon tải lại gợi ý "thử lại", không gợi ý "nạp tiền" — sai nghĩa ở đúng nút cần bấm.
- Fix: Cho `ErrorState` nhận `retryIcon` và truyền icon ví/plus ở màn này.
- Suggested command: /impeccable polish

### [P3] Rung đôi khi thắng/lỗi (đã sửa `3f83a69`)
- What: `settle` gọi `hapticSuccess/hapticError`, Toast lại gọi lần nữa.
- Why it matters: Hai lần rung liền nhau tạo cảm giác "lỗi hệ thống" thay vì một phản hồi dứt khoát.
- Fix: Bỏ haptic trong `settle`, để Toast lo rung theo tone.
- Suggested command: /impeccable polish

## Persona Red Flags

**Casey (một tay, hay phân tâm):** Toast che thanh cược 2,6s sau mỗi ván, đúng lúc tay đang ở đáy màn; số dư nằm ở header, ngoài tầm mắt khi nhìn nút.
**Jordan (người mới):** Chạm TÀI ở 500 chạy, đổi sang 1.000 thì toast trôi qua — cậu ấy kết luận "nút lỗi"; "tổng 14" khiến cậu ấy tưởng số dư còn 14 token.
**Sam (TalkBack + chữ 1.6x):** Kết quả chỉ đến qua toast 2,6s, `numberOfLines={3}` có thể cắt câu "Giữ lâu hơn 0,4 giây…"; hold bị bỏ nên một double-tap có thể đặt 5.000 token không xác nhận.

## Minor Observations

- Card vượt `layout.cardMax` 140px ở cả 3 card vì nội dung nhiều dòng — cần ghi ngoại lệ nếu quy tắc còn hiệu lực.
- Lưới lịch sử `flexBasis: '30%'` + `minWidth: 88`: ở 1.6x, nhãn "tổng 14 · Tài" dễ xuống 2 dòng, ô cao lệch nhau.
- Nhãn a11y lịch sử rất dài, gồm cả thời gian tương đối — TalkBack phải nghe 12 câu dài, thiếu số ván.
- Header dùng `t('screen.taixiu')` nhưng "Token nội bộ · không đổi ra tiền" hard-code — nhất quán i18n bị lệch ngay trong header.
- `OfflineBar` chỉ báo mất mạng mà không nói game vẫn chơi được, dù PRODUCT.md nêu rõ điều này.
- `holdTimer` dùng chung cho 2 cửa: nhấn hai ngón cùng lúc thì cửa thứ hai chỉ hiện toast "giữ lâu hơn" thay vì đặt.

## Questions to Consider

1. Nếu toast là kênh duy nhất TalkBack đọc kết quả, tại sao nó đọc "tổng 14" — tổng xúc xắc — thay vì số dư mới, thứ người chơi thật sự cần?
2. Vì sao cùng một nút phải đổi luật chơi (chạm → giữ) chỉ vì người dùng đổi preset? Nếu mức cược là biến thì affordance phải là hằng.
3. Bỏ hết xanh/đỏ khỏi 12 ô lịch sử và banner, màn còn phân biệt được thắng/thua trong 1 giây không? Nếu không, màu đang gánh quá nhiều trong khi câu kết quả chỉ 14px.

P0: 0, P1: 3, P2: 3, P3: 6; total_score: 25 (trên 40)
