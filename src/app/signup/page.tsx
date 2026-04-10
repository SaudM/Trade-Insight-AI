'use client';

import { SignupForm } from "@/components/app/auth/signup-form";
import { BarChart3 } from "lucide-react";
import Link from "next/link";

const PT = {
  bg:     '#ffffff',
  fog:    '#f6f6f3',
  sand:   '#e5e5e0',
  heading:'#211922',
  body:   '#62625b',
  muted:  '#91918c',
  border: '#e5e5e0',
  red:    '#e60023',
  redL:   'rgba(230,0,35,0.08)',
} as const;

const ff = { fontFeatureSettings: '"cv01" 1, "ss03" 1' } as const;

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4"
      style={{ ...ff, background: PT.fog, color: PT.body }}>

      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(${PT.sand} 1px, transparent 1px), linear-gradient(90deg, ${PT.sand} 1px, transparent 1px)`,
          backgroundSize: '56px 56px',
          opacity: 0.3,
        }}
      />

      {/* Top glow */}
      <div className="pointer-events-none fixed top-0 left-0 right-0 z-0 flex justify-center" style={{ height: 280 }}>
        <div style={{ width: '50vw', height: '100%', background: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(230,0,35,0.09) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full" style={{ maxWidth: 400 }}>

        {/* Top bar: logo + back */}
        <div className="flex items-center justify-between mb-7">
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
            <div className="flex items-center justify-center size-7 rounded-lg" style={{ background: PT.red }}>
              <BarChart3 className="h-3.5 w-3.5 text-white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 590, color: PT.heading, letterSpacing: '-0.2px' }}>
              复盘 · AI量化
            </span>
          </Link>
          <Link href="/" style={{ fontSize: 13, color: PT.muted, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = PT.body)}
            onMouseLeave={e => (e.currentTarget.style.color = PT.muted)}>
            ← 返回首页
          </Link>
        </div>

        {/* Card */}
        <div style={{ background: PT.bg, border: `1px solid ${PT.border}`, borderRadius: 16, padding: '32px 28px' }}>

          {/* Heading */}
          <div className="mb-7">
            <h1 style={{ fontSize: 22, fontWeight: 590, color: PT.heading, letterSpacing: '-0.5px', marginBottom: 6 }}>
              创建您的账户
            </h1>
            <p style={{ fontSize: 14, color: PT.muted }}>开始使用 AI 量化选股与交易复盘</p>
          </div>

          {/* Form */}
          <SignupForm />
        </div>

        {/* Footer */}
        <p className="mt-5 text-center" style={{ fontSize: 13, color: PT.muted }}>
          已有账户？{' '}
          <Link href="/login"
            style={{ color: PT.red, fontWeight: 590, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
