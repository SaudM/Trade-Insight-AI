/**
 * 每日分析API接口
 * GET /api/daily-analyses?uid=xxx&limit=10&offset=0 - 通过系统UID获取（推荐）
 * GET /api/daily-analyses?firebaseUid=xxx&limit=10&offset=0 - 通过Firebase UID获取（认证用）
 */

import { NextRequest } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { AnalysisAdapter } from '@/lib/adapters/analysis-adapter';
import { CacheKeys, CacheConfig } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';

/**
 * 获取用户每日分析数据
 * GET /api/daily-analyses?uid=xxx&limit=10&offset=0 - 通过系统UID获取（推荐）
 * GET /api/daily-analyses?firebaseUid=xxx&limit=10&offset=0 - 通过Firebase UID获取（认证用）
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    const firebaseUid = searchParams.get('firebaseUid');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!uid && !firebaseUid) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameter: uid or firebaseUid' 
      }), { 
        status: 400 
      });
    }

    // 确定使用的用户标识符（优先级：uid > firebaseUid）
    const userIdentifier = uid || firebaseUid!;
    const isSystemUid = !!uid;

    // 定义数据获取函数
    const fetchUserAnalyses = async (identifier: string) => {
      if (isSystemUid) {
        // 直接使用系统UID获取分析数据
        return await AnalysisAdapter.getUserDailyAnalyses(identifier);
      } else {
        // 通过Firebase UID先获取用户信息，再获取分析数据
        const user = await UserAdapter.getUserByFirebaseUid(identifier);
        if (!user) {
          return [];
        }
        return await AnalysisAdapter.getUserDailyAnalyses(user.id);
      }
    };

    // 配置缓存选项
    const cacheOptions = CachedApiHandler.createCacheOptions(
      CacheKeys.userDailyAnalyses,  // 缓存键生成函数
      CacheConfig.USER_DATA_TTL,    // TTL
      true                          // 启用缓存
    );

    // 使用缓存基类处理请求
    return await CachedApiHandler.handleCachedGet(
      req,
      fetchUserAnalyses,
      cacheOptions,
      userIdentifier
    );

  } catch (err: any) {
    console.error('daily-analyses API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { 
      status: 500 
    });
  }
}

/**
 * 创建新的每日分析
 * POST /api/daily-analyses
 */
export async function POST(req: NextRequest) {
  try {
    console.log('=== 每日分析POST请求开始 ===');
    console.log('请求头:', Object.fromEntries(req.headers.entries()));
    
    let body;
    try {
      body = await req.json();
      console.log('请求体内容:', JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error('JSON解析失败:', {
        error: jsonError instanceof Error ? jsonError.message : String(jsonError),
        contentType: req.headers.get('content-type'),
        timestamp: new Date().toISOString()
      });
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        source: 'json_parse_error',
        details: jsonError instanceof Error ? jsonError.message : String(jsonError)
      }), { 
        status: 400 
      });
    }
    
    // 从请求体中提取需要的字段，忽略额外字段如createdAt
    const { userId, date, summary, strengths, weaknesses, emotionalImpact, improvementSuggestions, ...extraFields } = body;
    
    // 记录额外字段（用于调试）
    if (Object.keys(extraFields).length > 0) {
      console.log('接收到额外字段:', Object.keys(extraFields));
    }

    // 将数组字段转换为字符串（数据库中存储为text类型）
    const strengthsStr = Array.isArray(strengths) ? JSON.stringify(strengths) : strengths;
    const weaknessesStr = Array.isArray(weaknesses) ? JSON.stringify(weaknesses) : weaknesses;
    const improvementSuggestionsStr = Array.isArray(improvementSuggestions) ? JSON.stringify(improvementSuggestions) : improvementSuggestions;
    
    console.log('字段转换后:', {
      strengthsType: typeof strengthsStr,
      weaknessesType: typeof weaknessesStr,
      improvementSuggestionsType: typeof improvementSuggestionsStr
    });

    // 详细的字段验证和日志
    const missingFields = [];
    if (!userId) missingFields.push('userId');
    if (!date) missingFields.push('date');
    if (!summary) missingFields.push('summary');
    if (!strengthsStr) missingFields.push('strengths');
    if (!weaknessesStr) missingFields.push('weaknesses');
    if (!emotionalImpact) missingFields.push('emotionalImpact');
    if (!improvementSuggestionsStr) missingFields.push('improvementSuggestions');

    if (missingFields.length > 0) {
      console.error('缺少必需字段:', missingFields);
      console.error('接收到的字段:', {
        userId: !!userId,
        date: !!date,
        summary: !!summary,
        strengths: !!strengthsStr,
        weaknesses: !!weaknessesStr,
        emotionalImpact: !!emotionalImpact,
        improvementSuggestions: !!improvementSuggestionsStr
      });
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        missingFields,
        receivedFields: Object.keys(body)
      }), { 
        status: 400 
      });
    }

    // 验证日期格式
    let parsedDate;
    try {
      parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date format');
      }
      console.log('解析的日期:', parsedDate.toISOString());
    } catch (dateError) {
      console.error('日期解析错误:', dateError, '原始日期值:', date);
      return new Response(JSON.stringify({ 
        error: 'Invalid date format',
        receivedDate: date
      }), { 
        status: 400 
      });
    }

    // 检查数据库连接
    console.log('检查数据库连接...');
    const isDbConnected = await checkDatabaseConnection();
    
    if (!isDbConnected) {
      console.error('数据库连接失败');
      return new Response(JSON.stringify({ 
        error: 'Database connection failed',
        source: 'postgres_failed'
      }), { 
        status: 503 
      });
    }
    console.log('数据库连接正常');

    try {
      console.log('准备创建每日分析，参数:', {
        userId,
        date: parsedDate.toISOString(),
        summaryLength: summary?.length || 0,
        strengthsLength: strengthsStr?.length || 0,
        weaknessesLength: weaknessesStr?.length || 0,
        emotionalImpactLength: emotionalImpact?.length || 0,
        improvementSuggestionsLength: improvementSuggestionsStr?.length || 0
      });

      // 创建每日分析
      const analysis = await AnalysisAdapter.createDailyAnalysis({
        userId,
        date: parsedDate,
        summary,
        strengths: strengthsStr,
        weaknesses: weaknessesStr,
        emotionalImpact,
        improvementSuggestions: improvementSuggestionsStr,
      });

      console.log('每日分析创建成功:', analysis.id);

      // 清除相关缓存（异步操作，不阻塞响应）
      const cacheKey = CacheKeys.userDailyAnalyses(userId);
      CachedApiHandler.clearCacheAsync(cacheKey);

      console.log('=== 每日分析POST请求成功完成 ===');
      return Response.json(analysis);

    } catch (error) {
      console.error('=== 创建每日分析失败 - 详细错误信息 ===');
      console.error('错误消息:', error instanceof Error ? error.message : String(error));
      console.error('错误类型:', error?.constructor?.name);
      console.error('错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('请求参数:', {
        userId,
        date: parsedDate?.toISOString(),
        summaryLength: summary?.length || 0,
        strengthsLength: strengthsStr?.length || 0,
        weaknessesLength: weaknessesStr?.length || 0,
        emotionalImpactLength: emotionalImpact?.length || 0,
        improvementSuggestionsLength: improvementSuggestionsStr?.length || 0
      });
      console.error('=== 错误信息结束 ===');
      
      return new Response(JSON.stringify({ 
        error: 'Failed to create daily analysis',
        source: 'postgres',
        details: error instanceof Error ? error.message : String(error),
        errorType: error?.constructor?.name
      }), { 
        status: 500 
      });
    }

  } catch (err: any) {
    console.error('=== 每日分析POST API 顶层错误 ===', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      errorType: err?.constructor?.name,
      timestamp: new Date().toISOString()
    });
    return new Response(JSON.stringify({ 
      error: err.message || 'Internal error',
      source: 'api_top_level',
      details: err instanceof Error ? err.message : String(err)
    }), { 
      status: 500 
    });
  }
}