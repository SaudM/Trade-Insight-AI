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
 */
interface UserData {
  id: string;
  email: string;
  name: string;
  firebaseUid: string;
  createdAt: string;
  updatedAt: string;
}

interface UserDataResponse {
  user: UserData | null;
  subscription: Subscription | null;
  isProUser: boolean;
  isTrialUser: boolean;
  source: 'postgres' | 'connection_failed';
}

interface UseUserDataReturn {
  userData: UserDataResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 获取用户数据的自定义Hook
 * 严格要求从PostgreSQL获取用户数据，确保业务逻辑的一致性
 * 当数据库连接失败时，不提供备用数据，避免业务逻辑混乱
 */
export function useUserData(): UseUserDataReturn {
  const { user: firebaseUser, isUserLoading } = useUser();
  const [userData, setUserData] = useState<UserDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    if (!firebaseUser) {
      setUserData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 从PostgreSQL获取用户数据
      const response = await fetch(`/api/user?firebaseUid=${firebaseUser.uid}`);
      
      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        setUserData(data);
        setIsLoading(false);
        return;
      }

      // 如果用户不存在，尝试创建用户
      if (response.status === 404) {
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
  }, [firebaseUser]);

  useEffect(() => {
    if (!isUserLoading) {
      fetchUserData();
    }
  }, [fetchUserData, isUserLoading]);

  return {
    userData,
    isLoading: isLoading || isUserLoading,
    error,
    refetch: fetchUserData,
  };
}