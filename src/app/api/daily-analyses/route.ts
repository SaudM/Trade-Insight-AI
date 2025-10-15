/**
 * 日分析API接口
 * GET /api/daily-analyses?userId=xxx - 获取用户的日分析
 * POST /api/daily-analyses - 创建新的日分析
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { AnalysisAdapter } from '@/lib/adapters/analysis-adapter';

/**
 * 获取用户的日分析
 * GET /api/daily-analyses?userId=xxx
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
      // 获取用户的日分析
      const analyses = await AnalysisAdapter.getUserDailyAnalyses(userId);

      return Response.json(analyses);

    } catch (error) {
      console.error('获取日分析失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch daily analyses',
        source: 'postgres'
      }), { 
        status: 500 
      });
    }

  } catch (err: any) {
    console.error('daily-analyses API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}

/**
 * 创建新的日分析
 * POST /api/daily-analyses
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, date, summary, strengths, weaknesses, emotionalImpact, improvementSuggestions } = body;

    if (!userId || !date || !summary || !strengths || !weaknesses || !emotionalImpact || !improvementSuggestions) {
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
      // 创建日分析
      const analysis = await AnalysisAdapter.createDailyAnalysis({
        userId,
        date: new Date(date),
        summary,
        strengths,
        weaknesses,
        emotionalImpact,
        improvementSuggestions,
      });

      return Response.json(analysis);

    } catch (error) {
      console.error('创建日分析失败:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to create daily analysis',
        source: 'postgres'
      }), { 
        status: 500 
      });
    }

  } catch (err: any) {
    console.error('daily-analyses POST API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}