import { NextRequest, NextResponse } from 'next/server';
import { activateSubscriptionPostgres } from '@/lib/subscription-postgres';
import { UserAdapter } from '@/lib/adapters/user-adapter';

/**
 * 激活订阅API端点
 * 处理订阅激活请求，包括用户标识符、计划ID、支付ID和金额
 * 
 * 支持的用户标识符参数（按优先级）：
 * - uid: 系统UID（推荐用于业务逻辑）
 * - firebaseUid: Firebase UID（用于兼容性）
 * - userId: 已弃用，为向后兼容保留
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, firebaseUid, userId, planId, paymentId, amount } = body;

    // 确定用户标识符（按优先级）
    const userIdentifier = uid || firebaseUid || userId;
    
    // 验证必需参数
    if (!userIdentifier || !planId || !paymentId || amount === undefined) {
      return NextResponse.json(
        { error: '缺少必需参数: uid/firebaseUid/userId, planId, paymentId, amount' },
        { status: 400 }
      );
    }

    // 判断是否为系统UID（UUID格式）
    const isSystemUid = uid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);

    // 获取内部用户ID
    let internalUserId = userIdentifier;
    
    if (!isSystemUid) {
      // 如果不是系统UID，则通过Firebase UID获取用户信息
      try {
        const user = await UserAdapter.getUserByFirebaseUid(userIdentifier);
        if (user) {
          internalUserId = user.id;
        } else {
          return NextResponse.json(
            { error: '用户不存在' },
            { status: 404 }
          );
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        return NextResponse.json(
          { error: '获取用户信息失败' },
          { status: 500 }
        );
      }
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