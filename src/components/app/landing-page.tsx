'use client';

import {
  BarChart,
  Brain,
  Shield,
  TrendingUp,
  Users,
  Star,
  ArrowRight,
  CheckCircle,
  Bell,
  Target,
  LineChart,
  Zap,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LandingPage() {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: '#080c14', color: '#e2e8f0' }}
    >
      {/* ── 背景层：网格线 ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── 背景层：光晕 Orbs ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* 左上蓝色 */}
        <div
          className="animate-pulse-glow absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
          }}
        />
        {/* 右下紫色 */}
        <div
          className="animate-pulse-glow absolute -bottom-60 -right-40 h-[700px] w-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
            animationDelay: '2s',
          }}
        />
        {/* 中间绿色（量化/收益感） */}
        <div
          className="animate-pulse-glow absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)',
            animationDelay: '4s',
          }}
        />
      </div>

      {/* ── 背景层：浮动粒子 ── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {[
          { top: '12%', left: '8%', size: 3, delay: '0s', color: 'rgba(99,102,241,0.6)' },
          { top: '28%', left: '82%', size: 2, delay: '1.5s', color: 'rgba(34,197,94,0.5)' },
          { top: '55%', left: '15%', size: 4, delay: '3s', color: 'rgba(139,92,246,0.5)' },
          { top: '70%', left: '72%', size: 2, delay: '0.8s', color: 'rgba(59,130,246,0.6)' },
          { top: '88%', left: '40%', size: 3, delay: '2.2s', color: 'rgba(34,197,94,0.4)' },
          { top: '18%', left: '55%', size: 2, delay: '4s', color: 'rgba(251,191,36,0.4)' },
          { top: '42%', left: '90%', size: 3, delay: '1s', color: 'rgba(99,102,241,0.5)' },
          { top: '78%', left: '5%', size: 2, delay: '3.5s', color: 'rgba(139,92,246,0.4)' },
        ].map((p, i) => (
          <div
            key={i}
            className="animate-float absolute rounded-full"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.color,
              animationDelay: p.delay,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            }}
          />
        ))}
      </div>

      {/* ── 导航栏 ── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto"
        style={{
          background: 'rgba(8,12,20,0.7)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(99,102,241,0.15)',
        }}
      >
        <div className="flex items-center space-x-2">
          <div
            className="flex items-center justify-center size-9 rounded-xl"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}
          >
            <BarChart className="h-5 w-5 text-white" />
          </div>
          <span
            className="font-headline text-xl font-bold"
            style={{ background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            复盘 · AI量化
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/login"
            className="text-sm transition-colors hover:text-slate-200"
            style={{ color: '#94a3b8' }}
          >
            登录
          </Link>
          <Link href="/signup">
            <button
              className="cursor-pointer whitespace-nowrap text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-85 hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff' }}
            >
              免费注册
            </button>
          </Link>
        </div>
      </nav>

      {/* ── 主内容 ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-16">

        {/* 英雄区域 */}
        <section className="text-center mb-20">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm mb-8"
            style={{
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#818cf8',
            }}
          >
            <Zap className="h-3.5 w-3.5" />
            AI 量化 · A股选股 · 每日自动更新
          </div>

          <h1
            className="font-headline text-5xl md:text-7xl font-bold mb-6 leading-tight"
            style={{
              background: 'linear-gradient(135deg,#f1f5f9 0%,#60a5fa 50%,#a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            让 AI 帮你<br />复盘选股
          </h1>

          <p className="text-lg max-w-2xl mx-auto mb-4 leading-relaxed" style={{ color: '#94a3b8' }}>
            基于 MACD W底量化策略，结合板块资金流热度与智能评分，<br />
            每日自动扫描全市场 <span style={{ color: '#f1f5f9', fontWeight: 600 }}>5000+</span> 股票，
            精准发现高胜率买入信号，并<span style={{ color: '#34d399', fontWeight: 600 }}>实时推送到你的手机</span>。
          </p>
          <p className="text-sm mb-10" style={{ color: '#64748b' }}>
            解决三大痛点：
            <span style={{ color: '#e2e8f0' }}>不知道买什么</span> ·{' '}
            <span style={{ color: '#e2e8f0' }}>不知道什么时候买</span> ·{' '}
            <span style={{ color: '#e2e8f0' }}>错过信号后知后觉</span>
          </p>

          {/* CTA 按钮组 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 mb-14">
            <Link href="/signup">
              <button
                className="cursor-pointer group inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98] whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
                  color: '#fff',
                  boxShadow: '0 0 0 1px rgba(99,102,241,0.35), 0 4px 20px rgba(99,102,241,0.4)',
                }}
              >
                免费开始使用
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </Link>

            <Link href="/login">
              <button
                className="cursor-pointer inline-flex items-center gap-1.5 px-7 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98] whitespace-nowrap"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#94a3b8',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                已有账户&nbsp;<span style={{ color: '#60a5fa' }}>登录</span>
              </button>
            </Link>
          </div>

          {/* 关键数据卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-12">
            {[
              { value: '~40%', label: '策略年化收益', color: '#34d399' },
              { value: '<15%', label: '最大回撤', color: '#60a5fa' },
              { value: '5000+', label: '每日扫描标的', color: '#a78bfa' },
              { value: '全自动', label: '收盘后自动更新', color: '#fbbf24' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 信任指标 */}
          <div className="flex flex-wrap justify-center gap-8" style={{ color: '#64748b' }}>
            {[
              { icon: <Users className="h-4 w-4" style={{ color: '#60a5fa' }} />, text: '1000+ 交易者信任' },
              { icon: <Shield className="h-4 w-4" style={{ color: '#34d399' }} />, text: '数据安全加密' },
              { icon: <TrendingUp className="h-4 w-4" style={{ color: '#a78bfa' }} />, text: '回测年化 ~40%' },
            ].map((t) => (
              <div key={t.text} className="flex items-center gap-2 text-sm">
                {t.icon}
                <span>{t.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 三大核心能力 ── */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-3" style={{ color: '#f1f5f9' }}>三大核心能力</h2>
          <p className="text-center mb-12" style={{ color: '#64748b' }}>从选股到通知，全流程 AI 自动化</p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Brain className="h-8 w-8" style={{ color: '#60a5fa' }} />,
                iconBg: 'rgba(59,130,246,0.15)',
                border: 'rgba(59,130,246,0.25)',
                glow: 'rgba(59,130,246,0.08)',
                title: 'AI 复盘',
                desc: '每日收盘后，AI 自动分析持仓与历史交易，找出规律与不足，像专业操盘手一样给出改进建议。',
                items: ['自动识别成功/失败交易模式', '情绪与心态影响分析', '日/周/月多维度复盘报告', '个性化改进路径推荐'],
                checkColor: '#60a5fa',
              },
              {
                icon: <Activity className="h-8 w-8" style={{ color: '#34d399' }} />,
                iconBg: 'rgba(34,197,94,0.15)',
                border: 'rgba(34,197,94,0.25)',
                glow: 'rgba(34,197,94,0.06)',
                title: '量化策略选股',
                desc: 'MACD W底双重金叉 + 底背离检测，结合板块资金流热度与智能评分，每日自动筛出最优买入候选。',
                items: ['MACD W底双重金叉捕捉反转', '板块资金流热度筛选强势股', '多维度智能评分自动排序', 'NAV 净值曲线回测验证'],
                checkColor: '#34d399',
              },
              {
                icon: <Bell className="h-8 w-8" style={{ color: '#a78bfa' }} />,
                iconBg: 'rgba(139,92,246,0.15)',
                border: 'rgba(139,92,246,0.25)',
                glow: 'rgba(139,92,246,0.08)',
                title: '策略信号订阅通知',
                desc: '订阅感兴趣的量化策略或个股，信号触发后第一时间推送到手机，再也不错过关键买点。',
                items: ['自定义策略/个股订阅', '微信/应用内实时推送', '信号强度评级+买入理由', '历史信号胜率追踪'],
                checkColor: '#a78bfa',
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl p-6 transition-transform hover:-translate-y-1"
                style={{
                  background: `radial-gradient(ellipse at top left, ${c.glow}, transparent 60%), rgba(255,255,255,0.03)`,
                  border: `1px solid ${c.border}`,
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ background: c.iconBg }}>{c.icon}</div>
                  <h3 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>{c.title}</h3>
                </div>
                <p className="text-sm mb-5 leading-relaxed" style={{ color: '#94a3b8' }}>{c.desc}</p>
                <ul className="space-y-2.5">
                  {c.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm" style={{ color: '#cbd5e1' }}>
                      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: c.checkColor }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── 完整功能体系（6宫格）── */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-3" style={{ color: '#f1f5f9' }}>完整功能体系</h2>
          <p className="text-center mb-12" style={{ color: '#64748b' }}>覆盖选股 · 分析 · 通知 · 复盘全流程</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <Activity className="h-5 w-5" style={{ color: '#34d399' }} />, iconBg: 'rgba(34,197,94,0.15)', title: 'MACD W底策略', desc: '双重金叉确认 + 底背离检测，自动捕捉趋势反转最佳入场时机，减少假信号干扰。' },
              { icon: <BarChart className="h-5 w-5" style={{ color: '#fb923c' }} />, iconBg: 'rgba(251,146,60,0.15)', title: '板块资金流热度', desc: '实时追踪主力资金流向，优先筛选热点板块中的强势个股，顺势而为。' },
              { icon: <Target className="h-5 w-5" style={{ color: '#60a5fa' }} />, iconBg: 'rgba(59,130,246,0.15)', title: '智能评分系统', desc: '综合技术面与资金面多维度量化评分，自动排序买入优先级，决策有据可依。' },
              { icon: <LineChart className="h-5 w-5" style={{ color: '#a78bfa' }} />, iconBg: 'rgba(139,92,246,0.15)', title: '收益曲线回测', desc: '完整历史回测与 NAV 净值曲线，年化 ~40%、最大回撤 <15%，策略表现透明可查。' },
              { icon: <Brain className="h-5 w-5" style={{ color: '#f472b6' }} />, iconBg: 'rgba(244,114,182,0.15)', title: 'AI 复盘分析', desc: '自动分析每笔交易成败逻辑，识别个人交易盲点，提供可执行的改进建议。' },
              { icon: <Bell className="h-5 w-5" style={{ color: '#fbbf24' }} />, iconBg: 'rgba(251,191,36,0.15)', title: '信号实时推送', desc: '量化信号触发即刻通知，支持按策略、板块、个股订阅，不遗漏每个关键买点。' },
            ].map((f) => (
              <div
                key={f.title}
                className="flex gap-4 p-5 rounded-xl transition-all hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="p-2.5 rounded-lg h-fit shrink-0" style={{ background: f.iconBg }}>{f.icon}</div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: '#f1f5f9' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 用户痛点 ── */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-3" style={{ color: '#f1f5f9' }}>你是否有这些困惑？</h2>
          <p className="text-center mb-12" style={{ color: '#64748b' }}>复盘 AI 量化平台，逐一解决</p>

          {/* 表头 */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-px mb-2 px-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#f87171' }}>
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>✕</span>
                常见困惑
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#34d399' }}>
                <CheckCircle className="h-3.5 w-3.5" style={{ color: '#34d399' }} />
                平台解决方案
              </div>
            </div>

            {/* 分隔线 */}
            <div className="h-px mb-4" style={{ background: 'rgba(255,255,255,0.07)' }} />

            {/* 每行：左痛点 | 右方案，两列等高对齐 */}
            <div className="flex flex-col gap-px rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                {
                  pain: '每天看盘几十只，不知道优先关注哪只',
                  solution: '量化策略每日自动筛选 Top 信号股，按评分排序，开盘前清单已就绪',
                },
                {
                  pain: '看到好的买入机会，下单时已经涨了',
                  solution: '信号订阅通知，策略触发时第一时间推送手机，不再后知后觉',
                },
                {
                  pain: '亏损后不知道哪里出了问题，总犯同样的错',
                  solution: 'AI 复盘自动分析失败模式，找出个人交易弱点并给出改进建议',
                },
                {
                  pain: '市面上策略听起来很好，没有真实数据验证',
                  solution: '完整回测 + NAV 净值曲线，~40% 年化历史表现透明公开',
                },
              ].map((item, idx) => (
                <div
                  key={item.pain}
                  className="grid grid-cols-2 gap-px"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  {/* 左列：痛点 */}
                  <div
                    className="flex items-start gap-3 px-5 py-4"
                    style={{
                      background: idx % 2 === 0 ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.02)',
                      borderRight: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span
                      className="shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                    >
                      ✕
                    </span>
                    <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{item.pain}</p>
                  </div>

                  {/* 右列：解决方案 */}
                  <div
                    className="flex items-start gap-3 px-5 py-4"
                    style={{
                      background: idx % 2 === 0 ? 'rgba(34,197,94,0.04)' : 'rgba(34,197,94,0.02)',
                    }}
                  >
                    <CheckCircle className="shrink-0 mt-0.5 h-4 w-4" style={{ color: '#34d399' }} />
                    <p className="text-sm font-medium leading-relaxed" style={{ color: '#e2e8f0' }}>{item.solution}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 用户评价 ── */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#f1f5f9' }}>真实用户反馈</h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: '张先生 · 职业交易员', sub: 'A股市场，5年经验',
                text: '"信号通知是最大亮点，以前总错过买点，现在策略触发手机就响。配合 AI 复盘，胜率两个月内从 45% 提升到 62%。"',
              },
              {
                name: '李女士 · 股票投资者', sub: 'A股市场，3年经验',
                text: '"MACD W底策略很准，板块资金流热度让我知道主力在哪。AI 复盘让我发现自己总在高位追涨，改掉后亏损明显减少了。"',
              },
            ].map((r) => (
              <div
                key={r.name}
                className="p-6 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold" style={{ color: '#f1f5f9' }}>{r.name}</p>
                    <p className="text-sm" style={{ color: '#64748b' }}>{r.sub}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{r.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="text-center mb-16">
          <div
            className="max-w-4xl mx-auto rounded-2xl p-12"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.12) 100%)',
              border: '1px solid rgba(99,102,241,0.3)',
              boxShadow: '0 0 60px rgba(99,102,241,0.1)',
            }}
          >
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#f1f5f9' }}>立即开启 AI 量化投资之旅</h2>
            <p className="mb-8" style={{ color: '#94a3b8' }}>
              免费注册，体验 AI 复盘 · 量化选股 · 信号实时推送，<br />让 AI 成为你的专属量化分析师。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-2">
              <Link href="/signup">
                <button
                  className="cursor-pointer group inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98] whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
                    color: '#fff',
                    boxShadow: '0 0 0 1px rgba(99,102,241,0.35), 0 4px 20px rgba(99,102,241,0.4)',
                  }}
                >
                  免费注册，立即体验
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </Link>
              <Link href="/login">
                <button
                  className="cursor-pointer inline-flex items-center gap-1.5 px-7 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98] whitespace-nowrap"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#94a3b8',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                >
                  已有账户&nbsp;<span style={{ color: '#60a5fa' }}>登录</span>
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── 页脚 ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <div
                className="flex items-center justify-center size-8 rounded-xl"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}
              >
                <BarChart className="h-4 w-4 text-white" />
              </div>
              <span className="font-headline text-lg font-bold" style={{ color: '#94a3b8' }}>复盘 · AI量化</span>
            </div>

            <div className="flex flex-wrap gap-6 text-sm" style={{ color: '#475569' }}>
              <Link href="/privacy" className="hover:text-slate-300 transition-colors">隐私政策</Link>
              <Link href="/terms" className="hover:text-slate-300 transition-colors">服务条款</Link>
              <Link href="/contact" className="hover:text-slate-300 transition-colors">联系我们</Link>
            </div>
          </div>

          <div className="text-center mt-6 text-sm" style={{ color: '#334155' }}>
            <p>© 2024 富利时代 · 复盘平台. 保留所有权利.</p>
            <p className="mt-1 text-xs">
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">
                京ICP备2020034311号-3
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
