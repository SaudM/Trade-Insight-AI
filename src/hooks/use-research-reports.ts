
import { useState, useEffect, useCallback } from 'react';
import type { ResearchReport } from '@/lib/types';

export function useResearchReports(symbol?: string) {
    const [data, setData] = useState<ResearchReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReports = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const url = new URL('/api/research-reports', window.location.origin);
            if (symbol) {
                url.searchParams.set('symbol', symbol);
            }

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`获取研究报告失败: ${response.statusText}`);
            }

            const result = await response.json();
            setData(result.data || []);
        } catch (err) {
            console.error('获取研究报告失败:', err);
            setError(err instanceof Error ? err.message : '获取研究报告失败');
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, [symbol]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchReports,
    };
}
