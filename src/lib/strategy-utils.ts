export type StrategyAvailability = 'ACTIVE' | 'PREVIEW' | 'BETA' | 'DEPRECATED';

export type Strategy = {
    id: string;
    name: string;
    description?: string;
    tags?: string[];
    availability?: StrategyAvailability;
    annualizedReturn?: number | null;
    maxDrawdown?: number | null;
    sharpeRatio?: number | null;
    winRate?: number | null;
    calmarRatio?: number | null;
    profitLossRatio?: number | null;
    totalTrades?: number | null;
    minCapital?: number | null;
    riskLevel?: 'Low' | 'Medium' | 'High' | string;
    performanceData?: { date: string; value: number }[];
    benchmarkPerformanceData?: { date: string; value: number }[];
    excessPerformanceData?: { date: string; value: number }[];
};

export type FollowConfig = {
    strategyId: string;
    strategyName: string;
    capital: number;
    stopLoss: number; // percentage
    takeProfit: number; // percentage
    autoExit: boolean;
};

export type ApiStrategy = Record<string, any>;

export const mapRiskLevel = (value: string | undefined): Strategy['riskLevel'] => {
    if (!value) return 'Medium';
    const normalized = value.toLowerCase();
    if (normalized.includes('low')) return 'Low';
    if (normalized.includes('high')) return 'High';
    return 'Medium';
};

export const mapPctSeries = (curve: any[] | undefined): { date: string; value: number }[] => {
    if (!curve || !Array.isArray(curve)) return [];
    return curve
        .map((point) => {
            if (!point) return null;
            const date = point.date ?? point[0] ?? point.ts ?? point.time;
            const value =
                point.return_pct ??
                point.nav_pct ??
                point.value ??
                point[1] ??
                point.pct ??
                point.y;
            if (date === undefined || value === undefined) return null;
            return { date: String(date), value: Number(value) };
        })
        .filter(Boolean) as { date: string; value: number }[];
};

export const toPctFromNav = (curve: any[] | undefined) => {
    if (!curve || !Array.isArray(curve) || !curve.length) return [];
    const mapped = mapPctSeries(
        curve.map((p: any) => ({
            date: p.date ?? p[0],
            return_pct: p.nav ?? p[1],
        }))
    );
    if (!mapped.length) return [];
    const base = mapped[0].value || 1;
    return mapped.map((p) => ({
        date: p.date,
        value: ((p.value / base) - 1) * 100,
    }));
};

export const mapPerformance = (raw: ApiStrategy): { date: string; value: number }[] => {
    // Priority: explicit pct series
    const pctCurve = raw.nav_pct ?? raw.return_pct ?? raw.navPct ?? raw.performance_pct;
    const pct = mapPctSeries(pctCurve);
    if (pct.length) return pct;

    // Fallback: convert nav -> pct
    const navCurve = raw.nav;
    const navMapped = mapPctSeries(
        Array.isArray(navCurve)
            ? navCurve.map((p: any) => ({
                date: p.date ?? p[0],
                return_pct: p.nav,
            }))
            : []
    );
    if (navMapped.length) {
        const base = navMapped[0].value || 1;
        return navMapped.map((p) => ({
            date: p.date,
            value: ((p.value / base) - 1) * 100,
        }));
    }

    // Fallback: other curve fields
    return mapPctSeries(raw.equity_curve ?? raw.performance ?? raw.performanceData);
};

export const mapStrategyFromApi = (raw: ApiStrategy): Strategy => {
    const performanceData = mapPerformance(raw);
    let benchmarkPerformanceData = mapPctSeries(raw.benchmark_pct);
    if (!benchmarkPerformanceData.length) {
        benchmarkPerformanceData = toPctFromNav(raw.benchmark_nav);
    }

    let excessPerformanceData = mapPctSeries(raw.excess_pct);
    // Fallback计算超额：策略 - 基准
    if (!excessPerformanceData.length && performanceData.length && benchmarkPerformanceData.length) {
        const benchMap = new Map<string, number>();
        benchmarkPerformanceData.forEach(p => benchMap.set(p.date, p.value));
        excessPerformanceData = performanceData
            .filter(p => benchMap.has(p.date))
            .map(p => ({
                date: p.date,
                value: p.value - (benchMap.get(p.date) ?? 0),
            }));
    }
    return {
        id: raw.key ?? raw.id ?? raw.strategy_id ?? raw.slug ?? 'unknown',
        name: raw.name ?? raw.title ?? '未命名策略',
        description: raw.description ?? raw.brief ?? raw.summary ?? '',
        tags: raw.tags ?? raw.labels ?? [],
        availability: (raw.availability as StrategyAvailability) ?? 'ACTIVE',
        annualizedReturn:
            raw.annualized_return ??
            raw.annualizedReturn ??
            raw.metrics?.annualized_return ??
            raw.metrics?.ann_return ??
            raw.annual_return ??
            null,
        maxDrawdown: raw.max_drawdown ?? raw.metrics?.max_drawdown ?? null,
        sharpeRatio: raw.sharpe_ratio ?? raw.metrics?.sharpe_ratio ?? raw.sharpe ?? null,
        winRate: raw.win_rate ?? raw.winRate ?? raw.metrics?.win_rate ?? null,
        calmarRatio: raw.calmar_ratio ?? raw.calmarRatio ?? raw.metrics?.calmar_ratio ?? null,
        profitLossRatio: raw.profit_loss_ratio ?? raw.profitLossRatio ?? raw.metrics?.profit_loss_ratio ?? null,
        totalTrades: raw.total_trades ?? raw.totalTrades ?? raw.metrics?.total_trades ?? null,
        minCapital: raw.min_capital ?? raw.minCapital ?? raw.requirement?.min_capital ?? null,
        riskLevel: mapRiskLevel(raw.risk_level ?? raw.riskLevel),
        performanceData: performanceData.length ? performanceData : undefined,
        benchmarkPerformanceData: benchmarkPerformanceData.length ? benchmarkPerformanceData : undefined,
        excessPerformanceData: excessPerformanceData.length ? excessPerformanceData : undefined,
    };
};

export const rebaseToZero = (series: { date: string; value: number }[]): { date: string; value: number }[] => {
    if (!series.length) return [];
    const baseValue = series[0].value;
    return series.map(p => ({
        ...p,
        value: p.value - baseValue
    }));
};

