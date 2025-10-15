/**
 * 月分析API接口
 * GET /api/monthly-summaries?userId=xxx - 获取用户的月分析
 * POST /api/monthly-summaries - 创建新的月分析
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { AnalysisAdapter } from '@/lib/adapters/analysis-adapter';

/**
 * 获取用户的月分析
 * GET /api/monthly-summaries?userId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), { 
        status: 400 
      });
    }

    // 检查数据库连接
    const isDbConnected = await checkDatabaseConnection();
    
    if (!isDbConnected) {
      console.warn('数据库连接失败');
      return new Response(JSON.stringify({ 
        error: 'Database connection failed',
        source: 'postgres_failed'
      }), { 
        status: 503 
      });
    }

    try {
      // 获取用户的月分析
      const summaries = await AnalysisAdapter.getUserMonthlySummaries(userId);

      return Response.json(summaries);

    } catch (error) {
      console.error('获取月分析失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch monthly summaries',
        source: 'postgres'
      }), { 
        status: 500 
      });
    }

  } catch (err: any) {
    console.error('monthly-summaries API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}

/**
 * 创建新的月分析
 * POST /api/monthly-summaries
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, monthStartDate, monthEndDate, performanceComparison, recurringIssues, strategyExecutionEvaluation, keyLessons, iterationSuggestions } = body;

    if (!userId || !monthStartDate || !monthEndDate || !performanceComparison || !recurringIssues || !strategyExecutionEvaluation || !keyLessons || !iterationSuggestions) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400 
      });
    }

    // 检查数据库连接
    const isDbConnected = await checkDatabaseConnection();
    
    if (!isDbConnected) {
      console.warn('数据库连接失败');
      return new Response(JSON.stringify({ 
        error: 'Database connection failed',
        source: 'postgres_failed'
      }), { 
        status: 503 
      });
    }

    try {
      // 创建月分析
      const summary = await AnalysisAdapter.createMonthlySummary({
        userId,
        monthStartDate: new Date(monthStartDate),
        monthEndDate: new Date(monthEndDate),
        performanceComparison,
        recurringIssues,
        strategyExecutionEvaluation,
        keyLessons,
        iterationSuggestions,
      });

      return Response.json(summary);

    } catch (error) {
      console.error('创建月分析失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to create monthly summary',
        source: 'postgres'
      }), { 
        status: 500 
      });
    }

  } catch (err: any) {
    console.error('monthly-summaries POST API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}