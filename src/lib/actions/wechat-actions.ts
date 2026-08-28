'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { UserAdapter } from '@/lib/adapters/user-adapter';

/**
 * 使用微信OpenID登录
 * @param openid 微信用户OpenID
 * @param userId 用户ID（如果是已绑定用户）
 */
export async function wechatSignIn(openid: string, userId?: string) {
  try {
    // 如果提供了userId，直接使用userId登录
    if (userId) {
      const user = await UserAdapter.getUserByUid(userId);
      if (user) {
        // 使用自定义的wechat provider进行登录
        await signIn('wechat', {
          userId: user.id,
          redirect: false,
        });
        return { success: true, message: '登录成功' };
      }
    }

    // 查找微信绑定的用户
    const user = await UserAdapter.getUserByWechatOpenid(openid);
    if (user) {
      await signIn('wechat', {
        userId: user.id,
        redirect: false,
      });
      return { success: true, message: '登录成功' };
    }

    return { success: false, message: '该微信未绑定账号' };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === 'CredentialsSignin') {
        return { success: false, message: '登录失败，请稍后重试' };
      }
      return { success: false, message: '登录出错' };
    }
    throw error;
  }
}

/**
 * 完成微信扫码登录后的session建立
 * 在API callback中调用此函数来建立登录session
 */
export async function completeWechatLogin(userId: string) {
  try {
    await signIn('wechat', {
      userId,
      redirect: false,
    });
    return true;
  } catch (error) {
    console.error('完成微信登录失败:', error);
    return false;
  }
}