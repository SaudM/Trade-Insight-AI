"use client";

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Brush,
  Legend
} from 'recharts';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import { MdDesignServices } from 'react-icons/md';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUserData } from '@/hooks/use-user-data';
import type { TradeLog } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 初始资金默认值（用于本地占位，真实值从服务器获取）
const DEFAULT_INITIAL_CAPITAL = 100000;

// 图表配置 - 符合中国用户习惯：红涨绿跌
const CHART_CONFIG = {
  colors: {
    positive: '#ef4444', // 红色 - 正收益（中国习惯）
    negative: '#10b981', // 绿色 - 负收益（中国习惯）
    neutral: '#6b7280',  // 灰色 - 基准线
    grid: '#e5e7eb',     // 网格线
    text: '#374151'      // 文字颜色
  },
  strokeWidth: 2,
  dotSize: 4,
  animationDuration: 750
};

// 数据点接口
interface ReturnDataPoint {
  date: string;
  timestamp: number;
  tradeNumber: number;
  dailyReturn: number;
  cumulativeReturn: number;
  cumulativeValue: number;
  symbol: string;
  tradeResult: number;
  formattedDate: string;
}

// 自定义工具提示组件
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload as ReturnDataPoint;
  const isPositive = data.cumulativeReturn >= 0;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
      <div className="text-sm font-medium text-gray-900 mb-2">
        {data.formattedDate}
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">交易标的:</span>
          <span className="font-medium">{data.symbol}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">单笔盈亏:</span>
          <span className={`font-medium ${data.tradeResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ¥{data.tradeResult.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">日收益率:</span>
          <span className={`font-medium ${data.dailyReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.dailyReturn.toFixed(3)}%
          </span>
        </div>
        <div className="border-t pt-1 mt-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">累计收益率:</span>
            <span className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {data.cumulativeReturn.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">账户价值:</span>
            <span className="font-medium text-gray-900">
              ¥{data.cumulativeValue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 自定义图例组件
const CustomLegend = ({ finalReturn }: { finalReturn: number }) => {
  const isPositive = finalReturn >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-0.5 rounded"
          style={{ backgroundColor: isPositive ? CHART_CONFIG.colors.positive : CHART_CONFIG.colors.negative }}
        />
        <span className="text-sm text-gray-600">累计收益率曲线</span>
      </div>
      <div className="flex items-center gap-1">
        <Icon className={`w-4 h-4 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
        <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {finalReturn.toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

/**
 * 专业累计收益率曲线组件
 * 功能说明：
 * - 仅统计平仓类交易（Sell/Close），开仓（Buy/Long/Short）不计入收益；
 * - 使用交易盈亏与账户价值计算复合收益率曲线；
 * - 支持设置初始资金并响应式展示。
 */
export function ProfessionalReturnChart({ tradeLogs }: { tradeLogs: TradeLog[] }) {
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [showBrush, setShowBrush] = useState(false);
  const { userData } = useUserData();
  const userId = userData?.user?.id || null;
  const [initialCapital, setInitialCapital] = useState<number>(DEFAULT_INITIAL_CAPITAL);
  const [designOpen, setDesignOpen] = useState(false);
  const [inputCapital, setInputCapital] = useState<string>(String(DEFAULT_INITIAL_CAPITAL));

  /**
   * 解析 /api/user-config 返回的响应数据
   * 后端可能返回扁平结构或包裹在 data 中的结构，此处做兼容处理。
   * @param payload 后端返回的 JSON 对象
   * @returns 解析出的 initialCapital 数值（若不可用则返回默认值）
   */
  const parseUserConfigResponse = useCallback((payload: any): number => {
    const maybeFlat = payload?.initialCapital;
    const maybeWrapped = payload?.data?.initialCapital;
    const capital = Number(
      (typeof maybeFlat !== 'undefined' ? maybeFlat : maybeWrapped) ?? DEFAULT_INITIAL_CAPITAL
    );
    return Number.isFinite(capital) && capital >= 0 ? Math.round(capital) : DEFAULT_INITIAL_CAPITAL;
  }, []);

  /**
   * 加载服务器端的初始资金配置；若不存在则由后端创建默认值100,000。
   */
  useEffect(() => {
    const fetchConfig = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`/api/user-config?uid=${userId}`);
        if (res.ok) {
          const data = await res.json();
          const capital = parseUserConfigResponse(data);
          setInitialCapital(capital);
          setInputCapital(String(capital));
        }
      } catch (e) {
        // 保持默认值，避免打断用户体验
      }
    };
    fetchConfig();
  }, [userId, parseUserConfigResponse]);

  /**
   * 计算复合收益率数据（仅 Sell/Close）
   * 排序规则：
   * 1) 按 tradeTime 升序；
   * 2) 若 tradeTime 相同，按 createdAt 升序；
   * 3) 若仍相同，按 id 字典序升序；
   * 目的：确保“交易笔数”序列稳定、可重复，避免同一时间导致顺序感知异常。
   */
  const chartData = useMemo(() => {
    if (!tradeLogs || tradeLogs.length === 0) {
      return [];
    }

    // 移除调试日志，保持组件整洁

    // 过滤仅保留 Sell/Close，并进行稳定排序（见 compareTradesBySequence）
    const exitLogs = tradeLogs.filter(l => (l.direction === 'Sell' || l.direction === 'Close'));
    const sortedLogs = [...exitLogs].sort((a, b) => {
      const timeA = a.tradeTime instanceof Date ? a.tradeTime.getTime() : new Date(a.tradeTime).getTime();
      const timeB = b.tradeTime instanceof Date ? b.tradeTime.getTime() : new Date(b.tradeTime).getTime();
      if (timeA !== timeB) return timeA - timeB;

      const createdA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as any).getTime();
      const createdB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as any).getTime();
      if (Number.isFinite(createdA) && Number.isFinite(createdB) && createdA !== createdB) {
        return createdA - createdB;
      }

      const idA = String((a as any).id ?? '');
      const idB = String((b as any).id ?? '');
      return idA.localeCompare(idB);
    });

    let cumulativeMultiplier = 1; // 复合收益率乘数
    let cumulativeValue = initialCapital; // 累计账户价值（基于用户配置的初始资金）

    const result: ReturnDataPoint[] = sortedLogs.map((log, index) => {
      // 安全解析 tradeResult，非数值时按0处理
      const tradeResult = Number.isFinite(parseFloat(log.tradeResult)) ? parseFloat(log.tradeResult) : 0;
      
      // 计算日收益率 = 交易盈亏 / 当前账户价值
      const dailyReturn = cumulativeValue > 0 ? (tradeResult / cumulativeValue) * 100 : 0;
      
      // 更新累计账户价值
      cumulativeValue += tradeResult;
      
      // 计算复合收益率乘数: (1 + r1) × (1 + r2) × ... × (1 + rn)
      cumulativeMultiplier *= (1 + dailyReturn / 100);
      
      // 累计收益率 = 复合收益率乘数 - 1
      const cumulativeReturn = (cumulativeMultiplier - 1) * 100;

      const date = log.tradeTime instanceof Date ? log.tradeTime : new Date(log.tradeTime);
      const timestamp = date.getTime();
      
      return {
        date: date.toISOString(),
        timestamp,
        tradeNumber: index + 1,
        dailyReturn,
        cumulativeReturn,
        cumulativeValue,
        symbol: log.symbol,
        tradeResult,
        formattedDate: format(date, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
      };
    });

    return result;
  }, [tradeLogs, initialCapital]);

  /**
   * 重置缩放
   * 清除缩放区间并隐藏刷子控件，恢复完整视图。
   */
  const handleResetZoom = useCallback(() => {
    setZoomDomain(null);
    setShowBrush(false);
  }, []);

  /**
   * 缩放控制（放大）
   * 选择中间50%的数据区间进行聚焦显示，并启用Brush便于进一步调整。
   */
  const handleZoomIn = useCallback(() => {
    if (chartData.length === 0) return;
    
    const dataLength = chartData.length;
    const start = Math.floor(dataLength * 0.25);
    const end = Math.floor(dataLength * 0.75);
    
    setZoomDomain([start, end]);
    setShowBrush(true);
  }, [chartData]);

  /**
   * 缩放控制（缩小）
   * 取消缩放并隐藏Brush，回到默认视角。
   */
  const handleZoomOut = useCallback(() => {
    setZoomDomain(null);
    setShowBrush(false);
  }, []);

  // 计算统计信息
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const finalData = chartData[chartData.length - 1];
    const maxReturn = Math.max(...chartData.map(d => d.cumulativeReturn));
    const minReturn = Math.min(...chartData.map(d => d.cumulativeReturn));
    const volatility = chartData.length > 1 ? 
      Math.sqrt(chartData.reduce((sum, d, i) => {
        if (i === 0) return 0;
        const diff = d.dailyReturn - chartData[i-1].dailyReturn;
        return sum + diff * diff;
      }, 0) / (chartData.length - 1)) : 0;

    return {
      finalReturn: finalData.cumulativeReturn,
      maxReturn,
      minReturn,
      volatility,
      totalTrades: chartData.length,
      finalValue: finalData.cumulativeValue
    };
  }, [chartData]);

  if (!stats) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">暂无交易数据</p>
          <p className="text-sm">开始交易后将显示累计收益率曲线</p>
        </div>
      </div>
    );
  }

  const isPositiveReturn = stats.finalReturn >= 0;
  const lineColor = isPositiveReturn ? CHART_CONFIG.colors.positive : CHART_CONFIG.colors.negative;

  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">专业累计收益率曲线</CardTitle>
            <CardDescription className="mt-1">
              基于复合收益率计算的专业金融图表 (初始资金: ¥{initialCapital.toLocaleString()})
          </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* 个性化设计：初始资金设置 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDesignOpen(true)}
              className="h-8 w-8 p-0"
              aria-label="设计个性化设置"
              title="设计"
            >
              <MdDesignServices className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={chartData.length < 10}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={!zoomDomain}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetZoom}
              disabled={!zoomDomain}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 统计信息面板 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-xs text-gray-500">最终收益率</div>
            <div className={`text-lg font-bold ${isPositiveReturn ? 'text-green-600' : 'text-red-600'}`}>
              {stats.finalReturn.toFixed(2)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">最高收益率</div>
            <div className="text-lg font-semibold text-green-600">
              {stats.maxReturn.toFixed(2)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">最大回撤</div>
            <div className="text-lg font-semibold text-red-600">
              {stats.minReturn.toFixed(2)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">账户价值</div>
            <div className="text-lg font-semibold text-gray-900">
              ¥{stats.finalValue.toLocaleString()}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="w-full flex-1 flex flex-col pb-4">
        {/* 图例 */}
        <CustomLegend finalReturn={stats.finalReturn} />
        
        {/* 主图表 */}
        <div className="w-full h-96 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
            >
              <defs>
                {/* 正收益渐变 - 红色（中国习惯） */}
                <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
                
                {/* 负收益渐变 - 绿色（中国习惯） */}
                <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.05} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={CHART_CONFIG.colors.grid}
                vertical={false}
              />
              
              <XAxis
                dataKey="tradeNumber"
                type="number"
                scale="linear"
                domain={zoomDomain || ['dataMin', 'dataMax']}
                tickFormatter={(value) => `第${value}笔`}
                tick={{ fontSize: 12, fill: CHART_CONFIG.colors.text }}
                axisLine={{ stroke: CHART_CONFIG.colors.grid }}
                tickLine={{ stroke: CHART_CONFIG.colors.grid }}
                label={{ value: '交易笔数', position: 'insideBottom', offset: -10 }}
              />
              
              <YAxis
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                tick={{ fontSize: 12, fill: CHART_CONFIG.colors.text }}
                axisLine={{ stroke: CHART_CONFIG.colors.grid }}
                tickLine={{ stroke: CHART_CONFIG.colors.grid }}
                label={{ 
                  value: '累计收益率 (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: CHART_CONFIG.colors.text }
                }}
              />
              
              {/* 0%基准线 */}
              <ReferenceLine 
                y={0} 
                stroke={CHART_CONFIG.colors.neutral} 
                strokeDasharray="2 2" 
                strokeWidth={1}
                label={{ value: "盈亏平衡线", position: "top", fontSize: 10 }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Line
                type="monotone"
                dataKey="cumulativeReturn"
                stroke={lineColor}
                strokeWidth={CHART_CONFIG.strokeWidth}
                dot={{ 
                  fill: lineColor, 
                  strokeWidth: 0, 
                  r: CHART_CONFIG.dotSize,
                  opacity: chartData.length > 100 ? 0 : 1 // 大数据量时隐藏点
                }}
                activeDot={{ 
                  r: CHART_CONFIG.dotSize + 2, 
                  stroke: lineColor, 
                  strokeWidth: 2, 
                  fill: 'white' 
                }}
                animationDuration={CHART_CONFIG.animationDuration}
                connectNulls={false}
              />
              
              {/* 缩放刷子 */}
              {showBrush && (
                <Brush
                  dataKey="tradeNumber"
                  height={30}
                  stroke={lineColor}
                  fill={lineColor}
                  fillOpacity={0.1}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 性能指标 */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          交易笔数: {stats.totalTrades} | 
          波动率: {stats.volatility.toFixed(2)}% | 
          数据点: {chartData.length}个 |
          渲染性能: {chartData.length > 1000 ? '高性能模式' : '标准模式'}
        </div>
      </CardContent>

      {/* 个性化设计对话框：设置初始资金 */}
      <Dialog open={designOpen} onOpenChange={setDesignOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>个性化设计</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="initialCapital" className="text-right">
                初始资金 (元)
              </Label>
              <Input
                id="initialCapital"
                type="number"
                min={0}
                className="col-span-3"
                value={inputCapital}
                onChange={(e) => setInputCapital(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDesignOpen(false);
                setInputCapital(String(initialCapital));
              }}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!userId) {
                  setDesignOpen(false);
                  return;
                }
                const parsed = Number(inputCapital);
                const nextCapital = isNaN(parsed) || parsed < 0 ? initialCapital : Math.round(parsed);
                try {
                  const res = await fetch(`/api/user-config?uid=${userId}` , {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ initialCapital: nextCapital }),
                  });
                  if (res.ok) {
                    setInitialCapital(nextCapital);
                  }
                } catch (_) {
                  // 忽略错误，保持当前值
                }
                setDesignOpen(false);
              }}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}