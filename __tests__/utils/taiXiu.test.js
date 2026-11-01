import {
  MIN_STAKE,
  SIDES,
  SIDE_LABELS,
  getStakePayouts,
  rollDice,
  totalOf,
  isTriple,
  evaluateTaiXiu,
  settleTaiXiu,
  maxStakeForBalance,
  getValidStake,
} from '../../src/utils/taiXiu';

describe('rollDice', () => {
  it('luôn trả 3 mặt trong khoảng 1..6', () => {
    for (let i = 0; i < 200; i += 1) {
      const dice = rollDice();
      expect(dice).toHaveLength(3);
      dice.forEach(value => {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      });
    }
  });

  it('nhận rng bơm vào để test tất định', () => {
    expect(rollDice(() => 0)).toEqual([1, 1, 1]);
    expect(rollDice(() => 0.999)).toEqual([6, 6, 6]);
  });
});

describe('evaluateTaiXiu', () => {
  it('tổng 4..10 là Xỉu, 11..17 là Tài', () => {
    expect(evaluateTaiXiu([1, 1, 2], SIDES.XIU)).toMatchObject({ total: 4, outcome: 'XIU', win: true });
    expect(evaluateTaiXiu([5, 5, 6], SIDES.TAI)).toMatchObject({ total: 16, outcome: 'TAI', win: true });
    expect(evaluateTaiXiu([5, 5, 6], SIDES.XIU).win).toBe(false);
  });

  it('bộ ba thắng bất kể cửa đã chọn', () => {
    expect(isTriple([3, 3, 3])).toBe(true);
    expect(evaluateTaiXiu([3, 3, 3], SIDES.XIU)).toMatchObject({ triple: true, win: true });
    expect(evaluateTaiXiu([3, 3, 3], SIDES.TAI).win).toBe(true);
  });

  it('tính tổng đúng', () => {
    expect(totalOf([1, 2, 3])).toBe(6);
  });
});

describe('getStakePayouts', () => {
  it('thắng cửa = 0,96× cược', () => {
    expect(getStakePayouts(100).sideWin).toBe(96);
    expect(getStakePayouts(1000).sideWin).toBe(960);
  });

  it('bộ ba = 2× cược', () => {
    expect(getStakePayouts(100).tripleWin).toBe(200);
  });

  it('cược không hợp lệ trả 0', () => {
    expect(getStakePayouts(-100)).toMatchObject({ sideWin: 0, tripleWin: 0 });
    expect(getStakePayouts(1.5)).toMatchObject({ sideWin: 0, tripleWin: 0 });
  });
});

describe('settleTaiXiu', () => {
  it('thắng cửa nhận lãi ròng 0,96× cược', () => {
    expect(settleTaiXiu([5, 5, 6], SIDES.TAI, 100)).toMatchObject({
      total: 16,
      win: true,
      triple: false,
      stake: 100,
      net: 96,
    });
  });

  it('thua cửa mất đúng tiền cược', () => {
    expect(settleTaiXiu([1, 1, 2], SIDES.TAI, 100)).toMatchObject({ net: -100 });
  });

  it('bộ ba nhận 2× cược', () => {
    expect(settleTaiXiu([4, 4, 4], SIDES.XIU, 100)).toMatchObject({ triple: true, net: 200 });
  });
});

describe('maxStakeForBalance / getValidStake', () => {
  it('chặn cược dưới mức tối thiểu', () => {
    expect(getValidStake(MIN_STAKE - 1, 10000)).toBe(0);
    expect(getValidStake(MIN_STAKE, 10000)).toBe(MIN_STAKE);
  });

  it('chặn cược vượt số dư', () => {
    expect(getValidStake(10000, 9999)).toBe(0);
    expect(maxStakeForBalance(500)).toBe(500);
  });

  it('chặn số dư/cược không phải số nguyên', () => {
    expect(getValidStake(100.5, 10000)).toBe(0);
    expect(maxStakeForBalance(99.5)).toBe(0);
    expect(maxStakeForBalance(MIN_STAKE - 1)).toBe(0);
  });
});

describe('nhãn hiển thị', () => {
  it('có nhãn tiếng Việt cho cả 2 cửa', () => {
    expect(SIDE_LABELS[SIDES.TAI]).toBe('Tài');
    expect(SIDE_LABELS[SIDES.XIU]).toBe('Xỉu');
  });
});
