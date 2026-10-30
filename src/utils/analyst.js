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

// Kích thước vị thế gợi ý, dạng ngắn để ghép vào dòng HÀNH ĐỘNG
function positionSize(riskLevel) {
  if (riskLevel >= 3) return 'tối đa 5% số dư';
  if (riskLevel === 2) return 'dưới 10% số dư';
  return '10-15% số dư';
}

// Xác suất YES "ước tính" theo heuristic: giá bị đẩy quá xa 50 khi thanh khoản mỏng
// thường đã bị overprice → kéo về gần 50 một chút. Dùng cho bản MOCK (không gọi API).
function estimateYes(market) {
  const yes = Number(market.yesPrice) || 50;
  const volume = Number(market.volume) || 0;
  const liquidity = Number(market.liquidity) || 0;
  const stretch = (yes - 50) / 50; // -1..1
  // liquidity mỏng + volume lớn → càng dễ lệch giá
  const thin = liquidity > 0 ? Math.min(1, volume / liquidity / 3) : 0.8;
  const reversion = -stretch * 8 * thin; // tối đa ±8 điểm
  return Math.round(Math.max(5, Math.min(95, yes + reversion)));
}

function confidenceOf(edge, thin) {
  const absEdge = Math.abs(edge);
  if (absEdge >= 8 && thin <= 0.5) return 'cao';
  if (absEdge >= 4) return 'trung bình';
  return 'thấp';
}

export function buildMarketAnalysis(market, model, extraPrompt = '') {
  const category = CATEGORY_RISK[market.category] || CATEGORY_RISK.life;
  const yesPrice = market.yesPrice;
  const noPrice = market.noPrice;
  const impliedYes = `${yesPrice}%`;
  const estYes = estimateYes(market);
  const estNo = 100 - estYes;

  // Nhận định dứt khoát: chọn bên có lợi thế, chỉ bỏ qua khi edge quá nhỏ
  const edgeYes = estYes - yesPrice;
  const edgeNo = estNo - noPrice;
  const side = edgeYes >= edgeNo ? 'YES' : 'NO';
  const edge = side === 'YES' ? edgeYes : edgeNo;
  const verdict = Math.abs(edge) < 3 ? 'BỎ QUA' : side;
  const estProb = side === 'YES' ? estYes : estNo;
  const marketProb = side === 'YES' ? yesPrice : noPrice;
  const thin = market.liquidity > 0
    ? Math.min(1, (market.volume || 0) / market.liquidity / 3)
    : 0.8;
  const confidence = verdict === 'BỎ QUA' ? 'thấp' : confidenceOf(edge, thin);
  const entryLow = Math.max(1, marketProb - 3);
  const entryHigh = Math.min(99, marketProb + 2);
  const takeProfit = Math.min(95, marketProb + 15);
  // Xác suất YES thực tế đảo chiều đủ xa → nhận định sai
  const invalidYes = Math.max(5, Math.min(95, verdict === 'NO' ? estYes + 10 : estYes - 10));

  const lines = [
    `\u{1F4CA} Phân tích bởi ${model.name}`,
    '',
    `Kèo: "${market.question}"`,
    `Giá thị trường: YES ${impliedYes} · NO ${noPrice}% · ${sentimentOf(yesPrice)}`,
    `Volume ${formatTokenShort(market.volume || 0)} \u{1F4B0} · Liquidity ${formatTokenShort(market.liquidity || 0)} \u{1F4B0}`,
    `Thời gian còn lại: ${formatTimeLeft(market.endDate)} (kết thúc ${formatDate(market.endDate)})`,
    market.creatorName ? `Người tạo market: ${market.creatorName}` : null,
    '',
    `KẾT LUẬN: ${verdict === 'BỎ QUA' ? 'BỎ QUA' : `MUA ${verdict}`} — xác suất ước tính ${estProb}% `
      + `(thị trường ${marketProb}%) — edge ${edge >= 0 ? '+' : ''}${edge} điểm — độ tin cậy: ${confidence}`,
    verdict === 'BỎ QUA'
      ? 'HÀNH ĐỘNG: chưa vào lệnh; chờ giá lệch thêm ≥ 5 điểm hoặc có tin mới.'
      : `HÀNH ĐỘNG: mua ${verdict} trong vùng ${entryLow}-${entryHigh}%, dùng ${positionSize(category.riskLevel)}, chốt lời từng phần ở ${takeProfit}%.`,
    `TÓM TẮT: thị trường đang ${yesPrice >= 50 ? 'nghiêng YES' : 'nghiêng NO'} nhưng thanh khoản/độ lệch giá cho thấy `
      + `${verdict === 'BỎ QUA' ? 'chưa có lợi thế rõ ràng' : `${verdict} mới là bên có giá trị kỳ vọng dương`}.`,
    '',
    '1) Định giá & kỳ vọng',
    `- Giá YES ${impliedYes} là xác suất thị trường chấm; tôi ước tính xác suất thực tế YES ≈ ${estYes}%.`,
    `- Chênh lệch ${edgeYes >= 0 ? '+' : ''}${edgeYes} điểm cho YES, ${edgeNo >= 0 ? '+' : ''}${edgeNo} điểm cho NO.`,
    `- ${verdict === 'BỎ QUA' ? 'Cả hai bên đều không có edge ≥ 3 điểm → đứng ngoài là quyết định tốt nhất.' : `Vào ${verdict} vì đó là bên được trả giá thấp hơn xác suất ước tính.`}`,
    '',
    '2) Dòng tiền',
    `- ${liquidityNote(market.volume || 0, market.liquidity || 0)}.`,
    `- Loại kèo ${category.label}: ${category.risk}.`,
    '',
    '3) Luận điểm ủng hộ',
    `- Giá hiện tại lệch ${Math.abs(edge)} điểm so với ước tính → còn dư địa điều chỉnh.`,
    `- ${sentimentOf(yesPrice)}; khi đám đông nghiêng quá mạnh về một bên, bên còn lại thường được trả giá tốt hơn.`,
    `- Thanh khoản ${formatTokenShort(market.liquidity || 0)} \u{1F4B0} đủ để vào lệnh nhỏ mà không trượt giá nhiều.`,
    '',
    '4) Rủi ro & điều kiện sai',
    `- Giá có thể nhảy mạnh trước giờ đóng; đừng mua đuổi sát hạn (${formatTimeLeft(market.endDate)}).`,
    `- Nếu có tin mới đẩy xác suất YES thực tế ${verdict === 'NO' ? 'vượt' : 'giảm dưới'} ${invalidYes}% thì nhận định này sai, phải thoát.`,
    `- Market nhỏ khó bán lại đúng giá; kết quả do admin xử lý theo nguồn công bố, cần đọc kỹ mô tả.`,
    '',
    '5) Quản trị vốn',
    `- ${riskAdvice(category.riskLevel)}.`,
    `- Chốt lời từng phần khi giá lệch +15 điểm so với giá vào; không dùng toàn bộ số dư cho một kèo.`,
    '',
    extraPrompt ? `Yêu cầu thêm: ${extraPrompt}` : null,
    '',
    '\u{26A0} Nội dung mô phỏng phục vụ demo, không phải lời khuyên đầu tư.',
  ];

  return lines.filter(line => line !== null).join('\n');
}

// Prompt dùng cho lời gọi AI THẬT (src/context/AppContext.jsx).
// Tách ra đây để test được prompt mà không phải render React.
export const ANALYST_SYSTEM_PROMPT =
  'Bạn là chuyên gia phân tích prediction market, trả lời tiếng Việt, thực tế, có số liệu. '
  + 'Bạn luôn kết luận dứt khoát: nghiêng YES hay NO (hoặc bỏ qua), kèm xác suất ước tính, '
  + 'edge so với giá thị trường, mức tin cậy và hành động cụ thể. '
  + 'Không né tránh bằng lời khuyên chung chung; chỉ nêu rủi ro như một phần của phân tích.';

export function buildMarketPrompt(market, extraPrompt = '', today = new Date()) {
  return [
    'Đưa ra nhận định cụ thể cho prediction market dưới đây, bằng tiếng Việt.',
    '',
    `Hôm nay: ${today.toISOString().slice(0, 10)}`,
    `Câu hỏi: ${market.question}`,
    market.description ? `Mô tả / điều kiện thắng: ${market.description}` : null,
    `Giá thị trường: YES ${market.yesPrice}% · NO ${market.noPrice}%`,
    `Volume: ${market.volume} token · Liquidity: ${market.liquidity} token`,
    `Danh mục: ${market.category} · Kết thúc: ${market.endDate}`,
    market.creatorName ? `Người tạo: ${market.creatorName}` : null,
    extraPrompt ? `Yêu cầu thêm của người dùng: ${extraPrompt}` : null,
    '',
    'MỞ ĐẦU BẰNG ĐÚNG 3 DÒNG SAU (không viết gì trước đó):',
    'KẾT LUẬN: <YES hoặc NO hoặc BỎ QUA> — xác suất ước tính của tôi: <X>% (thị trường đang định giá Y%) — edge: <±Z> điểm — độ tin cậy: <cao/trung bình/thấp>',
    'HÀNH ĐỘNG: <mua bên nào, vùng giá vào cụ thể, % số dư token nên dùng, chốt lời ở mức nào, điều kiện cắt lỗ/huỷ kèo>',
    'TÓM TẮT: <một câu nêu lý do chính khiến bạn lệch so với giá thị trường>',
    '',
    'Sau đó phân tích theo 4 mục:',
    '1) Vì sao xác suất thực tế khác giá thị trường: nêu cơ chế/dữ kiện cụ thể, tránh câu chung chung.',
    '2) 3 luận điểm ủng hộ nhận định trên.',
    '3) 3 luận điểm ngược lại + điều kiện nào sẽ khiến nhận định của bạn SAI.',
    '4) Kịch bản theo thời gian: trước hạn điều gì sẽ đẩy giá YES lên/xuống, nên vào lệnh lúc nào.',
    '',
    'Quy tắc bắt buộc:',
    '- Phải chọn YES hoặc NO khi edge ≥ 3 điểm; chỉ chọn BỎ QUA khi giá thị trường đã đúng và không có lợi thế.',
    '- Xác suất phải là con số cụ thể; không dùng "có thể", "tùy thuộc", "hãy cân nhắc" thay cho kết luận.',
    '- Giá trong app tính bằng % xác suất (YES 68% tương đương 0.68) → khi nêu vùng giá vào/chốt lời hãy dùng %.',
    '- Vị thế tối đa mỗi kèo: 5% số dư với kèo thể thao/crypto/chính trị, 10% với các loại còn lại.',
    '- Nêu rõ đây là nhận định từ dữ liệu được cung cấp, không phải cam kết lợi nhuận.',
  ].filter(Boolean).join('\n');
}
