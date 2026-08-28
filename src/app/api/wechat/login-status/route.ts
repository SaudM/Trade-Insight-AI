/**
 * 查询微信扫码登录状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { WechatLoginAdapter } from '@/lib/adapters/wechat-login-adapter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticket = searchParams.get('ticket');

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少ticket参数',
        },
        { status: 400 }
      );
    }

    // 获取会话状态
    const session = await WechatLoginAdapter.getSessionByTicket(ticket);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: '会话不存在',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: session.status,
        openid: session.openid,
        userId: session.userId,
        bindingMode: session.bindingMode,
        expiresAt: session.expiresAt,
        scannedAt: session.scannedAt,
        confirmedAt: session.confirmedAt,
        wechatNickname: session.wechatNickname,
        wechatAvatar: session.wechatAvatar,
      },
    });
  } catch (error: any) {
    console.error('查询微信登录状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '查询状态失败',
      },
      { status: 500 }
    );
  }
}