/**
 * 微信公众号API封装
 * 用于实现扫码登录功能
 */

import axios from 'axios';
import { cache, CacheConfig } from './redis';
import crypto from 'crypto';

// 微信公众号配置
const WECHAT_APPID = process.env.WECHAT_APPID || process.env.WX_APPID;
const WECHAT_APPSECRET = process.env.WECHAT_APPSECRET || process.env.WX_APPSECRET;
const WECHAT_TOKEN = process.env.WECHAT_TOKEN;

// AccessToken缓存键
const ACCESS_TOKEN_CACHE_KEY = 'wechat:access_token';
const ACCESS_TOKEN_TTL = 7000; // 7000秒，比微信的7200秒略短，提前刷新

/**
 * AccessToken结果
 */
interface AccessTokenResult {
  accessToken: string;
  expiresIn: number;
}

/**
 * 二维码创建结果
 */
interface QrcodeResult {
  ticket: string;
  expireSeconds: number;
  url: string;
  qrcodeUrl: string; // 用于显示的二维码URL
}

/**
 * 微信用户信息
 */
interface WechatUserInfo {
  openid: string;
  unionid?: string;
  nickname?: string;
  sex?: number;
  province?: string;
  city?: string;
  country?: string;
  headimgurl?: string;
  subscribe_time?: number;
  subscribe?: number;
}

/**
 * 微信公众号API类
 */
export class WechatOAuth {
  /**
   * 获取AccessToken
   * 使用Redis缓存，避免频繁调用微信API
   */
  async getAccessToken(): Promise<AccessTokenResult> {
    // 先从缓存获取
    const cachedToken = await cache.get<string>(ACCESS_TOKEN_CACHE_KEY);
    if (cachedToken) {
      return {
        accessToken: cachedToken,
        expiresIn: await cache.ttl(ACCESS_TOKEN_CACHE_KEY) || ACCESS_TOKEN_TTL,
      };
    }

    // 缓存不存在，调用微信API获取
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_APPSECRET}`;

    try {
      const response = await axios.get(url);
      const data = response.data;

      if (data.errcode) {
        throw new Error(`获取AccessToken失败: ${data.errmsg} (${data.errcode})`);
      }

      // 缓存AccessToken
      await cache.set(ACCESS_TOKEN_CACHE_KEY, data.access_token, ACCESS_TOKEN_TTL);

      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
      };
    } catch (error: any) {
      console.error('获取AccessToken失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建临时二维码（用于扫码登录）
   * @param sceneStr 场景值字符串（login_xxx 或 bind_xxx）
   * @param expireSeconds 过期时间（秒），最长30分钟（1800秒）
   */
  async createTempQrcode(sceneStr: string, expireSeconds: number = 300): Promise<QrcodeResult> {
    const { accessToken } = await this.getAccessToken();

    const url = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${accessToken}`;
    const body = {
      expire_seconds: expireSeconds,
      action_name: 'QR_STR_SCENE',
      action_info: {
        scene: {
          scene_str: sceneStr,
        },
      },
    };

    try {
      const response = await axios.post(url, body);
      const data = response.data;

      if (data.errcode) {
        throw new Error(`创建二维码失败: ${data.errmsg} (${data.errcode})`);
      }

      // 构造二维码显示URL
      const qrcodeUrl = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(data.ticket)}`;

      return {
        ticket: data.ticket,
        expireSeconds: data.expire_seconds,
        url: data.url,
        qrcodeUrl,
      };
    } catch (error: any) {
      console.error('创建临时二维码失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取用户信息（通过openid）
   * @param openid 用户openid
   */
  async getUserInfo(openid: string): Promise<WechatUserInfo> {
    const { accessToken } = await this.getAccessToken();

    const url = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;

    try {
      const response = await axios.get(url);
      const data = response.data;

      if (data.errcode) {
        throw new Error(`获取用户信息失败: ${data.errmsg} (${data.errcode})`);
      }

      return {
        openid: data.openid,
        unionid: data.unionid,
        nickname: data.nickname,
        sex: data.sex,
        province: data.province,
        city: data.city,
        country: data.country,
        headimgurl: data.headimgurl,
        subscribe_time: data.subscribe_time,
        subscribe: data.subscribe,
      };
    } catch (error: any) {
      console.error('获取用户信息失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证微信消息签名
   * 用于验证微信服务器推送的消息是否合法
   * @param signature 微信签名
   * @param timestamp 时间戳
   * @param nonce 随机数
   */
  verifySignature(signature: string, timestamp: string, nonce: string): boolean {
    if (!WECHAT_TOKEN) {
      console.warn('WECHAT_TOKEN未配置，跳过签名验证');
      return true;
    }

    // 将token、timestamp、nonce三个参数进行字典序排序
    const arr = [WECHAT_TOKEN, timestamp, nonce].sort();
    // 将三个参数字符串拼接成一个字符串进行sha1加密
    const str = arr.join('');
    const hash = crypto.createHash('sha1').update(str).digest('hex');

    // 与signature对比
    return hash === signature;
  }

  /**
   * 发送文本消息给用户
   * @param openid 用户openid
   * @param content 消息内容
   */
  async sendTextMessage(openid: string, content: string): Promise<boolean> {
    const { accessToken } = await this.getAccessToken();

    const url = `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`;
    const body = {
      touser: openid,
      msgtype: 'text',
      text: {
        content: content,
      },
    };

    try {
      const response = await axios.post(url, body);
      const data = response.data;

      if (data.errcode && data.errcode !== 0) {
        console.error(`发送消息失败: ${data.errmsg} (${data.errcode})`);
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('发送消息失败:', error.message);
      return false;
    }
  }
}

// 导出单例实例
export const wechatOAuth = new WechatOAuth();

/**
 * 解析微信XML消息
 * @param xml XML字符串
 */
export function parseWechatMessage(xml: string): {
  msgType: string;
  event?: string;
  eventKey?: string;
  openid: string;
  createTime: number;
  content?: string;
} {
  // 简单的XML解析（不使用外部库）
  const extractValue = (tag: string): string | undefined => {
    const match = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]></${tag}>|<${tag}>(.*?)</${tag}>`, 'i'));
    return match ? (match[1] || match[2]) : undefined;
  };

  return {
    msgType: extractValue('MsgType') || '',
    event: extractValue('Event'),
    eventKey: extractValue('EventKey'),
    openid: extractValue('FromUserName') || '',
    createTime: parseInt(extractValue('CreateTime') || '0'),
    content: extractValue('Content'),
  };
}

/**
 * 构造微信响应XML
 * @param toUser 目标用户openid
 * @param fromUser 公众号原始ID
 * @param content 消息内容
 */
export function buildTextResponse(toUser: string, fromUser: string, content: string): string {
  const createTime = Math.floor(Date.now() / 1000);
  return `<xml>
    <ToUserName><![CDATA[${toUser}]]></ToUserName>
    <FromUserName><![CDATA[${fromUser}]]></FromUserName>
    <CreateTime>${createTime}</CreateTime>
    <MsgType><![CDATA[text]]></MsgType>
    <Content><![CDATA[${content}]]></Content>
  </xml>`;
}