"use client";

import { ReactNode } from 'react';
import { useUser } from '@/firebase/provider';
import { useSession } from 'next-auth/react';
import { useUserData } from '@/hooks/use-user-data';
import { DatabaseErrorFallback } from './database-error-fallback';
import { BrandedLoading } from '@/components/app/branded-loading';

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
  const { data: session, status: sessionStatus } = useSession();
  const { userData, isLoading: isUserDataLoading, error: userDataError, refetch } = useUserData();

  // 默认加载组件
  const defaultLoadingComponent = <BrandedLoading />;

  // 默认未认证组件
  const defaultUnauthenticatedComponent = (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f6f6f3' }}>
      <div className="text-center">
        <p style={{ color: '#91918c', fontSize: 14, marginBottom: 12 }}>请先登录以访问此页面</p>
        <a href="/login" style={{ color: '#e60023', fontSize: 14, fontWeight: 600 }}>前往登录</a>
      </div>
    </div>
  );

  // 认证状态判断策略：
  // 1. NextAuth session 读取 HTTP cookie，几乎瞬间完成，优先作为登录态依据。
  // 2. 若 NextAuth 已确认登录（authenticated），无需等待 Firebase，直接放行。
  //    Firebase 会在后台继续初始化，不阻塞渲染。
  // 3. 若 NextAuth 尚未确认（loading），短暂等待（cookie 读取极快）。
  // 4. 若 NextAuth 确认未登录（unauthenticated），再等 Firebase 作为兜底
  //    （兼容仅用 Firebase 登录、NextAuth 未同步的场景）。

  // NextAuth 还在读 cookie，短暂等待
  if (sessionStatus === 'loading') {
    return loadingComponent || defaultLoadingComponent;
  }

  // NextAuth 未登录 + Firebase 还在初始化 → 等 Firebase 兜底
  if (sessionStatus !== 'authenticated' && isFirebaseLoading) {
    return loadingComponent || defaultLoadingComponent;
  }

  // 需要认证但用户未登录（NextAuth 和 Firebase 都确认无登录态）
  if (requireAuth && !firebaseUser && !session?.user) {
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
  const { data: session, status: sessionStatus } = useSession();
  const { userData, isLoading: isUserDataLoading, error: userDataError, refetch } = useUserData();

  return {
    // Firebase认证状态
    firebaseUser,
    isFirebaseLoading,
    firebaseError: userError,

    // NextAuth状态
    sessionUser: session?.user,
    isSessionLoading: sessionStatus === 'loading',

    // 用户数据状态
    userData,
    isUserDataLoading,
    userDataError,
    refetchUserData: refetch,

    // 综合状态
    isAuthenticated: !!firebaseUser || !!session?.user,
    hasUserData: !!userData?.user,
    isLoading: isFirebaseLoading || sessionStatus === 'loading' || isUserDataLoading,
    isDatabaseConnected: userData?.source === 'postgres',
  };
}