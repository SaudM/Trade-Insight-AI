import '@/lib/polyfills';
import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import { AuthProvider } from '@/components/providers/auth-provider';

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
    <html lang="zh" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk&display=swap" rel="stylesheet" />
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <FirebaseClientProvider>
              {children}
              <Toaster />
            </FirebaseClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
