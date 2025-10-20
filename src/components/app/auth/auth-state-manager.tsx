"use client";

import { ReactNode } from 'react';
import { useUser } from '@/firebase/provider';
import { useUserData } from '@/hooks/use-user-data';
import { DatabaseErrorFallback } from './database-error-fallback';
import { Loader2 } from 'lucide-react';

interface AuthStateManagerProps {
  /** 子组件 */
  children: ReactNode;
  /** 需要认证的页面 */
  requireAuth?: boolean;
  /** 需要用户数据的页面 */
  requireUserData?: boolean;
  /** 自定义加载组件 */
  loadingComponent?: ReactNode;
  /** 自定义未认证组件 */
  unauthenticatedComponent?: ReactNode;
}

/**
 * 认证状态管理组件
 * 统一处理Firebase认证状态和PostgreSQL用户数据状态
 * 确保认证与业务逻辑的清晰分离
 * 
 * @component
 * @param {AuthStateManagerProps} props - 组件属性
 * @returns {JSX.Element} 根据认证状态渲染相应内容
 */
export function AuthStateManager({
  children,
  requireAuth = false,
  requireUserData = false,
  loadingComponent,
  unauthenticatedComponent,
}: AuthStateManagerProps) {
  const { user: firebaseUser, isUserLoading: isFirebaseLoading } = useUser();
  const { userData, isLoading: isUserDataLoading, error: userDataError, refetch } = useUserData();

  // 默认加载组件
  const defaultLoadingComponent = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">正在加载...</p>
      </div>
    </div>
  );

  // 默认未认证组件
  const defaultUnauthenticatedComponent = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-4">请先登录以访问此页面</p>
        <a 
          href="/login" 
          className="text-blue-600 hover:text-blue-800 underline"
        >
          前往登录
        </a>
      </div>
    </div>
  );

  // Firebase认证加载中
  if (isFirebaseLoading) {
    return loadingComponent || defaultLoadingComponent;
  }

  // 需要认证但用户未登录
  if (requireAuth && !firebaseUser) {
    return unauthenticatedComponent || defaultUnauthenticatedComponent;
  }

  // 需要用户数据的情况
  if (requireUserData) {
    // 用户数据加载中
    if (isUserDataLoading) {
      return loadingComponent || defaultLoadingComponent;
    }

    // 数据库连接失败
    if (userDataError && userData?.source === 'connection_failed') {
      return (
        <DatabaseErrorFallback
          error={userDataError}
          onRetry={refetch}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      );
    }

    // 需要用户数据但获取失败（用户未登录或数据不存在）
    if (!userData?.user) {
      return unauthenticatedComponent || defaultUnauthenticatedComponent;
    }
  }

  // 所有条件满足，渲染子组件
  return <>{children}</>;
}

/**
 * 认证状态管理Hook
 * 提供当前的认证和用户数据状态
 * 
 * @returns {object} 认证和用户数据状态
 */
export function useAuthState() {
  const { user: firebaseUser, isUserLoading: isFirebaseLoading, userError } = useUser();
  const { userData, isLoading: isUserDataLoading, error: userDataError, refetch } = useUserData();

  return {
    // Firebase认证状态
    firebaseUser,
    isFirebaseLoading,
    firebaseError: userError,
    
    // 用户数据状态
    userData,
    isUserDataLoading,
    userDataError,
    refetchUserData: refetch,
    
    // 综合状态
    isAuthenticated: !!firebaseUser,
    hasUserData: !!userData?.user,
    isLoading: isFirebaseLoading || isUserDataLoading,
    isDatabaseConnected: userData?.source === 'postgres',
  };
}