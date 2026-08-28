/**
 * 微信公众号事件回调
 * 处理扫码、关注等事件
 */

import { NextRequest, NextResponse } from 'next/server';
import { wechatOAuth, parseWechatMessage, buildTextResponse } from '@/lib/wechat-oauth';
import { WechatLoginAdapter } from '@/lib/adapters/wechat-login-adapter';
import { UserAdapter } from '@/lib/adapters/user-adapter';

// 公众号原始ID（从环境变量获取）
const WECHAT_ORIGINAL_ID = process.env.WECHAT_ORIGINAL_ID || 'gh_xxxxxxxx';

export async function GET(request: NextRequest) {
  // 微信服务器验证请求
  const { searchParams } = new URL(request.url);
  const signature = searchParams.get('signature') || '';
  const timestamp = searchParams.get('timestamp') || '';
  const nonce = searchParams.get('nonce') || '';
  const echostr = searchParams.get('echostr') || '';

  // 验证签名
  if (wechatOAuth.verifySignature(signature, timestamp, nonce)) {
    // 验证成功，返回echostr
    return new NextResponse(echostr, { status: 200 });
  }

  return NextResponse.json({ error: '签名验证失败' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    // 获取请求头中的签名信息
    const signature = request.headers.get('wechatpay-signature') || request.headers.get('x-wechat-signature') || '';
    const timestamp = request.headers.get('wechatpay-timestamp') || request.headers.get('x-wechat-timestamp') || '';
    const nonce = request.headers.get('wechatpay-nonce') || request.headers.get('x-wechat-nonce') || '';

    // 获取请求体（XML格式）
    const body = await request.text();

    // 验证签名（可选，根据配置）
    // if (!wechatOAuth.verifySignature(signature, timestamp, nonce)) {
    //   return NextResponse.json({ error: '签名验证失败' }, { status: 403 });
    // }

    // 解析消息
    const message = parseWechatMessage(body);

    console.log('[微信回调] 收到消息:', {
      msgType: message.msgType,
      event: message.event,
      eventKey: message.eventKey,
      openid: message.openid,
    });

    // 处理不同类型的消息
    if (message.msgType === 'event') {
      // 事件消息
      if (message.event === 'SCAN') {
        // 已关注用户扫码事件
        return await handleScanEvent(message);
      } else if (message.event === 'SUBSCRIBE') {
        // 新关注用户扫码事件（首次关注）
        return await handleSubscribeEvent(message);
      } else if (message.event === 'UNSUBSCRIBE') {
        // 取消关注事件
        return await handleUnsubscribeEvent(message);
      }
    }

    // 其他消息类型，返回空响应
    return new NextResponse('success', { status: 200 });
  } catch (error: any) {
    console.error('[微信回调] 处理消息失败:', error);
    return new NextResponse('success', { status: 200 });
  }
}

/**
 * 处理已关注用户扫码事件
 */
async function handleScanEvent(message: {
  openid: string;
  eventKey?: string;
}): Promise<NextResponse> {
  const { openid, eventKey } = message;

  // eventKey 格式：qrscene_xxx 或 xxx（取决于二维码创建方式）
  const sceneStr = eventKey?.startsWith('qrscene_') ? eventKey.slice(8) : eventKey;

  if (!sceneStr) {
    return new NextResponse('success', { status: 200 });
  }

  console.log('[微信回调] SCAN事件:', { openid, sceneStr });

  // 查找会话
  const session = await WechatLoginAdapter.getSessionBySceneStr(sceneStr);

  if (!session) {
    console.warn('[微信回调] 未找到会话:', { sceneStr });
    return new NextResponse('success', { status: 200 });
  }

  // 获取微信用户信息
  let wechatInfo: { nickname?: string; headimgurl?: string; unionid?: string } | undefined;
  try {
    const userInfo = await wechatOAuth.getUserInfo(openid);
    wechatInfo = {
      nickname: userInfo.nickname,
      headimgurl: userInfo.headimgurl,
      unionid: userInfo.unionid,
    };
  } catch (e) {
    console.warn('[微信回调] 获取用户信息失败:', e);
  }

  // 更新会话状态为已扫码
  await WechatLoginAdapter.updateSessionScanned(session.ticket, openid, wechatInfo);

  // 查找是否已绑定用户
  const user = await UserAdapter.getUserByWechatOpenid(openid);

  if (session.bindingMode) {
    // 绑定模式
    if (user) {
      // 该微信已绑定其他账号
      await WechatLoginAdapter.updateSessionConfirmed(
        session.ticket,
        user.id,
        'already_bound' as any
      );
      // 发送提示消息
      await wechatOAuth.sendTextMessage(openid, '该微信已绑定其他账号，无法重复绑定。');
    } else if (session.userId) {
      // 绑定到当前用户
      try {
        await UserAdapter.bindWechatToUser(session.userId, openid, wechatInfo);
        await WechatLoginAdapter.updateSessionConfirmed(session.ticket, session.userId);
        await wechatOAuth.sendTextMessage(openid, '微信绑定成功！您现在可以使用微信扫码登录了。');
      } catch (e: any) {
        console.error('[微信回调] 绑定失败:', e);
        await wechatOAuth.sendTextMessage(openid, `绑定失败：${e.message}`);
      }
    }
  } else {
    // 登录模式
    if (user) {
      // 已绑定用户，直接登录
      await WechatLoginAdapter.updateSessionConfirmed(session.ticket, user.id);
      await wechatOAuth.sendTextMessage(openid, '登录成功！正在跳转...');
    } else {
      // 未绑定用户，创建新账号
      const newUser = await UserAdapter.createUserByWechat(openid, wechatInfo || {});
      await WechatLoginAdapter.updateSessionConfirmed(session.ticket, newUser.id);
      await wechatOAuth.sendTextMessage(openid, '欢迎！已为您创建新账号，正在跳转...');
    }
  }

  return new NextResponse('success', { status: 200 });
}

/**
 * 处理新关注用户扫码事件
 */
async function handleSubscribeEvent(message: {
  openid: string;
  eventKey?: string;
}): Promise<NextResponse> {
  const { openid, eventKey } = message;

  // 新关注用户的eventKey格式为：qrscene_xxx
  const sceneStr = eventKey?.startsWith('qrscene_') ? eventKey.slice(8) : eventKey;

  console.log('[微信回调] SUBSCRIBE事件:', { openid, sceneStr });

  // 如果是扫码关注（带场景值）
  if (sceneStr) {
    // 查找会话
    const session = await WechatLoginAdapter.getSessionBySceneStr(sceneStr);

    if (session) {
      // 复用SCAN事件的处理逻辑
      return await handleScanEvent({ openid, eventKey: sceneStr });
    }
  }

  // 普通关注（不带场景值）
  const responseXml = buildTextResponse(
    message.openid,
    WECHAT_ORIGINAL_ID,
    '感谢关注！您可以使用微信扫码登录我们的服务。'
  );

  return new NextResponse(responseXml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
}

/**
 * 处理取消关注事件
 */
async function handleUnsubscribeEvent(message: {
  openid: string;
}): Promise<NextResponse> {
  console.log('[微信回调] UNSUBSCRIBE事件:', { openid: message.openid });

  // 可以在这里做一些清理工作，但不要解除绑定
  // 用户下次关注后仍应该能使用微信登录

  return new NextResponse('success', { status: 200 });
}