import { buildSpendSummary } from '../../src/utils/spend';
import { MONTHLY_QUOTA } from '../../src/services/aiLogStore';

// Giờ local cố định để bucket ngày không phụ thuộc lúc chạy test.
const NOW = new Date(2026, 4, 15, 12, 0, 0);
const at = (dayOffset, hour = 10) => new Date(2026, 4, 15 - dayOffset, hour).toISOString();

function log(overrides) {
  return {
    id: overrides.id || 'log-1',
    userId: 'u1',
    timestamp: at(0),
    modelId: 'gpt-4o',
    model: 'gpt-4o',
    modelName: 'GPT-4o',
    status: 'success',
    tokens: 100,
    cost: 100,
    ...overrides,
  };
}

describe('buildSpendSummary', () => {
  const logs = [
    log({ id: 'a', cost: 100, tokens: 120 }),
    log({ id: 'b', cost: 50, tokens: 50 }),
    log({ id: 'c', status: 'error', cost: 999, tokens: 999 }),
    log({ id: 'old', timestamp: at(10), cost: 500, tokens: 500 }),
  ];

  it('chỉ tính chi phí của lượt thành công', () => {
    const summary = buildSpendSummary(logs, { now: NOW });
    expect(summary.requests).toBe(4);
    expect(summary.successCount).toBe(3);
    expect(summary.errorCount).toBe(1);
    expect(summary.cost).toBe(650);
    expect(summary.tokens).toBe(670);
  });

  it('tách cửa sổ 7 ngày khỏi chi tiêu cả tháng', () => {
    const summary = buildSpendSummary(logs, { now: NOW });
    expect(summary.total).toBe(150); // 7 ngày gần nhất
    expect(summary.windowRequests).toBe(3);
    expect(summary.monthSpent).toBe(650); // cả tháng 5
    expect(summary.series).toHaveLength(7);
  });

  it('tính successRate, avgPerDay và quota', () => {
    const summary = buildSpendSummary(logs, { now: NOW });
    expect(summary.successRate).toBe(75);
    expect(summary.avgPerDay).toBe(Math.round(150 / 7));
    expect(summary.quota).toBe(MONTHLY_QUOTA);
    expect(summary.quotaLeft).toBe(MONTHLY_QUOTA - 650);
  });

  it('gom chi phí theo model, model tốn nhiều nhất đứng đầu', () => {
    const summary = buildSpendSummary([
      log({ id: 'x', model: 'gpt-4o', modelName: 'GPT-4o', cost: 100 }),
      log({ id: 'y', model: 'claude-3-haiku', modelName: 'Claude 3 Haiku', cost: 30 }),
    ], { now: NOW });
    expect(summary.byModel.map(item => item.modelId)).toEqual(['gpt-4o', 'claude-3-haiku']);
  });

  it('dữ liệu rỗng vẫn trả cấu trúc hợp lệ', () => {
    const summary = buildSpendSummary([], { now: NOW });
    expect(summary.requests).toBe(0);
    expect(summary.successRate).toBe(0);
    expect(summary.total).toBe(0);
    expect(summary.deltaPct).toBeNull();
    expect(summary.series).toHaveLength(7);
  });

  it('không nhận mảng rác', () => {
    expect(buildSpendSummary(null).requests).toBe(0);
  });
});
