/**
 * 微信登录会话适配器
 * 管理扫码登录会话状态
 */

import { prisma } from '@/lib/db';
import { cache, CacheKeys } from '@/lib/redis';

/**
 * 会话状态
 */
export type SessionStatus = 'pending' | 'scanned' | 'confirmed' | 'expired' | 'not_bound';

/**
 * 会话数据
 */
export interface WechatSessionData {
  id: string;
  ticket: string;
  sceneStr: string;
  status: SessionStatus;
  bindingMode: boolean;
  openid: string | null;
  userId: string | null;
  createdAt: Date;
  expiresAt: Date;
  scannedAt: Date | null;
  confirmedAt: Date | null;
  wechatNickname?: string | null;
  wechatAvatar?: string | null;
}

/**
 * 微信登录会话适配器
 */
export class WechatLoginAdapter {
  /**
   * 创建新的登录会话
   * @param sceneStr 场景值字符串
   * @param ticket 二维码ticket
   * @param expireSeconds 过期时间（秒）
   * @param bindingMode 是否绑定模式
   * @param userId 绑定模式下的用户ID
   */
  static async createSession(
    sceneStr: string,
    ticket: string,
    expireSeconds: number = 300,
    bindingMode: boolean = false,
    userId?: string
  ): Promise<WechatSessionData> {
    const expiresAt = new Date(Date.now() + expireSeconds * 1000);

    const session = await prisma.wechatLoginSession.create({
      data: {
        ticket,
        sceneStr,
        status: 'pending',
        bindingMode,
        userId: bindingMode ? userId : null,
        expiresAt,
      },
    });

    // 同时缓存到Redis，用于快速查询
    const sessionData: WechatSessionData = {
      id: session.id,
      ticket: session.ticket,
      sceneStr: session.sceneStr,
      status: 'pending',
      bindingMode: session.bindingMode,
      openid: null,
      userId: null,
      createdAt: session.createdAt!,
      expiresAt: session.expiresAt,
      scannedAt: null,
      confirmedAt: null,
    };

    await cache.set(CacheKeys.wechatLoginSession(ticket), sessionData, expireSeconds);

    return sessionData;
  }

  /**
   * 通过ticket获取会话状态
   * @param ticket 二维码ticket
   */
  static async getSessionByTicket(ticket: string): Promise<WechatSessionData | null> {
    // 先从Redis缓存获取
    const cachedSession = await cache.get<WechatSessionData>(CacheKeys.wechatLoginSession(ticket));
    if (cachedSession) {
      // 检查是否过期
      if (new Date() > cachedSession.expiresAt) {
        return { ...cachedSession, status: 'expired' };
      }
      return cachedSession;
    }

    // 缓存不存在，从数据库获取
    const session = await prisma.wechatLoginSession.findUnique({
      where: { ticket },
    });

    if (!session) {
      return null;
    }

    const sessionData: WechatSessionData = {
      id: session.id,
      ticket: session.ticket,
      sceneStr: session.sceneStr,
      status: session.status as SessionStatus,
      bindingMode: session.bindingMode,
      openid: session.openid,
      userId: session.userId,
      createdAt: session.createdAt!,
      expiresAt: session.expiresAt,
      scannedAt: session.scannedAt,
      confirmedAt: session.confirmedAt,
    };

    // 检查是否过期
    if (new Date() > session.expiresAt) {
      return { ...sessionData, status: 'expired' };
    }

    return sessionData;
  }

  /**
   * 通过场景值获取会话
   * @param sceneStr 场景值字符串
   */
  static async getSessionBySceneStr(sceneStr: string): Promise<WechatSessionData | null> {
    const session = await prisma.wechatLoginSession.findFirst({
      where: { sceneStr },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      return null;
    }

    const sessionData: WechatSessionData = {
      id: session.id,
      ticket: session.ticket,
      sceneStr: session.sceneStr,
      status: session.status as SessionStatus,
      bindingMode: session.bindingMode,
      openid: session.openid,
      userId: session.userId,
      createdAt: session.createdAt!,
      expiresAt: session.expiresAt,
      scannedAt: session.scannedAt,
      confirmedAt: session.confirmedAt,
    };

    return sessionData;
  }

  /**
   * 更新会话状态（用户扫码）
   * @param ticket 二维码ticket
   * @param openid 用户openid
   * @param wechatInfo 微信用户信息
   */
  static async updateSessionScanned(
    ticket: string,
    openid: string,
    wechatInfo?: { nickname?: string; headimgurl?: string }
  ): Promise<WechatSessionData | null> {
    const session = await prisma.wechatLoginSession.update({
      where: { ticket },
      data: {
        status: 'scanned',
        openid,
        scannedAt: new Date(),
      },
    });

    const sessionData: WechatSessionData = {
      id: session.id,
      ticket: session.ticket,
      sceneStr: session.sceneStr,
      status: 'scanned',
      bindingMode: session.bindingMode,
      openid: session.openid,
      userId: session.userId,
      createdAt: session.createdAt!,
      expiresAt: session.expiresAt,
      scannedAt: session.scannedAt,
      confirmedAt: session.confirmedAt,
      wechatNickname: wechatInfo?.nickname,
      wechatAvatar: wechatInfo?.headimgurl,
    };

    // 更新Redis缓存
    const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await cache.set(CacheKeys.wechatLoginSession(ticket), sessionData, ttl);
    }

    return sessionData;
  }

  /**
   * 更新会话状态（登录/绑定确认）
   * @param ticket 二维码ticket
   * @param userId 用户ID
   * @param status 最终状态
   */
  static async updateSessionConfirmed(
    ticket: string,
    userId: string,
    status: SessionStatus = 'confirmed'
  ): Promise<WechatSessionData | null> {
    const session = await prisma.wechatLoginSession.update({
      where: { ticket },
      data: {
        status,
        userId,
        confirmedAt: new Date(),
      },
    });

    const sessionData: WechatSessionData = {
      id: session.id,
      ticket: session.ticket,
      sceneStr: session.sceneStr,
      status,
      bindingMode: session.bindingMode,
      openid: session.openid,
      userId: session.userId,
      createdAt: session.createdAt!,
      expiresAt: session.expiresAt,
      scannedAt: session.scannedAt,
      confirmedAt: session.confirmedAt,
    };

    // 更新Redis缓存
    await cache.set(CacheKeys.wechatLoginSession(ticket), sessionData, 60); // 确认后缓存60秒

    return sessionData;
  }

  /**
   * 更新会话状态为未绑定
   * @param ticket 二维码ticket
   * @param openid 用户openid
   */
  static async updateSessionNotBound(
    ticket: string,
    openid: string
  ): Promise<WechatSessionData | null> {
    const session = await prisma.wechatLoginSession.update({
      where: { ticket },
      data: {
        status: 'not_bound',
        openid,
      },
    });

    const sessionData: WechatSessionData = {
      id: session.id,
      ticket: session.ticket,
      sceneStr: session.sceneStr,
      status: 'not_bound',
      bindingMode: session.bindingMode,
      openid: session.openid,
      userId: session.userId,
      createdAt: session.createdAt!,
      expiresAt: session.expiresAt,
      scannedAt: session.scannedAt,
      confirmedAt: session.confirmedAt,
    };

    // 更新Redis缓存
    const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await cache.set(CacheKeys.wechatLoginSession(ticket), sessionData, ttl);
    }

    return sessionData;
  }

  /**
   * 删除会话（清理过期或已使用的会话）
   * @param ticket 二维码ticket
   */
  static async deleteSession(ticket: string): Promise<boolean> {
    try {
      await prisma.wechatLoginSession.delete({
        where: { ticket },
      });
      await cache.del(CacheKeys.wechatLoginSession(ticket));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 清理所有过期会话
   */
  static async cleanExpiredSessions(): Promise<number> {
    const result = await prisma.wechatLoginSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}