"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Search,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

/* ────────────────────────────────────────────────
   Pinterest Design Tokens
──────────────────────────────────────────────── */
const PT = {
    bg:          '#ffffff',
    fog:         '#f6f6f3',   // 替代 ST.surface (#f8f9fb)
    sand:        '#e5e5e0',   // 替代 ST.border (#e5edf5) 用于按钮背景
    warm:        '#e0e0d9',
    heading:     '#211922',   // 替代 ST.heading (#061b31)
    body:        '#62625b',   // 替代 ST.body (#64748d)
    muted:       '#91918c',   // 替代 ST.label (#273951) 次级文字
    border:      '#e5e5e0',   // 替代 ST.border (#e5edf5)
    borderHover: '#bcbcb3',
    red:         '#e60023',   // 替代 ST.purple (#533afd)
    redH:        '#ad081b',   // 替代 ST.purpleH
    redL:        'rgba(230,0,35,0.08)',  // 替代 ST.purpleSub
    dark:        '#33332e',   // 替代 ST.dark
} as const;

const SECTORS_API_BASE = "/api/sectors";

/* ────────────────────────────────────────────────
   Types
──────────────────────────────────────────────── */
interface SectorFlowItem {
  board_code: string;
  board_name: string;
  board_type: string;
  trade_date: string;
  pct_change: number;
  net_amount: number;
  net_amount_rate: number;
  buy_elg_amount: number;
  rank: number;
}

interface TrendItem {
  trade_date: string;
  pct_change: number;
  net_amount: number;
  net_amount_rate: number;
  buy_elg_amount: number;
  rank: number;
}

interface SectorTrend {
  board_code: string;
  board_name: string;
  board_type: string;
  days: number;
  trend: TrendItem[];
}

type BoardTypeFilter = "ALL" | "CONCEPT" | "INDUSTRY";
type SortByOption = "net_amount" | "pct_change" | "rank";

const TRADING_DAY_OPTIONS = [
  { label: 5,  apiDays: 8  },
  { label: 10, apiDays: 15 },
  { label: 20, apiDays: 30 },
  { label: 30, apiDays: 45 },
] as const;

type TradingDayLabel = typeof TRADING_DAY_OPTIONS[number]["label"];

function toApiDays(label: TradingDayLabel): number {
  return TRADING_DAY_OPTIONS.find((o) => o.label === label)!.apiDays;
}

export interface SectorFlowProps {
  jumpToBoardName?: string | null;
  onJumpHandled?: () => void;
}

/* ────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────── */
const upColor   = "#ef4444";
const downColor = "#22c55e";

function toYi(amount: number): string {
  const yi = amount / 1e8;
  return (yi >= 0 ? "+" : "") + yi.toFixed(2) + " 亿";
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MM/dd", { locale: zhCN });
  } catch {
    return dateStr.slice(5, 10);
  }
}

function boardTypeLabel(type: string): string {
  return ({ CONCEPT: "概念", INDUSTRY: "行业" } as Record<string, string>)[type] ?? type;
}

function pctColor(v: number)  { return v > 0 ? upColor  : v < 0 ? downColor : PT.body; }
function flowColor(v: number) { return v > 0 ? upColor  : v < 0 ? downColor : PT.body; }

/* ────────────────────────────────────────────────
   Tooltip (Stripe light)
──────────────────────────────────────────────── */
function TrendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as TrendItem & { dateLabel: string };
  if (!d) return null;
  return (
    <div style={{
      background: PT.bg,
      border: `1px solid ${PT.border}`,
      borderRadius: 16,
      padding: '10px 14px',
      fontSize: 12,
      minWidth: 165,
      
    }}>
      <p style={{ fontWeight: 400, color: PT.heading, borderBottom: `1px solid ${PT.border}`, paddingBottom: 6, marginBottom: 6 }}>
        {d.dateLabel}
      </p>
      {[
        { label: '涨跌幅',   val: `${d.pct_change > 0 ? "+" : ""}${d.pct_change.toFixed(2)}%`,          c: pctColor(d.pct_change) },
        { label: '净流入',   val: toYi(d.net_amount),                                                     c: flowColor(d.net_amount) },
        { label: '主力净额', val: toYi(d.buy_elg_amount),                                                 c: flowColor(d.buy_elg_amount) },
        { label: '净流入率', val: `${d.net_amount_rate > 0 ? "+" : ""}${d.net_amount_rate.toFixed(2)}%`, c: flowColor(d.net_amount_rate) },
        { label: '排名',     val: `#${d.rank}`,                                                           c: PT.muted },
      ].map(({ label, val, c }) => (
        <div key={label} className="flex justify-between gap-4 mt-1.5">
          <span style={{ color: PT.body }}>{label}</span>
          <span style={{ fontWeight: 400, color: c, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Main Component
──────────────────────────────────────────────── */
export function SectorFlow({ jumpToBoardName, onJumpHandled }: SectorFlowProps = {}) {
  const [boardType, setBoardType] = useState<BoardTypeFilter>("ALL");
  const [sortBy, setSortBy]       = useState<SortByOption>("net_amount");
  const [limit, setLimit]         = useState(20);

  const [sectorList, setSectorList]   = useState<SectorFlowItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError]     = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<SectorFlowItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError]     = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearchMode = useMemo(() => searchKeyword.trim().length > 0, [searchKeyword]);

  const [selectedSector, setSelectedSector] = useState<SectorFlowItem | null>(null);
  const [trendDays, setTrendDays]           = useState<TradingDayLabel>(10);
  const [trendData, setTrendData]           = useState<SectorTrend | null>(null);
  const [trendLoading, setTrendLoading]     = useState(false);
  const [trendError, setTrendError]         = useState<string | null>(null);

  /* ── Fetch list ── */
  const fetchSectorList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams({ sort_by: sortBy, limit: String(limit) });
      if (boardType !== "ALL") params.set("board_type", boardType);
      const res  = await fetch(`${SECTORS_API_BASE}/flow?${params.toString()}`);
      if (!res.ok) throw new Error(`接口错误 ${res.status}`);
      const json = await res.json();
      setSectorList(Array.isArray(json) ? json : (json.items ?? json.data ?? []));
      setSelectedSector(null);
      setTrendData(null);
    } catch (e: any) {
      setListError(e.message || "加载失败");
    } finally {
      setListLoading(false);
    }
  }, [boardType, sortBy, limit]);

  useEffect(() => { fetchSectorList(); }, [fetchSectorList]);

  useEffect(() => {
    if (!isSearchMode && sectorList.length > 0) handleSelectSector(sectorList[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorList]);

  /* ── Search ── */
  const fetchSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ keyword: keyword.trim(), limit: "20" });
      const res  = await fetch(`${SECTORS_API_BASE}/search?${params.toString()}`);
      if (!res.ok) throw new Error(`接口错误 ${res.status}`);
      const json = await res.json();
      setSearchResults(Array.isArray(json) ? json : (json.items ?? json.data ?? []));
    } catch (e: any) {
      setSearchError(e.message || "搜索失败");
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => fetchSearch(value), 300);
  };

  const clearSearch = () => {
    setSearchKeyword("");
    setSearchResults([]);
    setSearchError(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  };

  useEffect(() => {
    if (isSearchMode && searchResults.length > 0) handleSelectSector(searchResults[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults]);

  useEffect(() => {
    if (!jumpToBoardName) return;
    setSearchKeyword(jumpToBoardName);
    fetchSearch(jumpToBoardName);
    onJumpHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToBoardName]);

  /* ── Trend ── */
  const fetchTrend = useCallback(async (sector: SectorFlowItem, days: number) => {
    setTrendLoading(true);
    setTrendError(null);
    setTrendData(null);
    try {
      const res  = await fetch(`${SECTORS_API_BASE}/flow/${encodeURIComponent(sector.board_code)}/trend?days=${days}`);
      if (!res.ok) throw new Error(`接口错误 ${res.status}`);
      setTrendData(await res.json());
    } catch (e: any) {
      setTrendError(e.message || "趋势加载失败");
    } finally {
      setTrendLoading(false);
    }
  }, []);

  const handleSelectSector = (sector: SectorFlowItem) => {
    setSelectedSector(sector);
    fetchTrend(sector, toApiDays(trendDays));
  };

  const handleTrendDaysChange = (label: TradingDayLabel) => {
    setTrendDays(label);
    if (selectedSector) fetchTrend(selectedSector, toApiDays(label));
  };

  const chartData = (trendData?.trend ?? []).map((t) => ({
    ...t,
    dateLabel:   formatDate(t.trade_date),
    netAmountYi: +(t.net_amount / 1e8).toFixed(2),
    buyElgYi:    +(t.buy_elg_amount / 1e8).toFixed(2),
  }));

  /* ── List row ── */
  const renderFlowRow = (item: SectorFlowItem) => {
    const isSelected = selectedSector?.board_code === item.board_code;
    const rank   = item.rank ?? "-";
    const netRate = item.net_amount_rate ?? 0;
    const pct    = item.pct_change ?? 0;
    const net    = item.net_amount ?? 0;
    const netYi  = net / 1e8;

    return (
      <div
        key={item.board_code}
        onClick={() => handleSelectSector(item)}
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all"
        style={{
          background:   isSelected ? PT.redL : 'transparent',
          border:       `1px solid ${isSelected ? PT.red : 'transparent'}`,
          borderRadius: 12,
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = PT.fog; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 13, fontWeight: 400, color: PT.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.board_name}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 400,
              padding: '1px 5px', borderRadius: 12,
              background: PT.fog, border: `1px solid ${PT.border}`,
              color: PT.body, flexShrink: 0,
            }}>
              {boardTypeLabel(item.board_type)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span style={{ fontSize: 11, color: PT.body }}>
              #{rank} · 净入率 {netRate > 0 ? "+" : ""}{netRate.toFixed(1)}%
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span style={{ fontSize: 12, fontWeight: 400, color: pctColor(pct), fontVariantNumeric: 'tabular-nums' }}>
                {pct > 0 ? "+" : ""}{pct.toFixed(2)}%
              </span>
              <span style={{ fontSize: 12, fontWeight: 400, color: flowColor(net), fontVariantNumeric: 'tabular-nums' }}>
                {(netYi > 0 ? "+" : "") + netYi.toFixed(1)}亿
              </span>
            </div>
          </div>
        </div>
        <ChevronRight style={{ width: 13, height: 13, color: PT.border, flexShrink: 0 }} />
      </div>
    );
  };

  /* ── Trend panel ── */
  const renderTrendPanel = () => {
    if (!selectedSector) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-20 gap-4">
          <div className="p-4 rounded-full" style={{ background: PT.fog, border: `1px solid ${PT.border}` }}>
            <BarChart3 style={{ width: 26, height: 26, color: PT.body }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 300, color: PT.body }}>点击左侧板块查看资金趋势</p>
        </div>
      );
    }

    const s = selectedSector;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 300, color: PT.heading, letterSpacing: '-0.22px' }}>
              {s.board_name}
            </h3>
            <p style={{ fontSize: 12, fontWeight: 400, color: PT.body, marginTop: 2 }}>
              {boardTypeLabel(s.board_type)} · {s.board_code}
            </p>
          </div>

          {/* Day selector — Stripe style */}
          <div className="flex items-center gap-1.5">
            {TRADING_DAY_OPTIONS.map(({ label }) => (
              <button
                key={label}
                onClick={() => handleTrendDaysChange(label)}
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  padding: '4px 12px',
                  borderRadius: 12,
                  border: `1px solid ${trendDays === label ? PT.red : PT.border}`,
                  background: trendDays === label ? PT.redL : PT.bg,
                  color: trendDays === label ? PT.red : PT.body,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {label}日
              </button>
            ))}
          </div>
        </div>

        {/* Snapshot stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '今日涨跌',  value: `${s.pct_change > 0 ? "+" : ""}${s.pct_change.toFixed(2)}%`,          color: pctColor(s.pct_change) },
            { label: '今日净流入', value: toYi(s.net_amount),                                                   color: flowColor(s.net_amount) },
            { label: '主力净额',  value: toYi(s.buy_elg_amount),                                               color: flowColor(s.buy_elg_amount) },
            { label: '净流入率',  value: `${s.net_amount_rate > 0 ? "+" : ""}${s.net_amount_rate.toFixed(2)}%`, color: flowColor(s.net_amount_rate) },
          ].map((stat) => (
            <div key={stat.label} style={{ background: PT.fog, border: `1px solid ${PT.border}`, borderRadius: 16, padding: '10px 14px' }}>
              <p style={{ fontSize: 11, fontWeight: 400, color: PT.body, marginBottom: 4 }}>{stat.label}</p>
              <p style={{ fontSize: 15, fontWeight: 300, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        {trendLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 style={{ width: 20, height: 20, color: PT.body }} className="animate-spin" />
          </div>
        ) : trendError ? (
          <div className="text-center py-10" style={{ fontSize: 13, color: PT.red }}>{trendError}</div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-10" style={{ fontSize: 13, color: PT.body }}>暂无趋势数据</div>
        ) : (
          <div className="space-y-3">
            {/* Net flow chart */}
            <div style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, padding: '14px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 400, color: PT.body, marginBottom: 10 }}>净流入（亿元）</p>
              <ResponsiveContainer width="100%" height={150}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PT.border} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: PT.body }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: PT.body }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}`} />
                  <ReferenceLine y={0} stroke={PT.border} strokeWidth={1} />
                  <Tooltip content={<TrendTooltip />} />
                  <Bar dataKey="netAmountYi" radius={[3, 3, 0, 0]} maxBarSize={28}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.netAmountYi >= 0 ? upColor : downColor} fillOpacity={0.8} />
                    ))}
                  </Bar>
                  <Line
                    dataKey="buyElgYi"
                    stroke={PT.red}
                    strokeWidth={1.5}
                    dot={{ r: 2, fill: PT.red, strokeWidth: 0 }}
                    strokeDasharray="4 2"
                    name="主力净额"
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-end">
                {[
                  { color: upColor,   label: '净流入', dashed: false },
                  { color: downColor, label: '净流出', dashed: false },
                  { color: PT.red, label: '主力净额', dashed: true },
                ].map(({ color, label, dashed }) => (
                  <div key={label} className="flex items-center gap-1.5" style={{ fontSize: 11, color: PT.body }}>
                    {dashed
                      ? <span style={{ display: 'inline-block', width: 16, borderTop: `2px dashed ${color}` }} />
                      : <span style={{ display: 'inline-block', width: 12, height: 8, borderRadius: 2, background: color }} />
                    }
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Pct change chart */}
            <div style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, padding: '14px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 400, color: PT.body, marginBottom: 10 }}>区间涨跌幅（%）</p>
              <ResponsiveContainer width="100%" height={110}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PT.border} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: PT.body }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: PT.body }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`} />
                  <ReferenceLine y={0} stroke={PT.border} strokeWidth={1} />
                  <Tooltip content={<TrendTooltip />} />
                  <Bar dataKey="pct_change" radius={[3, 3, 0, 0]} maxBarSize={28}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.pct_change >= 0 ? upColor : downColor} fillOpacity={0.75} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Daily table */}
            <div style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${PT.border}` }}>
                <p style={{ fontSize: 12, fontWeight: 400, color: PT.body }}>逐日明细</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: PT.fog }}>
                      {['日期', '涨跌幅', '净流入', '主力净额', '净流入率', '排名'].map((h, i) => (
                        <th
                          key={h}
                          className={i === 0 ? 'text-left' : 'text-right'}
                          style={{ padding: '8px 14px', fontWeight: 400, color: PT.body, borderBottom: `1px solid ${PT.border}` }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...chartData].reverse().map((row, i) => (
                      <tr
                        key={i}
                        style={{ borderTop: `1px solid ${PT.border}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = PT.fog)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '8px 14px', color: PT.muted }}>{row.dateLabel}</td>
                        <td className="text-right" style={{ padding: '8px 14px', fontWeight: 400, color: pctColor(row.pct_change), fontVariantNumeric: 'tabular-nums' }}>
                          {row.pct_change > 0 ? "+" : ""}{row.pct_change.toFixed(2)}%
                        </td>
                        <td className="text-right" style={{ padding: '8px 14px', fontWeight: 400, color: flowColor(row.net_amount), fontVariantNumeric: 'tabular-nums' }}>
                          {toYi(row.net_amount)}
                        </td>
                        <td className="text-right" style={{ padding: '8px 14px', fontWeight: 400, color: flowColor(row.buy_elg_amount), fontVariantNumeric: 'tabular-nums' }}>
                          {toYi(row.buy_elg_amount)}
                        </td>
                        <td className="text-right" style={{ padding: '8px 14px', color: flowColor(row.net_amount_rate), fontVariantNumeric: 'tabular-nums' }}>
                          {row.net_amount_rate > 0 ? "+" : ""}{row.net_amount_rate.toFixed(2)}%
                        </td>
                        <td className="text-right" style={{ padding: '8px 14px', color: PT.body }}>#{row.rank}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ── Main render ── */
  return (
    <div className="flex flex-col gap-3 h-full">

      {/* Filter / Search bar */}
      <div style={{
        background: PT.bg,
        border: `1px solid ${PT.border}`,
        borderRadius: 16,
        padding: '10px 14px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
        
      }}>
        {/* Board type filter */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded"
          style={{
            background: PT.fog,
            border: `1px solid ${PT.border}`,
            opacity: isSearchMode ? 0.4 : 1,
            pointerEvents: isSearchMode ? 'none' : 'auto',
          }}
        >
          {([
            { value: "ALL",      label: "全部" },
            { value: "CONCEPT",  label: "概念" },
            { value: "INDUSTRY", label: "行业" },
          ] as { value: BoardTypeFilter; label: string }[]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBoardType(opt.value)}
              style={{
                fontSize: 13,
                fontWeight: 400,
                padding: '4px 12px',
                borderRadius: 12,
                background: boardType === opt.value ? PT.bg : 'transparent',
                color: boardType === opt.value ? PT.heading : PT.body,
                cursor: 'pointer',
                transition: 'all 150ms',
                border: boardType === opt.value ? `1px solid ${PT.border}` : '1px solid transparent',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort select */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortByOption)} disabled={isSearchMode}>
          <SelectTrigger
            className="h-8 w-32 text-xs"
            style={{
              background: PT.bg,
              border: `1px solid ${PT.border}`,
              color: PT.muted,
              opacity: isSearchMode ? 0.4 : 1,
              borderRadius: 12,
            }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net_amount">按净流入</SelectItem>
            <SelectItem value="pct_change">按涨跌幅</SelectItem>
            <SelectItem value="rank">按排名</SelectItem>
          </SelectContent>
        </Select>

        {/* Limit select */}
        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))} disabled={isSearchMode}>
          <SelectTrigger
            className="h-8 w-24 text-xs"
            style={{
              background: PT.bg,
              border: `1px solid ${PT.border}`,
              color: PT.muted,
              opacity: isSearchMode ? 0.4 : 1,
              borderRadius: 12,
            }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">前 10</SelectItem>
            <SelectItem value="20">前 20</SelectItem>
            <SelectItem value="50">前 50</SelectItem>
          </SelectContent>
        </Select>

        {/* Search + Refresh */}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative flex items-center w-52">
            <Search style={{ position: 'absolute', left: 9, width: 13, height: 13, color: PT.body, pointerEvents: 'none' }} />
            <input
              value={searchKeyword}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="搜索板块，如：无线充电"
              style={{
                width: '100%',
                height: 32,
                paddingLeft: 28,
                paddingRight: searchKeyword ? 28 : 10,
                fontSize: 13,
                fontWeight: 400,
                background: PT.bg,
                border: `1px solid ${PT.border}`,
                borderRadius: 12,
                color: PT.heading,
                outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = PT.red)}
              onBlur={e  => (e.currentTarget.style.borderColor = PT.border)}
            />
            {searchKeyword && (
              <button
                onClick={clearSearch}
                style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: PT.body }}
              >
                <X style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>

          <button
            onClick={fetchSectorList}
            disabled={listLoading || isSearchMode}
            className="flex items-center gap-1.5 transition-colors"
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: PT.body,
              background: 'none',
              border: 'none',
              cursor: isSearchMode || listLoading ? 'not-allowed' : 'pointer',
              opacity: isSearchMode ? 0.4 : 1,
            }}
            onMouseEnter={e => { if (!isSearchMode) e.currentTarget.style.color = PT.red; }}
            onMouseLeave={e => { e.currentTarget.style.color = PT.body; }}
          >
            <RefreshCw style={{ width: 13, height: 13 }} className={listLoading ? "animate-spin" : ""} />
            刷新
          </button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Left list */}
        <div
          className="w-72 shrink-0 flex flex-col overflow-hidden"
          style={{
            background: PT.bg,
            border: `1px solid ${PT.border}`,
            borderRadius: 16,
            
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: `1px solid ${PT.border}`,
            fontSize: 11,
            fontWeight: 400,
            color: PT.body,
            background: PT.fog,
          }}>
            {isSearchMode ? <span>搜索结果</span> : <><span>板块名称</span><span>涨跌幅 / 净流入</span></>}
          </div>

          {isSearchMode ? (
            searchLoading ? (
              <div className="flex justify-center items-center flex-1 py-16">
                <Loader2 style={{ width: 18, height: 18, color: PT.body }} className="animate-spin" />
              </div>
            ) : searchError ? (
              <div className="flex justify-center items-center flex-1 py-10">
                <p style={{ fontSize: 13, color: PT.red }}>{searchError}</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-10 gap-2">
                <Search style={{ width: 20, height: 20, color: PT.border }} />
                <p style={{ fontSize: 13, color: PT.body }}>未找到匹配的板块</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {searchResults.map(renderFlowRow)}
              </div>
            )
          ) : (
            listLoading ? (
              <div className="flex justify-center items-center flex-1 py-16">
                <Loader2 style={{ width: 20, height: 20, color: PT.body }} className="animate-spin" />
              </div>
            ) : listError ? (
              <div className="flex flex-col items-center justify-center flex-1 py-10 gap-3">
                <p style={{ fontSize: 13, color: PT.red }}>{listError}</p>
                <button
                  onClick={fetchSectorList}
                  style={{ fontSize: 12, color: PT.red, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  重试
                </button>
              </div>
            ) : sectorList.length === 0 ? (
              <div className="flex justify-center items-center flex-1 py-10">
                <p style={{ fontSize: 13, color: PT.body }}>暂无数据</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {sectorList.map(renderFlowRow)}
              </div>
            )
          )}
        </div>

        {/* Right trend detail */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            background: PT.bg,
            border: `1px solid ${PT.border}`,
            borderRadius: 16,
            padding: 16,
            
          }}
        >
          {renderTrendPanel()}
        </div>
      </div>
    </div>
  );
}
