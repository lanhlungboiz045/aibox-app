---
name: AIBox
description: App mô phỏng đầu tư + trợ lý AI trả token theo usage, giao diện tối tím cho Android.
colors:
  than-dem: "#0F1115"
  muc-xanh: "#121620"
  than-noi: "#171B26"
  khoi-thep: "#1E2333"
  chi-mo: "#1B2030"
  chi-sang: "#252B3D"
  suong-trang: "#E8EAF2"
  bac-xam: "#B4BACB"
  khoi-bac: "#9AA1B9"
  tim-neon-dem: "#8B5CF6"
  tim-khoi: "#A78BFA"
  tim-muc: "#7C3AED"
  tim-mo: "rgba(139, 92, 246, 0.12)"
  tim-vien: "rgba(139, 92, 246, 0.45)"
  bac-ha-tin-hieu: "#34D399"
  bac-ha-mo: "rgba(52, 211, 153, 0.14)"
  ho-phach-canh-bao: "#FFB74D"
  ho-phach-mo: "rgba(255, 183, 77, 0.14)"
  san-ho-rui-ro: "#FF8A8A"
  san-ho-mo: "rgba(255, 107, 107, 0.14)"
  do-nguy-hiem: "#DC2626"
  xanh-thong-tin: "#7DD3FC"
  dong-co: "#C9A66B"
  on-accent: "#FFFFFF"
  on-bright: "#0F1115"
  nen-khoa: "#22262E"
  chu-khoa: "#8E96AA"
  overlay: "rgba(0, 0, 0, 0.65)"
typography:
  display:
    fontFamily: "System (Roboto on Android)"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: "38px"
    letterSpacing: "-0.6px"
  headline:
    fontFamily: "System (Roboto on Android)"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "30px"
    letterSpacing: "-0.4px"
  title:
    fontFamily: "System (Roboto on Android)"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "24px"
    letterSpacing: "-0.2px"
  subtitle:
    fontFamily: "System (Roboto on Android)"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "22px"
  body:
    fontFamily: "System (Roboto on Android)"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  body-strong:
    fontFamily: "System (Roboto on Android)"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  label:
    fontFamily: "System (Roboto on Android)"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  label-strong:
    fontFamily: "System (Roboto on Android)"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
  mono:
    fontFamily: "monospace"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
rounded:
  xs: "8px"
  sm: "10px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  xxxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.tim-muc}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 20px"
    typography: "{typography.body-strong}"
  button-secondary:
    backgroundColor: "{colors.than-noi}"
    textColor: "{colors.suong-trang}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 20px"
    typography: "{typography.body-strong}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.tim-khoi}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 20px"
    typography: "{typography.body-strong}"
  button-danger:
    backgroundColor: "{colors.do-nguy-hiem}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 20px"
    typography: "{typography.body-strong}"
  button-contrast:
    backgroundColor: "{colors.suong-trang}"
    textColor: "{colors.than-dem}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 20px"
    typography: "{typography.body-strong}"
  input-default:
    backgroundColor: "{colors.muc-xanh}"
    textColor: "{colors.suong-trang}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 12px"
    typography: "{typography.subtitle}"
  chip-default:
    backgroundColor: "{colors.muc-xanh}"
    textColor: "{colors.bac-xam}"
    rounded: "{rounded.pill}"
    height: "32px"
    padding: "0 12px"
    typography: "{typography.label-strong}"
  card-surface:
    backgroundColor: "{colors.muc-xanh}"
    rounded: "{rounded.lg}"
    padding: "16px"
  toast:
    backgroundColor: "{colors.khoi-thep}"
    textColor: "{colors.suong-trang}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    typography: "{typography.body-strong}"
---

# Design System: AIBox

## Overview

**Creative North Star: "Bàn giao dịch ban đêm"**

AIBox là một bàn giao dịch kê trong phòng tối: nền than, một luồng tím neon đánh dấu chỗ đáng nhìn, số
liệu hiện bằng chữ mono như trên bảng điện tử. Nhưng người ngồi vào bàn là sinh viên, không phải trader
chuyên nghiệp — nên luật chơi luôn được viết ra, mỗi token đều quy ra được "bao nhiêu câu hỏi AI", và
game Tài xỉu được phép vui. Sự nghiêm túc nằm ở dữ liệu; sự thân thiện nằm ở lời lẽ và phản hồi.

Bố cục dày vừa phải: mỗi màn là một chồng card trên cùng một nền, phân tầng bằng màu surface và viền
1px thay vì đổ bóng khắp nơi. Màu trạng thái (xanh bạc hà, hổ phách, san hô) chỉ xuất hiện khi có tin
để báo — thắng, thua, cảnh báo, lỗi. Tím neon không bao giờ là màu nền lớn; nó là đèn báo.

Mọi thứ phải "chắc tay": vùng chạm ≥48dp trên Android (≥44pt trên iOS), nút nhún nhẹ 0.97 kèm haptic, chữ không nhỏ hơn 12px, và mọi
hành động tốn token đều nói trước giá. Giao diện thân thiện nhưng không giả vờ rằng tiền là giả.

**Key Characteristics:**
- Nền than xanh (`#0F1115`) với 4 mức surface tăng dần; viền mảnh thay bóng.
- Một accent duy nhất: Tím neon đêm, xuất hiện như đèn báo chứ không như nền.
- Số liệu (token, giá, tổng điểm) luôn dùng font mono; nhãn dùng system font.
- Phản hồi giác quan: scale 0.97 + haptic khi nhấn, toast cho kết quả, tôn trọng giảm chuyển động.
- Emoji chỉ dùng cho tiền tệ và game (💰 🎲), không dùng làm icon điều hướng.

## Colors

Bảng màu là một phòng tối có đèn: than xanh làm nền, tím neon làm tín hiệu, ba màu trạng thái làm đèn
báo. Bảng sáng là cùng hệ thống nhưng đảo vai trò nền/chữ, không phải ảnh âm bản.

### Primary
- **Tím neon đêm** (`#8B5CF6`): accent gốc cho icon, viền chọn, đồ hoạ lớn; không dùng làm màu chữ nhỏ
  trên nền tối (4.46:1 — dưới ngưỡng AA cho chữ).
- **Tím khói** (`#A78BFA`): chữ nhỏ, link, nhãn đang chọn — bản sáng hơn của accent để đạt 6.6:1.
- **Tím mực** (`#7C3AED`): nền nút primary và nền chọn; chữ trắng đạt 5.7:1.
- **Tím mờ** (`rgba(139, 92, 246, 0.12)`) + **Tím viền** (`rgba(139, 92, 246, 0.45)`): nền và viền của
  trạng thái đang chọn (chip, card gói nạp, preset cược).

### Neutral
- **Than đêm** (`#0F1115`): nền toàn app và chữ trên nền sáng đặc.
- **Mực xanh** (`#121620`): surface của card, input, hàng danh sách.
- **Than nổi** (`#171B26`): surface của control nằm trong card (stepper, preset, nút secondary).
- **Khối thép** (`#1E2333`): lớp cao nhất — toast, skeleton, nút được hover/active.
- **Chì mờ** (`#1B2030`) / **Chì sáng** (`#252B3D`): viền phân tầng; Chì sáng cho control có thể bấm.
- **Sương trắng** (`#E8EAF2`): chữ chính (15.0:1 trên surface).
- **Bạc xám** (`#B4BACB`): chữ phụ, nhãn (9.3:1).
- **Khói bạc** (`#9AA1B9`): caption, placeholder, metadata (7.0:1).

### Secondary
- **Bạc hà tín hiệu** (`#34D399`): thắng cược, lãi, nạp thành công, trạng thái online.
- **Hổ phách cảnh báo** (`#FFB74D`): giá gói nạp, nhắc nhở, cảnh báo "bộ ba", nút thưởng.
- **San hô rủi ro** (`#FF8A8A`): thua cược, lỗ, lỗi inline và viền input lỗi.
- **Đỏ nghiêm trọng** (`#DC2626`): chỉ dùng làm nền nút phá huỷ (xoá key, đăng xuất) với chữ trắng.
- **Xanh thông tin** (`#7DD3FC`): thông báo trung tính, trạng thái "đang xử lý".
- **Đồng cổ** (`#C9A66B`): hạng cao, huy hiệu thành tích — dùng tiết chế như kim loại thật.

### Named Rules
**The One Neon Rule.** Tím neon chiếm ≤10% diện tích một màn hình. Nó đánh dấu hành động chính và trạng
thái đang chọn; nếu một màn có hai vùng tím lớn, một vùng phải bỏ.

**The Status-Only Rule.** Xanh/hổ phách/san hô chỉ xuất hiện khi có sự kiện (thắng, cảnh báo, lỗi), không
dùng trang trí. Màu không bao giờ là tín hiệu duy nhất — luôn kèm chữ hoặc icon.

## Typography

**Display Font:** System font (Roboto trên Android)
**Body Font:** System font (Roboto trên Android)
**Label/Mono Font:** monospace hệ thống cho mọi con số

**Character:** Không có font thương hiệu — chữ là công cụ. System font giữ app nhẹ, đúng chuẩn Android và
tự động hỗ trợ tiếng Việt; monospace là "bảng điện tử" cho token, giá, tổng điểm và mã đơn.

### Hierarchy
- **Display** (800, 32/38, -0.6): số dư token ở đầu màn Credits/Portfolio.
- **Headline** (700, 24/30, -0.4): tiêu đề màn hình, số token lớn trong card.
- **Title** (700, 18/24, -0.2): tiêu đề section trong scroll.
- **Subtitle** (600, 16/22): tên card, nhãn nút lớn, input.
- **Body** (400, 14/20) và **Body strong** (600, 14/20): nội dung, hàng danh sách, mô tả luật.
- **Label** (400–600, 12/16): caption, metadata, nhãn phụ; không bao giờ nhỏ hơn 12.
- **Mono** (600, 14/20): token, giá, tổng xúc xắc, mã đơn, số ván.

### Named Rules
**The 12px Floor Rule.** Không chữ nào dưới 12px, kể cả caption hay badge. Thiếu chỗ thì bỏ chữ, không
thu nhỏ.

**The Money Is Monospace Rule.** Mọi số token/tiền/điểm dùng mono và `formatToken()`; số dư giao dịch
không viết tắt (1.000, không phải 1K). Số lớn được `adjustsFontSizeToFit` thay vì cắt.

**The System-Scale Rule.** Chỉ dùng 8 bậc chữ trong token; không tự đặt fontSize trong màn hình. Người
dùng tăng cỡ chữ hệ thống thì layout phải chịu được tới 1.6× (input 1.8×) trước khi cắt.

## Layout

Một cột, lề ngang 16px, nhịp dọc 20px giữa các khối; header cao 56px, hàng danh sách 64–72px, card
không quá 140px (trừ biểu đồ). Mọi màn cuộn đều cộng `insets.bottom` để không bị thanh điều hướng hệ
thống che.

Trên tablet/màn rộng, nội dung canh giữa với `maxWidth: 720px` (`centeredContent`) thay vì giãn hết
chiều ngang; danh sách chip được phép cuộn ngang tràn lề. Không có bottom tab: điều hướng bằng drawer
mở từ nút ☰ ở header, nên nội dung được toàn bộ chiều cao.

Thang khoảng cách chỉ có 4/8/12/16/20/24/32. Khoảng cách giữa hai nút kề nhau ≥8dp, vùng chạm ≥48dp
trên Android theo Material và ≥44pt trên iOS theo HIG.

### Named Rules
**The One Column Rule.** Không chia cột nội dung trên điện thoại; chỉ số liệu ngắn mới nằm cạnh nhau
trong một hàng (2–4 ô).

**The Thumb-First Rule.** Hành động chính nằm ở nửa dưới màn hoặc trong tầm ngón cái; header chỉ chứa
điều hướng và ngữ cảnh.

## Elevation & Depth

Hệ thống hiện tại gần như **phẳng có phân tầng**: độ sâu được tạo bằng 4 mức surface (Than đêm → Mực
xanh → Than nổi → Khối thép) cộng viền 1px, không phải bằng bóng. Bóng chỉ dùng cho lớp tạm thời nổi
trên nội dung: toast (`elevation: 8`, shadow 0 6 12, opacity 0.35). Bottom sheet không đổ bóng — nó dựa
vào overlay tối 65% và bo góc trên 20px.

**Hướng đã chọn (chưa triển khai): "khối nổi, bóng đậm".** Người dùng muốn card/sheet có cảm giác khối
nổi rõ hơn. Khi làm, thêm token `shadow` vào `theme/tokens.js` (ví dụ `card`, `sheet`, `toast`) và áp
đồng thời cho cả hai theme; không rải shadow rời trong từng màn. Cho tới lúc đó, mọi mô tả trong file này
vẫn là hiện trạng phẳng.

### Shadow Vocabulary
- **Floating** (`0 6px 12px rgba(0,0,0,0.35)` + `elevation: 8`): toast và menu nổi; không dùng cho card
  nằm trong luồng.

### Named Rules
**The Floating-Only Rule.** Bóng chỉ dành cho thứ thật sự nổi trên nội dung (toast, menu, sheet). Card
trong luồng phân tầng bằng màu và viền.

## Shapes

Bo góc là ngôn ngữ chính: 8px cho phần tử nhỏ (badge, icon tile), 10px cho control phụ, 12px cho nút và
input, 16px cho card, 20px cho bottom sheet và khối lớn, pill 999px cho chip và badge. Viền luôn 1px
(riêng input 1.5px để dễ thấy trạng thái focus/lỗi). Không dùng góc vuông; không cắt xén ảnh bằng hình
elip.

### Named Rules
**The Pill-for-Filters Rule.** Chip lọc và badge dùng pill; nút hành động dùng 12px. Không trộn hai hình
thức này trong cùng một hàng.

## Components

### Buttons
- **Shape:** bo 12px, viền 1px cùng màu nền, cao tối thiểu 48/48/52dp theo size sm/md/lg.
- **Primary:** nền Tím mực, chữ trắng, icon 18–20px, padding ngang 20–24px.
- **Secondary:** nền Than nổi, chữ Sương trắng, viền Chì sáng.
- **Ghost:** nền trong suốt, chữ Tím khói — chỉ cho hành động phụ trong card.
- **Danger:** nền Đỏ nghiêm trọng, chữ trắng — chỉ cho hành động phá huỷ.
- **States:** nhấn → scale 0.97 + haptic; loading → spinner thay icon và chặn nhấn; disabled → opacity
  0.45 nhưng chữ vẫn đọc được; giảm chuyển động → không scale, chỉ đổi màu.

### Chips
- **Style:** nền Mực xanh, chữ Bạc xám, viền Chì mờ, pill; chip tương tác cao tối thiểu 48dp, chip tĩnh cao 32px.
- **State:** đang chọn → nền Tím mờ, viền Tím viền, chữ Tím khói; chip số liệu không bấm được thì render
  bằng `View`, không giả làm nút.

### Cards / Containers
- **Corner Style:** 16px; card nhỏ trong lưới 12px.
- **Background:** Mực xanh trên nền Than đêm; control bên trong dùng Than nổi.
- **Border:** 1px Chì mờ; card đang chọn 1.5px Tím viền + nền Tím mờ.
- **Internal Padding:** 16px (card thường), 12px (card lưới/gói nạp).
- **Shadow Strategy:** không bóng (xem Elevation & Depth).

### Inputs / Fields
- **Style:** nền Mực xanh, viền 1.5px Chì mờ, bo 12px, cao tối thiểu 52dp (multiline tối thiểu 96dp), chữ 16px.
- **Focus:** viền Tím viền; lỗi: viền San hô + dòng lỗi 12px kèm icon ngay dưới ô (không dùng Alert).
- **Disabled:** chữ Khói bạc, không đổi nền; vẫn giữ độ tương phản AA.

### Navigation
- **Style:** stack-only; header 56px với nút ☰ (drawer) ở trái, tiêu đề 24px và metadata 12px, badge token
  ở phải. Màn phụ dùng nút ← và tiêu đề 16px đậm.
- **Drawer:** danh sách nhóm (Tổng quan, Đầu tư, AI, Giải trí, Tài khoản) trên nền Than đêm, mục đang
  mở có nền Tím mờ + chữ Tím khói.
- **System Back:** luôn hoạt động; không chặn cử chỉ back của Android.

### Icons
- **Style:** Feather, stroke 2px, 12–24px; màu theo vai trò (Tím khói cho hành động, Khói bạc cho phụ).
  Icon điều hướng luôn kèm nhãn hoặc `accessibilityLabel`; emoji chỉ dùng cho 💰 và 🎲.

### Signature Components
- **TokenBadge:** pill nền Than nổi + 💰 + số dư mono; luôn ở header màn chính, bấm được để sang Credits.
- **Die:** mặt xúc xắc 64px, bo 12px, chấm tròn; khi lắc thì đổi mặt mỗi 90ms, khi thắng đổi viền/nền sang
  Bạc hà mờ, khi thua sang San hô mờ.
- **Toast:** nền Khối thép, viền 1px, bo 12px, icon trạng thái + chữ 14px, tự ẩn sau 2.6s; có biến thể
  "Hoàn tác" 5s.

## Do's and Don'ts

### Do:
- **Do** lấy mọi màu từ `src/theme/palettes.js` và mọi kích thước từ `src/theme/tokens.js`.
- **Do** dùng `formatToken()` + font mono cho mọi con số token; quy đổi token → câu hỏi AI khi người dùng
  sắp tiêu token.
- **Do** giữ vùng chạm ≥48dp trên Android (≥44pt trên iOS) và khoảng cách ≥8dp giữa hai nút kề nhau.
- **Do** dùng `PressableScale`/`Animated` + haptic cho phản hồi nhấn, và tôn trọng `useReduceMotion()`.
- **Do** viết nhãn tiếng Việt ngắn, động từ rõ ("Nạp token", "Đặt cược", "Dừng"), kèm đơn vị.
- **Do** dùng `EmptyState`/`ErrorState` có hành động tiếp theo thay vì màn trắng.

### Don't:
- **Don't** hard-code hex, fontSize, padding hay shadow trong màn hình — thêm token trước.
- **Don't** dùng tím neon làm nền diện rộng hoặc gradient tím-xanh mặc định của AI slop.
- **Don't** đặt chữ xám trên nền accent/trạng thái; chữ trên nền màu phải là `onAccent`/`onBright`.
- **Don't** dùng màu làm tín hiệu duy nhất cho thắng/thua/lỗi; luôn kèm chữ hoặc icon.
- **Don't** thêm bottom tab bar; điều hướng chính là drawer + header.
- **Don't** tạo màn hình mới bằng cách copy style rời — dùng UI kit (`src/components/ui`).
- **Don't** hứa lợi nhuận, bịa số liệu người dùng, hoặc trình bày token như tiền thật.
