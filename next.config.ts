import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },


  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },

  output: 'standalone',
  reactStrictMode: true,

  // Next.js standalone tracing 默认把 undici 当 Node 内置而不打包，但我们的
  // firebase-admin.ts 显式 import 'undici'（用 ProxyAgent 走代理拉 Google JWKS），
  // 运行时会 MODULE_NOT_FOUND。强制把 undici 文件包进 standalone 输出。
  outputFileTracingIncludes: {
    '*': ['./node_modules/undici/**/*'],
  },

  // 安全响应头：所有路由统一下发
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  // compiler: {
  //   removeConsole: process.env.NODE_ENV === 'production',
  // },
};

export default nextConfig;
