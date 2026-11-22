/**
 * 查询微信扫码登录状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { WechatLoginAdapter } from '@/lib/adapters/wechat-login-adapter';
import { consumeRateLimit, getClientIp, tooManyRequests } from '@/lib/rate-limit';

// 前端每 2 秒轮询一次（每分钟 30 次），留出多开几个页面的余量
const IP_RULE = { name: 'wechat-login-status:ip', limit: 120, windowSeconds: 60 };

export async function GET(request: NextRequest) {
  try {
    const ipLimit = await consumeRateLimit(IP_RULE, getClientIp(request));
    if (!ipLimit.allowed) return tooManyRequests(ipLimit);

    const { searchParams } = new URL(request.url);
    const ticket = searchParams.get('ticket');

    if (!ticket || ticket.length > 255) {
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

    // 不返回 openid、userId：前端只用到状态和昵称，没必要把身份标识交给任何持有 ticket 的人
    return NextResponse.json({
      success: true,
      data: {
        status: session.status,
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