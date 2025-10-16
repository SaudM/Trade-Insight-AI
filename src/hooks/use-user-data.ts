/**
 * 用户数据获取Hook
 * 优先从PostgreSQL获取用户数据，Firebase作为备用
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/firebase/provider';
import type { Subscription } from '@/lib/types';

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
  source: 'postgres' | 'firebase' | 'postgres_failed';
}

interface UseUserDataReturn {
  userData: UserDataResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 获取用户数据的自定义Hook
 * 优先从PostgreSQL获取，失败时使用Firebase数据
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
      // 首先尝试从PostgreSQL获取用户数据
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

      // PostgreSQL失败，使用Firebase数据作为备用
      console.warn('PostgreSQL用户数据获取失败，使用Firebase数据');
      
      // 计算试用状态
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const userCreationDate = firebaseUser.metadata.creationTime 
        ? new Date(firebaseUser.metadata.creationTime) 
        : new Date();
      const isTrialUser = userCreationDate > thirtyDaysAgo;

      setUserData({
        user: {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown',
          firebaseUid: firebaseUser.uid,
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        subscription: null, // Firebase中的订阅数据需要单独获取
        isProUser: false, // 暂时设为false，需要从Firebase获取
        isTrialUser,
        source: 'firebase',
      });

    } catch (error) {
      console.error('获取用户数据失败:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      
      // 发生错误时也使用Firebase数据作为备用
      if (firebaseUser) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const userCreationDate = firebaseUser.metadata.creationTime 
          ? new Date(firebaseUser.metadata.creationTime) 
          : new Date();
        const isTrialUser = userCreationDate > thirtyDaysAgo;

        setUserData({
          user: {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown',
            firebaseUid: firebaseUser.uid,
            createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          subscription: null,
          isProUser: false,
          isTrialUser,
          source: 'firebase',
        });
      }
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