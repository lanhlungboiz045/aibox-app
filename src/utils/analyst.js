// utils/analyst.js — Sinh nội dung "AI Market Analyst" từ dữ liệu market (mock, không gọi API thật)
// Mục đích: nối 2 core AI Hub + Markets, và dễ thay bằng response thật từ GPT/Claude sau này.
import { formatTokenShort, formatTimeLeft, formatDate } from './format';

const CATEGORY_RISK = {
  sports: { label: 'thể thao', risk: 'phụ thuộc 1 trận đấu, biến động rất cao', riskLevel: 3 },
  crypto: { label: 'crypto', risk: 'biến động mạnh theo tin tức và dòng tiền lớn', riskLevel: 3 },
  tech: { label: 'công nghệ', risk: 'phụ thuộc lộ trình sản phẩm và tin rò rỉ', riskLevel: 2 },
  entertainment: { label: 'giải trí', risk: 'khó dự đoán, nhiều yếu tố cảm tính', riskLevel: 2 },
  life: { label: 'đời sống', risk: 'ít dữ liệu tham chiếu, dễ bị tin đồn chi phối', riskLevel: 2 },
  politics: { label: 'chính trị', risk: 'có thể bị ảnh hưởng bởi quyết định bất ngờ', riskLevel: 3 },
};

function sentimentOf(yesPrice) {
  if (yesPrice >= 65) return 'thị trường đang khá tự tin vào YES';
  if (yesPrice >= 55) return 'thị trường nghiêng nhẹ về YES';
  if (yesPrice > 45) return 'thị trường đang giằng co, chưa rõ xu hướng';
  if (yesPrice > 35) return 'thị trường nghiêng nhẹ về NO';
  return 'thị trường đang khá tự tin vào NO';
}

function liquidityNote(volume, liquidity) {
  if (!liquidity) return 'market chưa có thanh khoản → khó thoát vị thế lớn';
  const ratio = volume / liquidity;
  if (ratio >= 3) return `volume gấp ${ratio.toFixed(1)}x thanh khoản → dòng tiền vào nhanh, giá dễ trượt`;
  if (ratio >= 1.5) return `volume/liquidity = ${ratio.toFixed(1)}x → thanh khoản ở mức trung bình`;
  return `volume/liquidity = ${ratio.toFixed(1)}x → thanh khoản tương đối dày`;
}

function riskAdvice(riskLevel) {
  if (riskLevel >= 3) return 'chỉ nên vào tối đa 5% số dư cho kèo này';
  if (riskLevel === 2) return 'nên giữ vị thế dưới 10% số dư';
  return 'có thể cân nhắc 10-15% số dư nếu có luận điểm rõ ràng';
}

export function buildMarketAnalysis(market, model, extraPrompt = '') {
  const category = CATEGORY_RISK[market.category] || CATEGORY_RISK.life;
  const yesPrice = market.yesPrice;
  const noPrice = market.noPrice;
  const impliedYes = `${yesPrice}%`;
  const edgeTarget = Math.min(95, yesPrice + 5);

  const lines = [
    `\u{1F4CA} Phân tích bởi ${model.name}`,
    '',
    `Kèo: "${market.question}"`,
    `Giá YES ${impliedYes} · NO ${noPrice}% · ${sentimentOf(yesPrice)}`,
    `Volume ${formatTokenShort(market.volume || 0)} \u{1F4B0} · Liquidity ${formatTokenShort(market.liquidity || 0)} \u{1F4B0}`,
    `Thời gian còn lại: ${formatTimeLeft(market.endDate)} (kết thúc ${formatDate(market.endDate)})`,
    market.creatorName ? `Người tạo market: ${market.creatorName}` : null,
    '',
    '1) Định giá & kỳ vọng',
    `- Giá YES ${impliedYes} tương đương xác suất thị trường chấm cho khả năng xảy ra.`,
    `- Chỉ có lý do mua YES nếu bạn tin xác suất thực tế ≥ ${edgeTarget}% (biên an toàn ~5 điểm).`,
    `- Nếu luận điểm của bạn chỉ ngang bằng ${impliedYes} thì kèo này không có "edge", bỏ qua sẽ tốt hơn.`,
    '',
    '2) Dòng tiền',
    `- ${liquidityNote(market.volume || 0, market.liquidity || 0)}.`,
    `- Loại kèo ${category.label}: ${category.risk}.`,
    '',
    '3) Rủi ro chính',
    `- Biến động cuối kỳ: giá có thể nhảy mạnh trước giờ đóng, đừng mua đuổi sát hạn.`,
    `- Rủi ro thanh khoản: market nhỏ khó bán lại đúng giá nếu bạn vào lệnh lớn.`,
    `- Rủi ro nguồn tin: kết quả do admin quyết định dựa trên nguồn công bố, cần đọc kỹ mô tả.`,
    '',
    '4) Gợi ý quản trị vốn',
    `- ${riskAdvice(category.riskLevel)}.`,
    `- Chốt lời từng phần khi giá YES lệch +15 điểm so với giá vào.`,
    '',
    extraPrompt ? `Yêu cầu thêm: ${extraPrompt}` : null,
    '',
    `Kết luận: ${yesPrice >= 55 ? 'nghiêng YES nhưng chờ nhịp điều chỉnh' : yesPrice <= 45 ? 'nghiêng NO, ưu tiên quan sát thêm' : 'chưa đủ lợi thế, chỉ vào khi có tin mới'}.`,
    '',
    '\u{26A0} Nội dung mô phỏng phục vụ demo, không phải lời khuyên đầu tư.',
  ];

  return lines.filter(line => line !== null).join('\n');
}
