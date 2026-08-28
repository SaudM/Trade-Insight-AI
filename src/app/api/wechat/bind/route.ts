/**
 * 生成微信绑定二维码（已登录用户使用）
 */

import { NextRequest, NextResponse } from 'next/server';
import { wechatOAuth } from '@/lib/wechat-oauth';
import { WechatLoginAdapter } from '@/lib/adapters/wechat-login-adapter';
import { auth } from '@/auth';
import { UserAdapter } from '@/lib/adapters/user-adapter';

export async function GET(request: NextRequest) {
  try {
    // 获取当前登录用户
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: '请先登录',
        },
        { status: 401 }
      );
    }

    // 检查用户是否已绑定微信
    const isBound = await UserAdapter.isWechatBound(session.user.id);
    if (isBound) {
      return NextResponse.json(
        {
          success: false,
          error: '您已绑定微信，无需重复绑定',
        },
        { status: 400 }
      );
    }

    // 生成绑定场景值
    const sceneStr = `bind_${session.user.id}`;

    // 创建临时二维码（有效期5分钟）
    const qrcodeResult = await wechatOAuth.createTempQrcode(sceneStr, 300);

    // 创建绑定会话记录
    const loginSession = await WechatLoginAdapter.createSession(
      sceneStr,
      qrcodeResult.ticket,
      qrcodeResult.expireSeconds,
      true, // 绑定模式
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: {
        ticket: qrcodeResult.ticket,
        qrcodeUrl: qrcodeResult.qrcodeUrl,
        expireSeconds: qrcodeResult.expireSeconds,
        sessionId: loginSession.id,
      },
    });
  } catch (error: any) {
    console.error('生成微信绑定二维码失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '生成二维码失败',
      },
      { status: 500 }
    );
  }
}