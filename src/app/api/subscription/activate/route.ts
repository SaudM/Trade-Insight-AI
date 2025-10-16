import { NextRequest, NextResponse } from 'next/server';
import { activateSubscriptionPostgres } from '@/lib/subscription-postgres';
import { UserAdapter } from '@/lib/adapters/user-adapter';

/**
 * 激活订阅API端点
 * 处理订阅激活请求，包括用户ID、计划ID、支付ID和金额
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, planId, paymentId, amount } = body;

    // 验证必需参数
    if (!userId || !planId || !paymentId || amount === undefined) {
      return NextResponse.json(
        { error: '缺少必需参数: userId, planId, paymentId, amount' },
        { status: 400 }
      );
    }

    // 获取内部用户ID（如果传入的是Firebase UID）
    let internalUserId = userId;
    try {
      const user = await UserAdapter.getUserByFirebaseUid(userId);
      if (user) {
        internalUserId = user.id;
      }
    } catch (error) {
      console.warn('无法通过Firebase UID获取用户，使用原始ID:', userId);
    }

    // 调用订阅激活函数
    const result = await activateSubscriptionPostgres({
      userId: internalUserId,
      planId,
      paymentId,
      amount
    });

    return NextResponse.json({ 
      success: true, 
      message: '订阅激活成功',
      data: result 
    });

  } catch (error) {
    console.error('激活订阅失败:', error);
    return NextResponse.json(
      { 
        error: '激活订阅失败', 
        details: error instanceof Error ? error.message : '未知错误' 
      },
      { status: 500 }
    );
  }
}