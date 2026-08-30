"use client";

import type { TradeLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CumulativePLChart } from '@/components/app/cumulative-pl-chart';
import { WinLossRatioChart } from '@/components/app/win-loss-ratio-chart';
import { PLChart } from '@/components/app/pl-chart';
import { formatCNY, type ReportMetrics, type SymbolPL } from '@/lib/trade-metrics';

const PT = {
  bg:      '#ffffff',
  fog:     '#f6f6f3',
  sand:    '#e5e5e0',
  heading: '#211922',
  body:    '#62625b',
  muted:   '#91918c',
  border:  '#e5e5e0',
  red:     '#e60023',
  green:   '#10b981',
  dark:    '#33332e',
} as const;

/** 报告区卡片统一外观（白底、1px 边、16 圆角、无投影，与 PLChart 一致）。 */
const cardStyle = { backgroundColor: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, boxShadow: 'none' } as const;

function plColor(n: number): string {
  if (n > 0) return PT.red;
  if (n < 0) return PT.green;
  return PT.dark;
}

/** 标的盈亏 Top5 横向条。 */
function SymbolBreakdown({ bySymbol }: { bySymbol: SymbolPL[] }) {
  const top = bySymbol.slice(0, 5);
  const maxAbs = top.reduce((mx, s) => Math.max(mx, Math.abs(s.pl)), 0) || 1;

  return (
    <Card className="flex flex-col flex-1 min-h-0" style={cardStyle}>
      <CardHeader>
        <CardTitle className="font-headline text-sm font-medium" style={{ color: PT.heading }}>标的盈亏 Top5</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {top.length > 0 ? (
          <div className="flex flex-col gap-3">
            {top.map((s) => (
              <div key={s.symbol} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: PT.heading }}>{s.symbol}</span>
                  <span className="font-mono text-sm font-semibold tabular-nums shrink-0" style={{ color: plColor(s.pl) }}>
                    {formatCNY(s.pl, { sign: true })}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: PT.sand }}>
                  <div
                    style={{
                      width: `${(Math.abs(s.pl) / maxAbs) * 100}%`,
                      backgroundColor: plColor(s.pl),
                      height: '100%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm" style={{ color: PT.muted }}>
            暂无标的数据
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 图表区。入参为**已按报告周期 scope 且按平仓口径筛选**的 closedLogs 及其 metrics。
 * 布局：左 2/3 累计收益曲线，右 1/3 胜败比 + 标的 Top5，下方满宽逐笔盈亏柱。
 */
export function ReportChartSection({
  closedLogs,
  metrics,
}: {
  closedLogs: TradeLog[];
  metrics: ReportMetrics;
}) {
  const enoughForBars = closedLogs.length >= 3;

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-5">
        {/* 左：累计收益率曲线（fragment，需 flex 列 + 明确高度） */}
        <div className="xl:col-span-2">
          <Card className="flex flex-col h-[340px]" style={cardStyle}>
            <CumulativePLChart tradeLogs={closedLogs} />
          </Card>
        </div>

        {/* 右：胜败比 + 标的 Top5 */}
        <div className="xl:col-span-1 flex flex-col gap-4 xl:h-[340px]">
          <Card className="flex flex-col" style={cardStyle}>
            <WinLossRatioChart profitableTrades={metrics.wins} lossTrades={metrics.losses} />
          </Card>
          <SymbolBreakdown bySymbol={metrics.bySymbol} />
        </div>
      </div>

      {/* 下：逐笔盈亏柱（自带 Card）；<3 笔时占位柱会喧宾夺主，改走提示 */}
      {enoughForBars ? (
        <PLChart tradeLogs={closedLogs} />
      ) : (
        <Card className="flex items-center justify-center py-10" style={cardStyle}>
          <span className="text-sm" style={{ color: PT.muted }}>
            数据点不足,累计满 3 笔平仓交易后展示逐笔盈亏图。
          </span>
        </Card>
      )}
    </div>
  );
}
