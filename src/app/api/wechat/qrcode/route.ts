/**
 * 生成微信扫码登录二维码
 */

import { NextRequest, NextResponse } from 'next/server';
import { wechatOAuth } from '@/lib/wechat-oauth';
import { WechatLoginAdapter } from '@/lib/adapters/wechat-login-adapter';
import { consumeRateLimit, getClientIp, tooManyRequests } from '@/lib/rate-limit';
import { WECHAT_LOGIN_BINDING_COOKIE, signWechatTicket } from '@/lib/wechat-login-binding';
import { v4 as uuidv4 } from 'uuid';

// 每次调用都会请求微信接口并写一条会话记录，按 IP 限流
const IP_RULE = { name: 'wechat-qrcode:ip', limit: 10, windowSeconds: 60 };

export async function GET(request: NextRequest) {
  try {
    const ipLimit = await consumeRateLimit(IP_RULE, getClientIp(request));
    if (!ipLimit.allowed) return tooManyRequests(ipLimit);

    // 生成唯一的场景值
    const sceneStr = `login_${uuidv4()}`;

    // 创建临时二维码（有效期5分钟）
    const qrcodeResult = await wechatOAuth.createTempQrcode(sceneStr, 300);

    // 创建登录会话记录
    const session = await WechatLoginAdapter.createSession(
      sceneStr,
      qrcodeResult.ticket,
      qrcodeResult.expireSeconds,
      false // 登录模式
    );

    const response = NextResponse.json({
      success: true,
      data: {
        ticket: qrcodeResult.ticket,
        qrcodeUrl: qrcodeResult.qrcodeUrl,
        expireSeconds: qrcodeResult.expireSeconds,
        sessionId: session.id,
      },
    });

    // 把 ticket 绑定到当前浏览器，登录时由 auth.config.ts 的 wechat provider 校验
    const binding = signWechatTicket(qrcodeResult.ticket);
    if (binding) {
      response.cookies.set(WECHAT_LOGIN_BINDING_COOKIE, binding, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: qrcodeResult.expireSeconds,
      });
    } else {
      console.error('[wechat/qrcode] 未配置 AUTH_SECRET / NEXTAUTH_SECRET，扫码登录将无法完成');
    }

    return response;
  } catch (error: any) {
    console.error('生成微信登录二维码失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '生成二维码失败',
      },
      { status: 500 }
    );
  }
}
