// utils/aiCost.js — Tính token phải trả theo đúng usage của API
//
// Trước đây mỗi model có "giá" cố định (model.tokenCost). Nay app trừ token
// theo số liệu nhà cung cấp AI trả về trong `usage.total_tokens`
// (prompt + completion, gồm cả token "thinking" của các model mới).
// Nếu gateway không trả usage thì ước lượng 1 token ≈ 4 ký tự.

// Số dư tối thiểu để bắt đầu 1 lần gọi (vì chưa biết trước chi phí thật)
export const MIN_AI_CALL_BALANCE = 10;

export function estimateTokens(text) {
  const value = String(text || '');
  if (!value) return 0;
  return Math.max(1, Math.ceil(value.length / 4));
}

// Ghép nội dung các message thành text để ước lượng khi thiếu usage
export function messagesText(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map(m => (m && typeof m.content === 'string' ? m.content : ''))
    .join('\n');
}

// Số token thực sự trừ khỏi ví: không âm, không vượt quá số dư hiện có.
// (Ví không đủ → trừ tối đa bằng số dư, tránh số dư âm.)
export function chargeTokens(balance, cost) {
  const available = Math.max(0, Math.round(Number(balance) || 0));
  const price = Math.max(0, Math.round(Number(cost) || 0));
  return Math.min(price, available);
}

// Token thực tế phải trả cho 1 lần gọi AI
// - Ưu tiên usage.total_tokens do API trả về
// - Fallback: ước lượng theo prompt + câu trả lời
export function costFromUsage({ usage, prompt, reply, messages } = {}) {
  const total = Number(usage && usage.total_tokens);
  if (Number.isFinite(total) && total > 0) return Math.round(total);

  const promptText = prompt === undefined ? messagesText(messages) : String(prompt || '');
  const estimated = estimateTokens(promptText) + estimateTokens(reply);
  return Math.max(1, estimated);
}
