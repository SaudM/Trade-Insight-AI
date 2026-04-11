import '@/lib/polyfills';
import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import { AuthProvider } from '@/components/providers/auth-provider';
import { AddToHomeScreenPrompt } from '@/components/app/add-to-home-screen-prompt';
import { HideInitialLoader } from '@/components/app/hide-initial-loader';

// 字体由 next/font 在构建时下载并从本域名提供，避免 Google CDN 在国内的 DNS 延迟。
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: '复利复盘 - Trade Insight AI | 智能交易复盘助手',
  description: '由AI驱动的交易笔记与复盘工具。自动识别交易模式，提供个性化改进建议，支持股票、外汇、加密货币市场。',
  keywords: ['交易复盘', 'AI交易分析', '股票软件', '外汇复盘', '交易日志', 'Trade Insight AI', '复利复盘'],
  openGraph: {
    title: '复利复盘 - Trade Insight AI',
    description: '您的24小时私人AI交易教练。',
    url: 'https://fupan.fulitimes.com',
    siteName: 'Trade Insight AI',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '复利复盘 - Trade Insight AI',
    description: '由AI驱动的交易笔记与复盘工具。',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="复利复盘" />
        <meta name="theme-color" content="#6366f1" />
      </head>
      <body className={cn('font-body antialiased')}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-R81L8E8WGJ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-R81L8E8WGJ');
          `}
        </Script>

        {/*
          纯 CSS 初始加载器 — 不依赖 JS，服务端 HTML 一到达即显示。
          与 BrandedLoading 设计一致，在 JS hydrate 后由 HideInitialLoader 移除。
        */}
        <div id="__il">
          <div id="__il-grid" />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div id="__il-icon">
              <svg width="28" height="22" viewBox="0 0 28 22" fill="none" style={{ overflow: 'visible' }}>
                <rect data-b="l" x="1"  y="2" width="6" height="20" rx="1.5" fill="white" fillOpacity="0.9" />
                <rect data-b="m" x="11" y="2" width="6" height="20" rx="1.5" fill="white" />
                <rect data-b="r" x="21" y="2" width="6" height="20" rx="1.5" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p id="__il-name">复利时间</p>
              <p id="__il-sub">正在加载…</p>
            </div>
          </div>
        </div>

        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <FirebaseClientProvider>
              {/* 在 Providers 内部 hydrate 后移除初始加载器，此时 BrandedLoading 已接管屏幕 */}
              <HideInitialLoader />
              {children}
              <Toaster />
              <AddToHomeScreenPrompt />
            </FirebaseClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
