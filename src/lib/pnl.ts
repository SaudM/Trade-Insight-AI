/**
 * 盈亏计算工具函数
 * 提供平均价、已实现盈亏等计算，服务于分批开/平仓的持仓模型。
 */
import type { TradeLeg, Position } from './types';

/**
 * 计算加权平均价格
 * @param legs 成交腿列表（同为入场或同为出场）
 * @returns 加权平均价（若无成交返回undefined）
 */
export function computeWeightedAveragePrice(legs: TradeLeg[]): number | undefined {
  if (!legs?.length) return undefined;
  const totals = legs.reduce((acc, leg) => {
    return { amount: acc.amount + leg.price * leg.quantity, qty: acc.qty + leg.quantity };
  }, { amount: 0, qty: 0 });
  if (totals.qty <= 0) return undefined;
  return Number((totals.amount / totals.qty).toFixed(4));
}

/**
 * 计算某次平仓腿对应的已实现盈亏
 * @param position 目标持仓（含平均入场价或通过入场腿计算）
 * @param exitLeg 出场腿（卖出或买入回补）
 * @param entryAvgPrice 若未在position中存储平均价，可传入当下计算的平均入场价
 * @returns 本次平仓的已实现盈亏（未考虑费用）
 */
export function computeRealizedPnL(position: Position, exitLeg: TradeLeg, entryAvgPrice?: number): number {
  const avgEntry = entryAvgPrice ?? position.avgEntryPrice ?? 0;
  const qty = exitLeg.quantity;
  const price = exitLeg.price;
  // 多头：PnL = (卖出价 - 平均买入价) * 股数
  // 空头：PnL = (平均卖空价 - 买入回补价) * 股数
  const isLong = position.side === 'Long';
  const pnl = isLong ? (price - avgEntry) * qty : (avgEntry - price) * qty;
  return Number(pnl.toFixed(2));
}

/**
 * 汇总持仓的关键指标（数量、平均价、已实现盈亏）
 * @param position 当前持仓
 * @param entries 入场腿列表
 * @param exits 出场腿列表
 * @returns 聚合后的汇总信息
 */
export function summarizePosition(position: Position, entries: TradeLeg[], exits: TradeLeg[]) {
  const totalEntryQty = entries.reduce((acc, l) => acc + l.quantity, 0);
  const totalExitQty = exits.reduce((acc, l) => acc + l.quantity, 0);
  const avgEntryPrice = computeWeightedAveragePrice(entries);
  const avgExitPrice = exits.length ? computeWeightedAveragePrice(exits) : undefined;
  const realizedPnL = exits.reduce((acc, leg) => acc + computeRealizedPnL(position, leg, avgEntryPrice), 0);
  return {
    totalEntryQty,
    totalExitQty,
    avgEntryPrice,
    avgExitPrice,
    realizedPnL: Number(realizedPnL.toFixed(2)),
  };
}