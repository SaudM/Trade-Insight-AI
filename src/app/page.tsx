import { auth } from '@/auth';
import { TradeInsightsApp } from '@/components/app/trade-insights-app';
import { AuthStateManager } from '@/components/app/auth/auth-state-manager';
import { LandingPage } from '@/components/app/landing-page';

/**
 * 主页面组件 (Server Component)
 * 
 * SEO优化策略：
 * 1. 这是一个由于 'src/auth.ts' 产生的动态渲染 Server Component
 * 2. 在服务端检查 Session (NextAuth)
 * 3. 如果服务端已认证，直接预渲染应用外壳
 * 4. 如果服务端未认证，渲染落地页 (搜索引擎友好)
 * 5. 客户端 AuthStateManager 会接管并处理 Firebase 认证状态 (Hybrid Auth)
 */
export default async function Home() {
  const session = await auth();

  return (
    <AuthStateManager
      requireAuth={true}
      requireUserData={true}
      unauthenticatedComponent={<LandingPage />}
    // 如果服务端没有 session，不必强制显示 loading (SEO关键)
    // 但 AuthStateManager 内部逻辑仍会处理客户端 loading
    >
      <TradeInsightsApp />
    </AuthStateManager>
  );
}
