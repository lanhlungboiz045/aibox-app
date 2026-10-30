# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

**Chính:** sinh viên và người mới tìm hiểu đầu tư, dùng điện thoại Android hằng ngày (một tay, cầm dọc),
thường tranh thủ xem thị trường và hỏi AI trong lúc rảnh. Họ chưa có (hoặc chưa dám dùng) tiền thật, cần
một chỗ để **tập đọc kèo, thử quyết định và hiểu chi phí của việc hỏi AI** mà không mất tiền.

**Phụ (theo ngữ cảnh đồ án):** giảng viên/hội đồng chấm quan sát luồng chính trên máy — nên luồng đầu tiên
phải tự giải thích được mà không cần thuyết trình kèm.

## Product Purpose

AIBox là app mô phỏng đầu tư: xem thị trường, đặt kèo, theo dõi danh mục, xếp hạng, làm nhiệm vụ — cộng
một trợ lý AI gọi model thật và một ví token nội bộ dùng chung cho mọi tính năng. Thành công là người mới
hiểu một kèo nhanh hơn, biết một câu hỏi AI tốn bao nhiêu, và không bao giờ bị bất ngờ vì số dư.

## Positioning

**AI thật, tính tiền theo đúng usage.** App gọi model qua API OpenAI-compatible và trừ đúng
`usage.total_tokens` nhà cung cấp trả về (fallback `chars/4`), không bán "lượt chat" cố định hay gói token
ảo. Vì thế 1 token app = 1 token AI thật, và mọi màn hình đều quy đổi được token ↔ số câu hỏi AI
(~500–1.000 token/lượt). Đây là cơ chế trung thực mà một app mô phỏng khác khó copy nếu không thật sự
gọi API.

## Operating Context

- Đồ án học phần (Semester 7), chạy/test bằng **Expo Go trên Android**; build APK dev client là đường phụ.
- Đăng nhập **chỉ bằng Google**; hồ sơ người dùng ở Firestore `users/{uid}`.
- Không có Firebase/AI key vẫn phải chạy được ở **demo mode** (AsyncStorage), không crash.
- Ví, token, positions, quests, lịch sử chat lưu **AsyncStorage theo uid**; admin xác định bằng
  `EXPO_PUBLIC_ADMIN_EMAILS`.
- Người dùng có thể đang **offline hoặc mạng chậm**; game Tài xỉu chạy local nên vẫn chơi được.
- Cấu hình (Firebase, AI base URL/model, theme, ngôn ngữ) đổi bằng `.env`, không sửa code.

## Capabilities and Constraints

- **Có:** Home tổng quan, Markets + chi tiết kèo, Portfolio + lịch sử giao dịch, Leaderboard, AI Hub
  (chat theo model, streaming/stop, lịch sử 40 tin/model), API Keys, Logs, Usage Dashboard, Model Catalog,
  Credits/Topup, Quests, Store, Transfer, Copy Trade, Trader Profile, Notifications, Profile, admin CMS,
  Onboarding 3 slide, game Tài xỉu 3 xúc xắc.
- **Token:** trừ khi AI trả lời thành công; lỗi/timeout/huỷ không trừ; tối thiểu 10 token để gọi AI.
  Nạp token là **thanh toán mô phỏng** (BANK demo), không nối cổng thật.
- **Game Tài xỉu:** token là credit nội bộ, **không nạp/rút/đổi ra tiền thật**, nội dung 18+; luật công
  khai; không thêm field mới vào account — lịch sử/thống kê suy ra từ `transactions` type `'TAIXIU'`.
- **Kỹ thuật:** Expo SDK 52, JavaScript/JSX (không TypeScript), React Navigation stack-only + drawer,
  `StyleSheet`, không hard-code màu/cỡ chữ/khoảng cách ngoài token.
- **i18n:** tiếng Việt mặc định, có tiếng Anh; chốt bằng `EXPO_PUBLIC_LANG`.
- **Theme:** tối mặc định + bảng sáng; chọn lúc module load theo hệ thống, ép bằng `EXPO_PUBLIC_THEME`.
- **Không được bịa** dữ liệu thị trường, người dùng, đánh giá, hay số liệu hiệu năng.

## Brand Commitments

- Tên **AIBox**; giao diện **tối tím** là ràng buộc đã chốt (nền `#0F1115`, tím `#8B5CF6`).
- Tiếng Việt là ngôn ngữ mặc định; nhãn ngắn, động từ rõ ("Nạp token", "Đặt cược"), không dùng từ
  marketing sáo rỗng.
- Đơn vị tiền của app là **token**, hiển thị kèm 💰; token là credit nội bộ, không phải tiền pháp định.
- Giọng văn trung thực, không hù doạ, không hứa lợi nhuận; luôn nói rõ khi dữ liệu là mô phỏng.

## Evidence on Hand

- Mã nguồn thật trong repo: `src/screens`, `src/components/ui` (UI kit 9 component), `src/theme`
  (palettes + tokens), `src/utils` (aiCost, economy, taiXiu), `src/services` (auth, ai, users, chatHistory).
- `README.md` ghi lại 6 bước tối ưu, bảng tương phản, luồng 3 chạm và luật game.
- **Không có:** ảnh chụp màn hình trong repo, testimonial, khách hàng thật, số liệu tăng trưởng, logo
  chính thức ngoài tên chữ. Tương lai không được tạo ra những thứ này.

## Product Principles

1. **Chi phí nhìn thấy trước khi bấm.** Mọi hành động tốn token đều hiện giá và quy đổi ra câu hỏi AI
   trước khi xác nhận.
2. **Không rủi ro tiền thật.** Không đường nào trong app dẫn tới nạp/rút/đổi token ra tiền; game và
   thanh toán đều ghi rõ là mô phỏng.
3. **Một tay, ba chạm.** Luồng chính (chat, nạp, đặt kèo, chuyển token) hoàn tất trong ≤3 chạm, vùng chạm
   ≥44px, có phản hồi haptic/toast.
4. **Trung thực về dữ liệu.** Không giả lập "AI đang suy nghĩ" khi đang lỗi; không hiện số liệu không có
   nguồn; lỗi phải nói rõ cách sửa.
5. **Không chặn vì thiếu cấu hình.** Thiếu key/Firebase/mạng → vẫn vào được app ở chế độ phù hợp, kèm
   banner giải thích.

## Accessibility & Inclusion

- Mọi cặp chữ/nền đạt **WCAG AA (≥4.5:1)** ở cả hai theme; có script kiểm tra tương phản.
- Vùng chạm ≥44px, cách nhau ≥8px; chữ tối thiểu 12px; không dùng màu làm tín hiệu duy nhất.
- Tôn trọng "giảm chuyển động" của hệ thống; nhãn `accessibilityLabel` cho icon và hành động.
- Chịu được font scale hệ thống (test 1.3×) và nội dung dài (số dư lớn, mã đơn, tên model).
