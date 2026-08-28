/**
 * Firebase ID Token 服务端验签（jose + 可选 HTTPS 代理自动刷新 JWKS）。
 *
 * 背景：墙内服务器无法直接访问 Google 公钥端点。
 * - 若设置了 FIREBASE_JWKS_PROXY 环境变量（HTTP CONNECT 代理 URL），会通过该代理
 *   每 1 小时自动从 Google 拉取最新公钥；
 * - 若没有代理或代理失败，会用打包时嵌入的静态 JWKS 兜底（见
 *   src/lib/google-securetoken-jwks.json，由 scripts/refresh-google-keys.sh 手动更新）。
 *
 * 注：使用自定义变量名 FIREBASE_JWKS_PROXY 而非通用的 HTTPS_PROXY，避免其他依赖
 * （axios / urllib 等）自动 pickup 把所有外发流量都走代理。
 */
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from 'jose';
import { ProxyAgent, fetch as undiciFetch, type Dispatcher } from 'undici';
import { firebaseConfig } from '@/firebase/config';
import staticJwks from './google-securetoken-jwks.json';

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 每 1 小时刷新一次

type LocalJWKSetFn = ReturnType<typeof createLocalJWKSet>;

let JWKS: LocalJWKSetFn = createLocalJWKSet(staticJwks as JSONWebKeySet);
let lastRefreshAt = 0;
let inFlightRefresh: Promise<void> | null = null;

const proxyUrl = process.env.FIREBASE_JWKS_PROXY;
const dispatcher: Dispatcher | undefined = proxyUrl ? new ProxyAgent({ uri: proxyUrl }) : undefined;
if (proxyUrl) {
  console.log('[Auth] Firebase JWKS will fetch via proxy:', proxyUrl);
} else {
  console.log('[Auth] Firebase JWKS: no proxy configured, using static embedded keys');
}

async function refreshJWKS(): Promise<void> {
  if (inFlightRefresh) return inFlightRefresh;
  inFlightRefresh = (async () => {
    try {
      const res = await undiciFetch(JWKS_URL, {
        dispatcher,
        headers: { 'User-Agent': 'trade-insight-app-jwks' },
      } as any);
      if (!res.ok) {
        console.warn('[Auth] JWKS refresh: HTTP', res.status);
        return;
      }
      const data = (await res.json()) as JSONWebKeySet & { keys: any[] };
      if (Array.isArray(data?.keys) && data.keys.length > 0) {
        JWKS = createLocalJWKSet(data);
        lastRefreshAt = Date.now();
        console.log(
          '[Auth] JWKS refreshed:',
          data.keys.length,
          'keys, kids:',
          data.keys.map((k: any) => (k.kid || '').substring(0, 10)).join(',')
        );
      }
    } catch (e: any) {
      console.warn('[Auth] JWKS refresh failed (will fall back to current keys):', e?.message || e);
    } finally {
      inFlightRefresh = null;
    }
  })();
  return inFlightRefresh;
}

async function maybeRefresh(force = false): Promise<void> {
  if (force || Date.now() - lastRefreshAt > REFRESH_INTERVAL_MS) {
    await refreshJWKS();
  }
}

async function verifyOnce(idToken: string) {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${firebaseConfig.projectId}`,
    audience: firebaseConfig.projectId,
    algorithms: ['RS256'],
  });
  const uid = (payload.sub || (payload as any).user_id) as string | undefined;
  if (!uid) throw new Error('Firebase ID Token 缺少 sub/user_id');
  return { ...payload, uid };
}

async function verifyIdToken(idToken: string): Promise<{ uid: string } & Record<string, any>> {
  // 第一次 verify 前尝试刷新（不阻塞登录：如果代理慢/失败，jose 会用现有 keys）
  await maybeRefresh();
  try {
    return await verifyOnce(idToken);
  } catch (e: any) {
    // kid 不匹配（公钥已轮换）→ 强制刷新后再试一次
    const code = e?.code || '';
    const msg = e?.message || '';
    if (code === 'ERR_JWKS_NO_MATCHING_KEY' || /no.*matching.*key/i.test(msg)) {
      console.log('[Auth] kid not found in cache, force-refreshing JWKS and retrying...');
      await refreshJWKS();
      return await verifyOnce(idToken);
    }
    throw e;
  }
}

export const adminAuth = { verifyIdToken };
