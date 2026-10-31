// utils/spend.js — Chi tiêu AI cho Home (card "Chi tiêu 7 ngày") và hạn mức tháng.
//
// Nguồn dữ liệu DUY NHẤT là store log gọi AI (services/aiLogStore.js), không
// đọc transaction nữa — nhờ vậy Home, Logs, Usage và Profile luôn khớp nhau.
import { summarizeAILogs } from '../services/aiLogStore';

export { MONTHLY_QUOTA } from '../services/aiLogStore';

/**
 * Tổng hợp chi tiêu AI trong `days` ngày gần nhất từ log gọi AI.
 * Giữ nguyên tên hàm cũ để các màn đang dùng không phải đổi import.
 *
 * @param {object[]} logs log AI của user hiện tại (state.aiLogs đã lọc theo uid)
 * @returns {ReturnType<typeof summarizeAILogs>}
 */
export function buildSpendSummary(logs = [], options = {}) {
  return summarizeAILogs(logs, options);
}
