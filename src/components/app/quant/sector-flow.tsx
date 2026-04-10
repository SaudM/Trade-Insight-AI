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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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

const SECTORS_API_BASE = "/api/sectors";

// ── 类型定义 ─────────────────────────────────────────────────
interface SectorFlowItem {
  board_code: string;
  board_name: string;
  board_type: string;
  trade_date: string;
  pct_change: number;
  net_amount: number;
  net_amount_rate: number;
  buy_elg_amount: number;
  buy_elg_rate?: number;
  buy_lg_amount?: number;
  buy_lg_rate?: number;
  buy_md_amount?: number;
  buy_sm_amount?: number;
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

/**
 * 用户选择的"交易日数" → 实际请求的自然日数映射
 * 每5个交易日约需7个自然日（含周末），再加节假日缓冲
 */
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
  /** 外部跳转：传入板块名称，自动搜索并选中 */
  jumpToBoardName?: string | null;
  /** 跳转处理完成后的回调，用于重置外部状态 */
  onJumpHandled?: () => void;
}

// ── 工具函数 ─────────────────────────────────────────────────
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
  const map: Record<string, string> = { CONCEPT: "概念", INDUSTRY: "行业" };
  return map[type] ?? type;
}

const upColor = "#ef4444";
const downColor = "#22c55e";
const flowInColor = "#ef4444";
const flowOutColor = "#22c55e";

function pctColor(v: number) {
  return v > 0 ? upColor : v < 0 ? downColor : "#94a3b8";
}
function flowColor(v: number) {
  return v > 0 ? flowInColor : v < 0 ? flowOutColor : "#94a3b8";
}

// ── 自定义 Tooltip ────────────────────────────────────────────
function TrendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as TrendItem & { dateLabel: string };
  if (!d) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-slate-700 border-b pb-1 mb-1">{d.dateLabel}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">涨跌幅</span>
        <span style={{ color: pctColor(d.pct_change) }} className="font-medium">
          {d.pct_change > 0 ? "+" : ""}{d.pct_change.toFixed(2)}%
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">净流入</span>
        <span style={{ color: flowColor(d.net_amount) }} className="font-medium">
          {toYi(d.net_amount)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">主力净额</span>
        <span style={{ color: flowColor(d.buy_elg_amount) }} className="font-medium">
          {toYi(d.buy_elg_amount)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">净流入率</span>
        <span style={{ color: flowColor(d.net_amount_rate) }} className="font-medium">
          {d.net_amount_rate > 0 ? "+" : ""}{d.net_amount_rate.toFixed(2)}%
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">排名</span>
        <span className="font-medium text-slate-700">#{d.rank}</span>
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────
export function SectorFlow({ jumpToBoardName, onJumpHandled }: SectorFlowProps = {}) {
  // 列表过滤参数
  const [boardType, setBoardType] = useState<BoardTypeFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortByOption>("net_amount");
  const [limit, setLimit] = useState(20);

  // 普通列表数据
  const [sectorList, setSectorList] = useState<SectorFlowItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // 搜索状态（结果已由代理层补充流入数据，与列表结构一致）
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<SectorFlowItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearchMode = useMemo(() => searchKeyword.trim().length > 0, [searchKeyword]);

  // 选中板块 & 趋势
  const [selectedSector, setSelectedSector] = useState<SectorFlowItem | null>(null);
  const [trendDays, setTrendDays] = useState<TradingDayLabel>(10);
  const [trendData, setTrendData] = useState<SectorTrend | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);

  // ── 获取板块列表 ──────────────────────────────────────────
  const fetchSectorList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams({ sort_by: sortBy, limit: String(limit) });
      if (boardType !== "ALL") params.set("board_type", boardType);
      const res = await fetch(`${SECTORS_API_BASE}/flow?${params.toString()}`);
      if (!res.ok) throw new Error(`接口错误 ${res.status}`);
      const json = await res.json();
      const items: SectorFlowItem[] = Array.isArray(json)
        ? json
        : (json.items ?? json.data ?? []);
      setSectorList(items);
      setSelectedSector(null);
      setTrendData(null);
    } catch (e: any) {
      setListError(e.message || "加载失败");
    } finally {
      setListLoading(false);
    }
  }, [boardType, sortBy, limit]);

  useEffect(() => {
    fetchSectorList();
  }, [fetchSectorList]);

  // 默认列表变化时，始终选中第一条（length > 0）
  useEffect(() => {
    if (!isSearchMode && sectorList.length > 0) {
      handleSelectSector(sectorList[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorList]);

  // ── 搜索接口 ──────────────────────────────────────────────
  const fetchSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ keyword: keyword.trim(), limit: "20" });
      const res = await fetch(`${SECTORS_API_BASE}/search?${params.toString()}`);
      if (!res.ok) throw new Error(`接口错误 ${res.status}`);
      const json = await res.json();
      const items: SectorFlowItem[] = Array.isArray(json)
        ? json
        : (json.items ?? json.data ?? []);
      setSearchResults(items);
    } catch (e: any) {
      setSearchError(e.message || "搜索失败");
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // 搜索防抖 300ms
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

  // 搜索结果变化时，始终选中第一条（length > 0）
  useEffect(() => {
    if (isSearchMode && searchResults.length > 0) {
      handleSelectSector(searchResults[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults]);

  // ── 外部跳转：jumpToBoardName ─────────────────────────────
  useEffect(() => {
    if (!jumpToBoardName) return;
    setSearchKeyword(jumpToBoardName);
    fetchSearch(jumpToBoardName);
    onJumpHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToBoardName]);

  // ── 获取趋势数据 ──────────────────────────────────────────
  const fetchTrend = useCallback(async (sector: SectorFlowItem, days: number) => {
    setTrendLoading(true);
    setTrendError(null);
    setTrendData(null);
    try {
      const res = await fetch(
        `${SECTORS_API_BASE}/flow/${encodeURIComponent(sector.board_code)}/trend?days=${days}`
      );
      if (!res.ok) throw new Error(`接口错误 ${res.status}`);
      const json: SectorTrend = await res.json();
      setTrendData(json);
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

  // ── 图表数据 ──────────────────────────────────────────────
  const chartData = (trendData?.trend ?? []).map((t) => ({
    ...t,
    dateLabel: formatDate(t.trade_date),
    netAmountYi: +(t.net_amount / 1e8).toFixed(2),
    buyElgYi: +(t.buy_elg_amount / 1e8).toFixed(2),
  }));

  // ── 渲染：列表行（含资金流快照）────────────────────────────
  const renderFlowRow = (item: SectorFlowItem) => {
    const isSelected = selectedSector?.board_code === item.board_code;
    // 搜索结果 trend 补全失败时字段可能为 undefined，给安全默认值
    const rank = item.rank ?? "-";
    const netRate = item.net_amount_rate ?? 0;
    const pct = item.pct_change ?? 0;
    const net = item.net_amount ?? 0;
    const netYi = net / 1e8;
    return (
      <div
        key={item.board_code}
        onClick={() => handleSelectSector(item)}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-slate-100 ${
          isSelected ? "bg-blue-50 border border-blue-200" : "border border-transparent"
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-slate-800 truncate">{item.board_name}</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0 text-slate-500 border-slate-300">
              {boardTypeLabel(item.board_type)}
            </Badge>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[11px] text-slate-400">
              #{rank} · 净入率 {netRate > 0 ? "+" : ""}{netRate.toFixed(1)}%
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold tabular-nums" style={{ color: pctColor(pct) }}>
                {pct > 0 ? "+" : ""}{pct.toFixed(2)}%
              </span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: flowColor(net) }}>
                {(netYi > 0 ? "+" : "") + netYi.toFixed(1)}亿
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
      </div>
    );
  };

  // ── 渲染：趋势面板 ────────────────────────────────────────
  const renderTrendPanel = () => {
    if (!selectedSector) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-20 space-y-3">
          <div className="bg-slate-100 p-4 rounded-full">
            <BarChart3 className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">点击左侧板块查看资金趋势</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* 面板标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 text-base">{selectedSector.board_name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {boardTypeLabel(selectedSector.board_type)} · {selectedSector.board_code}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {TRADING_DAY_OPTIONS.map(({ label }) => (
              <button
                key={label}
                onClick={() => handleTrendDaysChange(label)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  trendDays === label ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}日
              </button>
            ))}
          </div>
        </div>

        {/* 今日快照 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "今日涨跌",
              value: `${selectedSector.pct_change > 0 ? "+" : ""}${selectedSector.pct_change.toFixed(2)}%`,
              color: pctColor(selectedSector.pct_change),
            },
            {
              label: "今日净流入",
              value: toYi(selectedSector.net_amount),
              color: flowColor(selectedSector.net_amount),
            },
            {
              label: "主力净额",
              value: toYi(selectedSector.buy_elg_amount),
              color: flowColor(selectedSector.buy_elg_amount),
            },
            {
              label: "净流入率",
              value: `${selectedSector.net_amount_rate > 0 ? "+" : ""}${selectedSector.net_amount_rate.toFixed(2)}%`,
              color: flowColor(selectedSector.net_amount_rate),
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[11px] text-slate-400 mb-1">{stat.label}</p>
              <p className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* 趋势图表 */}
        {trendLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : trendError ? (
          <div className="text-center py-10 text-sm text-red-500">{trendError}</div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">暂无趋势数据</div>
        ) : (
          <div className="space-y-4">
            {/* 净流入柱状图 */}
            <div className="bg-white border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500 mb-3">净流入（亿元）</p>
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}`} />
                  <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1} />
                  <Tooltip content={<TrendTooltip />} />
                  <Bar dataKey="netAmountYi" radius={[3, 3, 0, 0]} maxBarSize={32}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.netAmountYi >= 0 ? flowInColor : flowOutColor} fillOpacity={0.85} />
                    ))}
                  </Bar>
                  <Line dataKey="buyElgYi" stroke="#6366f1" strokeWidth={1.5} dot={{ r: 2.5, fill: "#6366f1", strokeWidth: 0 }} strokeDasharray="4 2" name="主力净额" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-end">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="inline-block w-3 h-2 rounded-sm bg-red-400" />净流入
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="inline-block w-3 h-2 rounded-sm bg-green-400" />净流出
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="inline-block w-4 border-t-2 border-dashed border-indigo-400" />主力净额
                </div>
              </div>
            </div>

            {/* 涨跌幅柱状图 */}
            <div className="bg-white border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500 mb-3">区间涨跌幅（%）</p>
              <ResponsiveContainer width="100%" height={120}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`} />
                  <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1} />
                  <Tooltip content={<TrendTooltip />} />
                  <Bar dataKey="pct_change" radius={[3, 3, 0, 0]} maxBarSize={32}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.pct_change >= 0 ? upColor : downColor} fillOpacity={0.75} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* 明细表 */}
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-50">
                <p className="text-xs font-medium text-slate-500">逐日明细</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400">
                      <th className="text-left px-4 py-2 font-medium">日期</th>
                      <th className="text-right px-3 py-2 font-medium">涨跌幅</th>
                      <th className="text-right px-3 py-2 font-medium">净流入</th>
                      <th className="text-right px-3 py-2 font-medium">主力净额</th>
                      <th className="text-right px-3 py-2 font-medium">净流入率</th>
                      <th className="text-right px-4 py-2 font-medium">排名</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...chartData].reverse().map((row, i) => (
                      <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-2 text-slate-600">{row.dateLabel}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums" style={{ color: pctColor(row.pct_change) }}>
                          {row.pct_change > 0 ? "+" : ""}{row.pct_change.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums" style={{ color: flowColor(row.net_amount) }}>
                          {toYi(row.net_amount)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums" style={{ color: flowColor(row.buy_elg_amount) }}>
                          {toYi(row.buy_elg_amount)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums" style={{ color: flowColor(row.net_amount_rate) }}>
                          {row.net_amount_rate > 0 ? "+" : ""}{row.net_amount_rate.toFixed(2)}%
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500">#{row.rank}</td>
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

  // ── 主渲染 ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 过滤 + 搜索栏 */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        {/* 过滤控件（搜索模式时置灰） */}
        <div className={`flex items-center gap-1 bg-slate-100 rounded-lg p-1 transition-opacity ${isSearchMode ? "opacity-40 pointer-events-none" : ""}`}>
          {(
            [
              { value: "ALL", label: "全部" },
              { value: "CONCEPT", label: "概念" },
              { value: "INDUSTRY", label: "行业" },
            ] as { value: BoardTypeFilter; label: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBoardType(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                boardType === opt.value ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortByOption)} disabled={isSearchMode}>
          <SelectTrigger className={`h-8 w-32 text-xs bg-white border-slate-200 ${isSearchMode ? "opacity-40" : ""}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net_amount">按净流入</SelectItem>
            <SelectItem value="pct_change">按涨跌幅</SelectItem>
            <SelectItem value="rank">按排名</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))} disabled={isSearchMode}>
          <SelectTrigger className={`h-8 w-24 text-xs bg-white border-slate-200 ${isSearchMode ? "opacity-40" : ""}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">前 10</SelectItem>
            <SelectItem value="20">前 20</SelectItem>
            <SelectItem value="50">前 50</SelectItem>
          </SelectContent>
        </Select>

        {/* 搜索框 + 刷新（靠右） */}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative flex items-center w-48">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <Input
              value={searchKeyword}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="搜索板块，如：无线充电"
              className="h-8 pl-8 pr-7 text-xs bg-white border-slate-200 focus-visible:ring-1"
            />
            {searchKeyword && (
              <button onClick={clearSearch} className="absolute right-2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={fetchSectorList}
            disabled={listLoading || isSearchMode}
            className={`flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary transition-colors ${isSearchMode ? "opacity-40 pointer-events-none" : ""}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${listLoading ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>
      </div>

      {/* 主内容：左列表 + 右趋势 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 左侧面板 */}
        <div className="w-72 shrink-0 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
          {/* 表头 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 text-[11px] text-slate-400 font-medium">
            {isSearchMode ? (
              <span>搜索结果</span>
            ) : (
              <>
                <span>板块名称</span>
                <span>涨跌幅 / 净流入</span>
              </>
            )}
          </div>

          {/* 列表内容 */}
          {isSearchMode ? (
            // 搜索模式
            searchLoading ? (
              <div className="flex justify-center items-center flex-1 py-16">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : searchError ? (
              <div className="flex justify-center items-center flex-1 py-10">
                <p className="text-sm text-red-500">{searchError}</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-10 gap-2">
                <Search className="w-6 h-6 text-slate-300" />
                <p className="text-sm text-slate-400">未找到匹配的板块</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {searchResults.map(renderFlowRow)}
              </div>
            )
          ) : (
            // 普通列表模式
            listLoading ? (
              <div className="flex justify-center items-center flex-1 py-16">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : listError ? (
              <div className="flex flex-col items-center justify-center flex-1 py-10 gap-3">
                <p className="text-sm text-red-500">{listError}</p>
                <button onClick={fetchSectorList} className="text-xs text-primary hover:underline">重试</button>
              </div>
            ) : sectorList.length === 0 ? (
              <div className="flex justify-center items-center flex-1 py-10">
                <p className="text-sm text-slate-400">暂无数据</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {sectorList.map(renderFlowRow)}
              </div>
            )
          )}
        </div>

        {/* 右侧：趋势详情 */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-y-auto p-4">
          {renderTrendPanel()}
        </div>
      </div>
    </div>
  );
}
