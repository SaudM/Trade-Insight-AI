/**
 * 用户数据获取Hook
 * 严格分离认证与业务逻辑：Firebase UID仅用于认证验证，系统UID用于所有业务逻辑
 * 
 * 重要说明：
 * - id: 系统内部唯一标识符（UUID），用于所有业务逻辑
 * - firebaseUid: 仅用于Firebase认证，不应用于业务逻辑
 * - 当PostgreSQL连接失败时，不提供用户数据，确保业务逻辑的一致性
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/firebase/provider';
import { useSession } from 'next-auth/react';
import type { Subscription } from '@/lib/types';

/**
 * 用户数据接口
 * @interface UserData
 * @property {string} id - 系统内部唯一标识符（UUID），用于所有业务逻辑
 * @property {string} email - 用户邮箱
 * @property {string} name - 用户姓名
 * @property {string} firebaseUid - Firebase认证标识符，仅用于认证
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 * @property {string} wechatOpenid - 微信OpenID，用于微信扫码登录
 */
interface UserData {
  id: string;
  email: string;
  name: string;
  firebaseUid: string;
  createdAt: string;
  updatedAt: string;
  wechatOpenid?: string | null;
}

interface UserDataResponse {
  user: UserData | null;
  subscription: Subscription | null;
  isProUser: boolean;
  isTrialUser: boolean;
  source: 'postgres' | 'connection_failed';
}

export interface UseUserDataReturn {
  userData: UserDataResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 获取用户数据的自定义Hook
 * @param skip 传入 true 时跳过所有 fetch，直接返回空状态（供有上下文共享数据时使用）
 */
export function useUserData(skip?: boolean): UseUserDataReturn {
  const { user: firebaseUser, isUserLoading: isFirebaseLoading } = useUser();
  const { data: session, status: sessionStatus } = useSession();
  const [userData, setUserData] = useState<UserDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(!skip); // skip=true 时初始不进入 loading 状态
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    // Check if either Firebase user OR NextAuth session user exists
    const sessionUser = session?.user;

    // 没有任何认证来源 → 确认未登录
    if (!firebaseUser && !sessionUser) {
      setUserData(null);
      setIsLoading(false);
      return;
    }

    // 有 session 但还没有可用的系统 ID，且 Firebase 也还未加载完
    // 此时不能失败，静默等待 Firebase 就绪后由 effect 重新触发
    if (!sessionUser?.id && !firebaseUser) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response;
      // Prioritize Session User ID (System ID) if available
      if (sessionUser?.id) {
        response = await fetch(`/api/user?uid=${sessionUser.id}`);
      } else if (firebaseUser) {
        response = await fetch(`/api/user?firebaseUid=${firebaseUser.uid}`);
      } else {
        // 理论上不会走到这里（上方已守卫），防御性处理
        setIsLoading(false);
        return;
      }

      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        setUserData(data);
        setIsLoading(false);
        return;
      }

      // 401 = session 失效（典型场景：NEXTAUTH_SECRET 轮换或登出后旧 cookie 验签失败）。
      // 这不是数据库错误，置空让上层走"未登录"分支（显示"前往登录"），避免误报 DB 异常。
      if (response.status === 401) {
        setUserData(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      // 如果用户不存在，尝试创建用户 (Only for Firebase users, NextAuth users are created on registration)
      if (response.status === 404) {
        if (firebaseUser) {
          const createResponse = await fetch('/api/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firebaseUid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown',
              googleId: firebaseUser.providerData.find(p => p.providerId === 'google.com')?.uid,
            }),
          });

          if (createResponse.ok) {
            // 创建成功后重新获取用户数据
            const retryResponse = await fetch(`/api/user?firebaseUid=${firebaseUser.uid}`);
            if (retryResponse.ok) {
              const result = await retryResponse.json();
              const data = result.data;
              setUserData(data);
              setIsLoading(false);
              return;
            }
          }
        } else {
          // Session user should usually exist in DB if they have a session, unless deleted.
          console.warn("NextAuth user not found in DB but has session.");
        }
      }

      // PostgreSQL连接失败或其他错误
      console.error('PostgreSQL用户数据获取失败，无法提供用户数据');
      setError('数据库连接失败，请稍后重试');
      setUserData({
        user: null,
        subscription: null,
        isProUser: false,
        isTrialUser: false,
        source: 'connection_failed',
      });

    } catch (error) {
      console.error('获取用户数据失败:', error);
      setError(error instanceof Error ? error.message : '数据库连接失败');

      // 发生错误时不提供备用数据，确保业务逻辑一致性
      setUserData({
        user: null,
        subscription: null,
        isProUser: false,
        isTrialUser: false,
        source: 'connection_failed',
      });
    }

    setIsLoading(false);
  }, [firebaseUser, session]); // Add session to dependency

  useEffect(() => {
    if (skip) return; // 由上层 Context 提供数据，跳过 fetch

    const isSessionLoading = sessionStatus === 'loading';
    if (isSessionLoading) return;

    if (sessionStatus === 'authenticated') {
      // NextAuth 已确认登录，无需等待 Firebase，立即获取用户数据
      fetchUserData();
    } else if (!isFirebaseLoading) {
      // NextAuth 未登录，等待 Firebase 兜底确认后再获取
      fetchUserData();
    }
  }, [skip, fetchUserData, isFirebaseLoading, sessionStatus]);

  return {
    userData,
    // skip=true 时由上层 Context 负责数据，本实例不应阻塞；
    // 否则 NextAuth 用户不等 Firebase，Firebase-only 用户等 Firebase 完成
    isLoading: skip ? false : (isLoading || sessionStatus === 'loading' || (sessionStatus !== 'authenticated' && isFirebaseLoading)),
    error,
    refetch: fetchUserData,
  };
}