/**
 * 生成微信扫码登录二维码
 */

import { NextRequest, NextResponse } from 'next/server';
import { wechatOAuth } from '@/lib/wechat-oauth';
import { WechatLoginAdapter } from '@/lib/adapters/wechat-login-adapter';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({
      success: true,
      data: {
        ticket: qrcodeResult.ticket,
        qrcodeUrl: qrcodeResult.qrcodeUrl,
        expireSeconds: qrcodeResult.expireSeconds,
        sessionId: session.id,
      },
    });
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