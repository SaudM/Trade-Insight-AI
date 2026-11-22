/**
 * 转发给 Analyzer 之前，把分页类参数夹到合理范围内。
 *
 * 2026-11-19 的 limit=999999999 请求把 Analyzer 打挂了三天，攻击日志里还出现过
 * limit=-1、limit=0、page=-1、page_size=-1。这里不信任任何来自浏览器的数值：
 * 非整数一律用默认值，越界一律夹到边界。
 */
export interface IntBounds {
  min: number;
  max: number;
  fallback: number;
}

export function clampInt(raw: string | null | undefined, bounds: IntBounds): number {
  if (raw === null || raw === undefined || raw.trim() === '') return bounds.fallback;
  if (!/^-?\d+$/.test(raw.trim())) return bounds.fallback;
  const n = Number(raw.trim());
  if (!Number.isSafeInteger(n)) return n > 0 ? bounds.max : bounds.min;
  return Math.min(bounds.max, Math.max(bounds.min, n));
}

/**
 * 各接口的上下限，和 Analyzer 端的 Query(ge=, le=) 保持一致或更严。
 */
export const QueryBounds = {
  /** Analyzer /recommendations/：1~500，默认 100 */
  recommendationsLimit: { min: 1, max: 500, fallback: 100 },
  /** Analyzer /api/v1/analysis/heatmap：1~200，默认 50 */
  heatmapLimit: { min: 1, max: 200, fallback: 50 },
  /** Analyzer /strategies/{key}/trades：page 1~10000 */
  tradesPage: { min: 1, max: 10000, fallback: 1 },
  /** Analyzer /strategies/{key}/trades：page_size 1~100，默认 20 */
  tradesPageSize: { min: 1, max: 100, fallback: 20 },
  /** Analyzer /api/v1/sectors/flow：1~100，默认 20 */
  sectorFlowLimit: { min: 1, max: 100, fallback: 20 },
  /**
   * 板块搜索：Analyzer 允许 1~100，但 Insight 会对每条结果再发一次 trend 请求，
   * 上限收紧到 50，避免一次请求放大成 100 次后端调用。前端固定传 20。
   */
  sectorSearchLimit: { min: 1, max: 50, fallback: 20 },
  /** Analyzer /api/v1/sectors/flow/{code}/trend：days 5~120，前端默认 10，夹到 5 以上 */
  sectorTrendDays: { min: 5, max: 120, fallback: 10 },
} satisfies Record<string, IntBounds>;

/** 只允许已知的周期值，其余回落到默认值，避免把任意字符串拼进后端 URL */
const PERIODS = new Set(['all', 'ytd', '3y', '1y', '6m', '3m', '1m']);

export function sanitizePeriod(raw: string | null, fallback: string): string {
  return raw && PERIODS.has(raw) ? raw : fallback;
}
