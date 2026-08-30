import type { TradeLog } from '@/lib/types';
import {
  parseTradeResult,
  selectClosedTrades,
  scopeLogsToReport,
  computeReportMetrics,
  formatCNY,
} from '@/lib/trade-metrics';

/** 构造最小可用的 TradeLog（仅填指标计算关心的字段，其余给安全默认）。 */
function makeLog(partial: Partial<TradeLog>): TradeLog {
  return {
    id: Math.random().toString(36).slice(2),
    userId: 'u1',
    tradeTime: '2024-03-10T10:00:00Z',
    symbol: 'AAPL',
    direction: 'Sell',
    positionSize: '100',
    tradeResult: '0',
    mindsetState: '',
    lessonsLearned: '',
    createdAt: new Date('2024-03-10T10:00:00Z'),
    ...partial,
  } as TradeLog;
}

describe('parseTradeResult', () => {
  it('解析数字字符串', () => {
    expect(parseTradeResult('123.5')).toBe(123.5);
    expect(parseTradeResult('-88')).toBe(-88);
    expect(parseTradeResult('  42  ')).toBe(42);
  });
  it('直接接受数字', () => {
    expect(parseTradeResult(50)).toBe(50);
  });
  it('无法解析或空值归零', () => {
    expect(parseTradeResult('abc')).toBe(0);
    expect(parseTradeResult('')).toBe(0);
    expect(parseTradeResult(null)).toBe(0);
    expect(parseTradeResult(undefined)).toBe(0);
    expect(parseTradeResult(NaN)).toBe(0);
  });
});

describe('selectClosedTrades', () => {
  it('仅保留 Sell / Close，排除开仓腿', () => {
    const logs = [
      makeLog({ direction: 'Buy', tradeResult: '0' }),
      makeLog({ direction: 'Long', tradeResult: '0' }),
      makeLog({ direction: 'Short', tradeResult: '0' }),
      makeLog({ direction: 'Sell', tradeResult: '100' }),
      makeLog({ direction: 'Close', tradeResult: '-50' }),
    ];
    const closed = selectClosedTrades(logs);
    expect(closed).toHaveLength(2);
    expect(closed.every(l => l.direction === 'Sell' || l.direction === 'Close')).toBe(true);
  });
  it('非数组安全返回空', () => {
    expect(selectClosedTrades(null)).toEqual([]);
    expect(selectClosedTrades(undefined)).toEqual([]);
  });
});

describe('scopeLogsToReport', () => {
  it('日报：过滤到 date 当天（本地日边界）', () => {
    const report: any = { date: new Date(2024, 2, 10, 12, 0, 0) }; // 本地 3/10 中午
    const logs = [
      makeLog({ tradeTime: new Date(2024, 2, 10, 9, 0, 0) }),   // 当天 ✓
      makeLog({ tradeTime: new Date(2024, 2, 10, 20, 0, 0) }),  // 当天 ✓
      makeLog({ tradeTime: new Date(2024, 2, 11, 1, 0, 0) }),   // 次日 ✗
      makeLog({ tradeTime: new Date(2024, 2, 9, 23, 0, 0) }),   // 前一天 ✗
    ];
    expect(scopeLogsToReport(logs, report)).toHaveLength(2);
  });

  it('周报：startDate ~ endDate 闭区间', () => {
    const report: any = {
      startDate: new Date(2024, 2, 4, 0, 0, 0),
      endDate: new Date(2024, 2, 10, 23, 59, 59),
    };
    const logs = [
      makeLog({ tradeTime: new Date(2024, 2, 4, 0, 0, 0) }),   // 边界起 ✓
      makeLog({ tradeTime: new Date(2024, 2, 7, 12, 0, 0) }),  // 区间内 ✓
      makeLog({ tradeTime: new Date(2024, 2, 11, 0, 0, 1) }),  // 区间后 ✗
    ];
    expect(scopeLogsToReport(logs, report)).toHaveLength(2);
  });

  it('月报：monthStartDate ~ monthEndDate 闭区间', () => {
    const report: any = {
      monthStartDate: new Date(2024, 2, 1, 0, 0, 0),
      monthEndDate: new Date(2024, 2, 31, 23, 59, 59),
    };
    const logs = [
      makeLog({ tradeTime: new Date(2024, 2, 1, 0, 0, 0) }),   // ✓
      makeLog({ tradeTime: new Date(2024, 2, 20, 0, 0, 0) }),  // ✓
      makeLog({ tradeTime: new Date(2024, 3, 1, 0, 0, 0) }),   // 4/1 ✗
    ];
    expect(scopeLogsToReport(logs, report)).toHaveLength(2);
  });

  it('无报告或无周期字段：原样返回', () => {
    const logs = [makeLog({}), makeLog({})];
    expect(scopeLogsToReport(logs, null)).toHaveLength(2);
    expect(scopeLogsToReport(logs, {} as any)).toHaveLength(2);
  });
});

describe('computeReportMetrics', () => {
  it('空输入返回全零安全对象', () => {
    const m = computeReportMetrics([]);
    expect(m.totalTrades).toBe(0);
    expect(m.wins).toBe(0);
    expect(m.losses).toBe(0);
    expect(m.winRate).toBe(0);
    expect(m.netPL).toBe(0);
    expect(m.profitFactor).toBe(0);
    expect(m.expectancy).toBe(0);
    expect(m.bySymbol).toEqual([]);
    expect(m.equityCurve).toEqual([]);
  });

  it('全盈：胜率 100%，无亏损时盈亏比记 0（视为"暂无"）', () => {
    const logs = [
      makeLog({ tradeResult: '100' }),
      makeLog({ tradeResult: '200' }),
    ];
    const m = computeReportMetrics(logs);
    expect(m.totalTrades).toBe(2);
    expect(m.wins).toBe(2);
    expect(m.losses).toBe(0);
    expect(m.winRate).toBe(100);
    expect(m.netPL).toBe(300);
    expect(m.grossProfit).toBe(300);
    expect(m.grossLoss).toBe(0);
    expect(m.avgProfit).toBe(150);
    expect(m.profitFactor).toBe(0);
    expect(m.expectancy).toBe(150);
    expect(m.maxWinStreak).toBe(2);
  });

  it('全亏：胜率 0%，grossLoss 为正', () => {
    const logs = [
      makeLog({ tradeResult: '-100' }),
      makeLog({ tradeResult: '-40' }),
    ];
    const m = computeReportMetrics(logs);
    expect(m.wins).toBe(0);
    expect(m.losses).toBe(2);
    expect(m.winRate).toBe(0);
    expect(m.netPL).toBe(-140);
    expect(m.grossLoss).toBe(140);
    expect(m.avgLoss).toBe(70);
    expect(m.maxLossStreak).toBe(2);
    expect(m.worstTrade).toBe(-100);
  });

  it('混合含平局：胜率分母含平局，盈亏比/期望值正确', () => {
    // pl: +100, -50, 0 → wins1 losses1 breakeven1, net50
    const logs = [
      makeLog({ tradeResult: '100' }),
      makeLog({ tradeResult: '-50' }),
      makeLog({ tradeResult: '0' }),
    ];
    const m = computeReportMetrics(logs);
    expect(m.totalTrades).toBe(3);
    expect(m.wins).toBe(1);
    expect(m.losses).toBe(1);
    expect(m.breakeven).toBe(1);
    expect(m.winRate).toBeCloseTo(33.333, 2);
    expect(m.netPL).toBe(50);
    expect(m.profitFactor).toBeCloseTo(2, 5); // 100 / 50
    expect(m.expectancy).toBeCloseTo(50 / 3, 5);
    expect(m.bestTrade).toBe(100);
    expect(m.worstTrade).toBe(-50);
  });

  it('连胜/连亏取最大值', () => {
    // +,+,-,-,-,+ → maxWin 2, maxLoss 3
    const seq = ['10', '10', '-10', '-10', '-10', '10'];
    const logs = seq.map((r, i) =>
      makeLog({ tradeResult: r, tradeTime: new Date(2024, 2, 10, 9 + i, 0, 0) }),
    );
    const m = computeReportMetrics(logs);
    expect(m.maxWinStreak).toBe(2);
    expect(m.maxLossStreak).toBe(3);
  });

  it('bySymbol 按 |pl| 降序聚合', () => {
    const logs = [
      makeLog({ symbol: 'AAA', tradeResult: '30' }),
      makeLog({ symbol: 'BBB', tradeResult: '-200' }),
      makeLog({ symbol: 'AAA', tradeResult: '20' }),  // AAA 合计 50
      makeLog({ symbol: 'CCC', tradeResult: '100' }),
    ];
    const m = computeReportMetrics(logs);
    expect(m.bySymbol.map(s => s.symbol)).toEqual(['BBB', 'CCC', 'AAA']); // |200| > |100| > |50|
    expect(m.bySymbol.find(s => s.symbol === 'AAA')).toMatchObject({ pl: 50, trades: 2 });
  });

  it('equityCurve 为逐笔累计（按时间升序）', () => {
    const logs = [
      makeLog({ tradeResult: '100', tradeTime: new Date(2024, 2, 10, 9, 0, 0) }),
      makeLog({ tradeResult: '-30', tradeTime: new Date(2024, 2, 10, 10, 0, 0) }),
      makeLog({ tradeResult: '50', tradeTime: new Date(2024, 2, 10, 11, 0, 0) }),
    ];
    const m = computeReportMetrics(logs);
    expect(m.equityCurve).toEqual([
      { tradeNumber: 1, cumulativePL: 100 },
      { tradeNumber: 2, cumulativePL: 70 },
      { tradeNumber: 3, cumulativePL: 120 },
    ]);
  });

  it('端到端：selectClosedTrades 排除 "0" 开仓腿后再计算，不膨胀交易数', () => {
    const raw = [
      makeLog({ direction: 'Buy', tradeResult: '0' }),   // 开仓腿，应被排除
      makeLog({ direction: 'Buy', tradeResult: '0' }),   // 开仓腿，应被排除
      makeLog({ direction: 'Sell', tradeResult: '100' }),
      makeLog({ direction: 'Close', tradeResult: '-40' }),
    ];
    const m = computeReportMetrics(selectClosedTrades(raw));
    expect(m.totalTrades).toBe(2);          // 而非 4
    expect(m.winRate).toBe(50);             // 1/2，未被开仓腿稀释
    expect(m.netPL).toBe(60);
  });
});

describe('formatCNY', () => {
  it('默认无符号，带 ¥', () => {
    expect(formatCNY(500)).toBe('¥500');
    expect(formatCNY(0)).toBe('¥0');
  });
  it('负数始终带 -', () => {
    expect(formatCNY(-500)).toBe('-¥500');
    expect(formatCNY(-500, { sign: true })).toBe('-¥500');
  });
  it('sign=true 时正数带 +', () => {
    expect(formatCNY(500, { sign: true })).toBe('+¥500');
  });
});
