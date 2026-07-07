'use client';

import {
  BarChart3,
  Brain,
  Bell,
  TrendingUp,
  Users,
  Star,
  ArrowRight,
  CheckCircle,
  Activity,
  Zap,
  ChevronRight,
  LineChart,
  Layers,
  Target,
  Quote,
} from 'lucide-react';
import Link from 'next/link';
import { trackEvent } from '@/lib/tracking';
import { useEffect, useState } from 'react';

/* ─────────────────────────────────────────────
   Pinterest Design Tokens
───────────────────────────────────────────── */
const PT = {
  bg:      '#ffffff',
  fog:     '#f6f6f3',
  sand:    '#e5e5e0',
  heading: '#211922',
  body:    '#62625b',
  muted:   '#91918c',
  border:  '#e5e5e0',
  red:     '#e60023',
  redH:    '#ad081b',
  redL:    'rgba(230,0,35,0.08)',
} as const;

/* ─────────────────────────────────────────────
   Data
───────────────────────────────────────────── */
const METRICS = [
  { value: '~40%',  label: '策略年化收益', note: '历史回测',  color: PT.red },
  { value: '<15%',  label: '最大回撤',     note: '风险可控',  color: PT.red },
  { value: '5000+', label: '每日扫描标的',  note: 'A股全市场', color: PT.red },
  { value: '全自动', label: '收盘即更新',  note: '无需值守',  color: PT.muted },
];

const STEPS = [
  {
    num: '01',
    title: '量化扫描全市场',
    desc: 'MACD W底双重金叉 + 底背离检测，结合板块主力资金流强度，每日收盘后自动扫描 5000+ 股票，生成评分排行榜。',
  },
  {
    num: '02',
    title: 'AI 深度复盘分析',
    desc: '对你的每笔交易进行 AI 解析：识别成功与失败模式、情绪影响、操作纪律，生成个性化改进报告。',
  },
  {
    num: '03',
    title: '信号触发实时推送',
    desc: '关注的策略或个股出现买入信号，第一时间推送到手机。不错过每个关键买点，告别后知后觉。',
  },
];

const FEATURES = [
  { icon: Activity,  color: '#27a644', bg: 'rgba(39,166,68,0.1)',   title: 'MACD W底策略',   desc: '双重金叉 + 底背离双重确认，精准捕捉趋势反转入场时机，大幅减少假信号干扰。' },
  { icon: BarChart3, color: '#2563eb', bg: 'rgba(37,99,235,0.08)', title: '板块资金流追踪', desc: '实时量化主力资金板块流向，智能筛选热点板块强势个股，顺势而为不逆水行舟。' },
  { icon: Brain,     color: PT.red,    bg: PT.redL,                 title: 'AI 交易复盘',    desc: '每笔盈亏背后的交易逻辑、持仓心态、时机判断全面剖析，找到你专属的薄弱环节。' },
  { icon: Bell,      color: PT.red,    bg: PT.redL,                 title: '策略信号订阅',   desc: '按策略、板块、个股自定义订阅，信号触发即时推送，绝不让你在关键时刻缺席。' },
  { icon: Target,    color: PT.red,    bg: PT.redL,                 title: '智能评分排序',   desc: '技术面 + 资金面多维度量化打分，自动排出买入优先级，决策有据可依，执行有章可循。' },
  { icon: LineChart, color: '#27a644', bg: 'rgba(39,166,68,0.1)',   title: '策略回测验证',   desc: 'NAV 净值曲线 + 胜率统计完整呈现，历史表现透明公开，策略效果看得见、算得清。' },
];

const PAINS = [
  { pain: '每天上百只股票看不过来，不知道优先关注哪只',      fix: '量化系统每日自动产出 Top 信号清单，开盘前优先级一目了然' },
  { pain: '看到好买点时已经拉升，永远追高买在高位',          fix: '信号订阅实时推送，策略触发第一时间通知，先人一步进场' },
  { pain: '亏了不知道哪里错了，下次还是犯同样的错',         fix: 'AI 自动剖析失败交易，识别个人操作模式弱点并给出针对性建议' },
  { pain: '外面策略听起来都厉害，没有真实数据不敢信',        fix: '完整回测数据 + 历史 NAV 曲线全公开，~40% 年化真实可查' },
];

const PLANS = [
  {
    name: '月度会员', price: '¥39', unit: '/ 月',
    desc: '灵活体验，随时开始',
    features: ['两大量化策略实时信号', 'AI 复盘报告', '策略持仓全透明', '量化策略广场'],
    cta: '立即订阅', highlight: false,
  },
  {
    name: '半年会员', price: '¥169', unit: '/ 半年',
    desc: '相当于 ¥28.2 / 月，省 28%',
    features: ['两大量化策略实时信号', 'AI 复盘报告', '策略持仓全透明', '量化策略广场', '体制状态 / 仓位监控'],
    cta: '最受欢迎，立即订阅', highlight: true, badge: '最受欢迎',
  },
  {
    name: '年度会员', price: '¥299', unit: '/ 年',
    desc: '相当于 ¥24.9 / 月，省 36%',
    features: ['两大量化策略实时信号', 'AI 复盘报告', '策略持仓全透明', '量化策略广场', '体制状态 / 仓位监控', '优先客服支持'],
    cta: '最佳性价比，立即订阅', highlight: false,
  },
];

const TESTIMONIALS = [
  { name: '张先生', role: '职业交易员 · A股 5年', text: '信号通知改变了我的交易节奏——以前总错过买点，现在策略触发手机就响。配合 AI 复盘找到了自己追高的习惯，两个月胜率从 45% 提到 62%。' },
  { name: '李女士', role: '股票投资者 · A股 3年', text: 'MACD W底策略信号质量很高，板块资金热度帮我远离冷门板块。AI 复盘让我看到自己常在情绪化时做决定，改掉后亏损幅度明显下降了。' },
];

/* ─────────────────────────────────────────────
   Shared Styles
───────────────────────────────────────────── */
const ff = { fontFeatureSettings: '"cv01" 1, "ss03" 1' } as const;

const card: React.CSSProperties = {
  background: PT.bg,
  border: `1px solid ${PT.border}`,
  borderRadius: 16,
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] mb-4"
      style={{ ...ff, color: PT.red }}>
      {children}
    </p>
  );
}

function SectionHeading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      className={`font-bold ${className}`}
      style={{ ...ff, fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 590, letterSpacing: '-0.8px', color: PT.heading }}
    >
      {children}
    </h2>
  );
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    trackEvent('view_landing_page', { source: 'direct' });
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ ...ff, background: PT.fog, color: PT.body }}>

      {/* ── Background grid ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(${PT.sand} 1px, transparent 1px), linear-gradient(90deg, ${PT.sand} 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          opacity: 0.3,
        }}
      />

      {/* ── Ambient glow orbs ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-64 -top-64 h-[800px] w-[800px] rounded-full"
          style={{ background: `radial-gradient(circle, rgba(230,0,35,0.05) 0%, transparent 60%)` }} />
        <div className="absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full"
          style={{ background: `radial-gradient(circle, rgba(39,166,68,0.04) 0%, transparent 60%)` }} />
      </div>

      {/* ── 吸顶灯：从 header 中央向下漫射的光晕 ── */}
      <div
        className="pointer-events-none fixed top-0 left-0 right-0 z-[2] flex justify-center"
        style={{ height: 320 }}
      >
        <div
          style={{
            width: '52vw',
            height: '100%',
            background: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(230,0,35,0.11) 0%, rgba(230,0,35,0.04) 40%, transparent 70%)',
          }}
        />
      </div>

      {/* ════════ NAV ════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(246,246,243,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(24px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
          borderBottom: scrolled ? `1px solid ${PT.border}` : '1px solid transparent',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-xl"
              style={{ background: PT.red }}>
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span style={{ ...ff, fontSize: 15, fontWeight: 590, color: PT.heading, letterSpacing: '-0.3px' }}>
              复盘 · AI量化
            </span>
          </div>

          {/* Nav anchor links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: '功能', href: '#features' },
              { label: '定价', href: '#pricing' },
              { label: '用户评价', href: '#testimonials' },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-lg text-[13px] transition-colors"
                style={{ ...ff, fontWeight: 510, color: PT.body, textDecoration: 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = PT.heading; (e.currentTarget as HTMLElement).style.background = 'rgba(33,25,34,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = PT.body; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Nav actions */}
          <div className="flex items-center gap-2">
            <Link href="/login">
              <button
                className="cursor-pointer text-[13px] px-4 py-2 rounded-lg transition-all"
                style={{ ...ff, fontWeight: 510, color: PT.body, background: 'transparent', border: `1px solid ${PT.border}` }}
                onMouseEnter={e => { e.currentTarget.style.background = PT.bg; e.currentTarget.style.color = PT.heading; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PT.body; }}
              >
                登录
              </button>
            </Link>
            <Link href="/signup">
              <button
                onClick={() => trackEvent('click_cta', { button_name: 'nav_signup' })}
                className="cursor-pointer text-[13px] px-5 py-2 rounded-lg transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ ...ff, fontWeight: 590, background: PT.red, color: '#fff', letterSpacing: '-0.1px' }}
              >
                免费注册 →
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ════════ MAIN ════════ */}
      <main className="relative z-10 pt-16">

        {/* ── Hero ── */}
        <section
          className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16"
          style={{ minHeight: '92vh', paddingTop: '8vh', paddingBottom: '8vh' }}
        >
          {/* ── Left: text ── */}
          <div className="flex-1 flex flex-col items-start">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8"
              style={{ ...ff, fontSize: 12, fontWeight: 510, background: PT.bg, border: `1px solid ${PT.border}`, color: PT.muted }}
            >
              <span className="inline-flex size-1.5 rounded-full animate-pulse" style={{ background: '#27a644' }} />
              每日收盘自动运行 · 全市场 5000+ 标的扫描
            </div>

            {/* H1 */}
            <h1
              className="font-bold leading-[1.06] mb-7"
              style={{
                ...ff,
                fontSize: 'clamp(2.8rem, 6vw, 5rem)',
                fontWeight: 590,
                letterSpacing: 'clamp(-1.5px, -0.025em, -2.5px)',
                color: PT.heading,
              }}
            >
              让 AI 替你盯盘<br />
              <span style={{ color: PT.red }}>量化</span>选股<br />
              不凭感觉
            </h1>

            {/* Subtitle */}
            <p
              className="leading-relaxed mb-10"
              style={{ ...ff, fontSize: 16, fontWeight: 400, letterSpacing: '-0.2px', color: PT.body, lineHeight: 1.75, maxWidth: '38ch' }}
            >
              基于 MACD W底量化策略，结合板块主力资金流追踪与 AI 智能复盘，
              每日精准发现高胜率买入信号并{' '}
              <strong style={{ color: '#27a644', fontWeight: 590 }}>实时推送到手机</strong>。
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-start gap-3 mb-12">
              <Link href="/signup">
                <button
                  onClick={() => trackEvent('click_cta', { button_name: 'hero_start' })}
                  className="cursor-pointer group inline-flex items-center gap-2.5 transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    ...ff, fontWeight: 590, fontSize: 15, borderRadius: 10,
                    background: PT.red, color: '#fff', padding: '14px 28px',
                    boxShadow: `0 0 0 1px rgba(230,0,35,0.5), 0 8px 24px rgba(230,0,35,0.22)`,
                  }}
                >
                  免费开始使用
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Link>

              <Link href="/login">
                <button
                  className="cursor-pointer inline-flex items-center gap-2 transition-all active:scale-[0.98]"
                  style={{
                    ...ff, fontWeight: 510, fontSize: 15, borderRadius: 10,
                    background: PT.bg, border: `1px solid ${PT.border}`, color: PT.body, padding: '14px 24px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = PT.muted)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = PT.border)}
                >
                  已有账户，立即登录
                </button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap items-center gap-6" style={{ ...ff, fontSize: 12, color: PT.muted }}>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" style={{ color: PT.red }} />
                <span>1000+ 交易者信任</span>
              </div>
              <span style={{ color: PT.border }}>|</span>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" style={{ color: PT.red }} />
                <span>年化回测 ~40%</span>
              </div>
              <span style={{ color: PT.border }}>|</span>
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" style={{ color: PT.red }} />
                <span>全市场 A股覆盖</span>
              </div>
            </div>
          </div>

          {/* ── Right: app preview mockup ── */}
          <div className="hidden lg:flex flex-1 flex-col gap-3 w-full" style={{ maxWidth: 460 }}>

            {/* NAV chart card */}
            <div style={{ ...card, padding: '20px 20px 14px' }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p style={{ ...ff, fontSize: 11, color: PT.muted, marginBottom: 4 }}>策略累计收益率</p>
                  <p style={{ ...ff, fontSize: 28, fontWeight: 590, color: PT.red, letterSpacing: '-0.5px' }}>+38.7%</p>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full"
                  style={{ ...ff, fontSize: 11, fontWeight: 590, background: PT.redL, color: PT.red }}
                >
                  ↑ 本月 +4.2%
                </span>
              </div>

              {/* SVG chart */}
              <svg viewBox="0 0 400 90" className="w-full" style={{ height: 80, display: 'block' }}>
                <defs>
                  <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PT.red} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={PT.red} stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[20, 45, 70].map(y => (
                  <line key={y} x1="0" y1={y} x2="400" y2={y} stroke={PT.border} strokeWidth="0.5" />
                ))}
                {/* Area fill */}
                <path
                  d="M0,72 C30,68 50,60 80,54 C110,48 130,62 160,46 C190,32 215,44 245,28 C270,16 300,22 330,12 C355,5 375,8 400,6 L400,90 L0,90 Z"
                  fill="url(#navFill)"
                />
                {/* Line */}
                <path
                  d="M0,72 C30,68 50,60 80,54 C110,48 130,62 160,46 C190,32 215,44 245,28 C270,16 300,22 330,12 C355,5 375,8 400,6"
                  fill="none"
                  stroke={PT.red}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* End dot */}
                <circle cx="400" cy="6" r="3.5" fill={PT.red} />
              </svg>
            </div>

            {/* Signal cards row */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: '宁德时代', code: '300750', signal: 'MACD W底金叉', color: PT.red, label: '买入' },
                { name: '比亚迪',   code: '002594', signal: '板块资金流入强',  color: PT.red, label: '关注' },
              ].map(s => (
                <div key={s.code} style={{ ...card, padding: '14px 16px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full animate-pulse" style={{ background: s.color, display: 'inline-block' }} />
                      <span style={{ ...ff, fontSize: 12, fontWeight: 590, color: PT.heading }}>{s.name}</span>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{ ...ff, fontSize: 10, fontWeight: 590, background: PT.redL, color: PT.red }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <p style={{ ...ff, fontSize: 11, color: PT.muted }}>{s.signal}</p>
                  <p style={{ ...ff, fontSize: 10, color: PT.border, marginTop: 2 }}>{s.code}</p>
                </div>
              ))}
            </div>

            {/* Metrics chips */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '今日扫描',  value: '5,247', color: PT.heading },
                { label: '触发信号',  value: '23',    color: PT.red    },
                { label: '胜率（近30笔）', value: '68%', color: PT.red },
              ].map(m => (
                <div key={m.label} style={{ ...card, padding: '14px 10px', textAlign: 'center' }}>
                  <p style={{ ...ff, fontSize: 18, fontWeight: 590, color: m.color, letterSpacing: '-0.3px' }}>{m.value}</p>
                  <p style={{ ...ff, fontSize: 10, color: PT.muted, marginTop: 4, lineHeight: 1.4 }}>{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pain vs Solution ── */}
        <section style={{ borderTop: `1px solid ${PT.border}`, background: PT.bg }}>
          <div className="max-w-6xl mx-auto px-6 py-28">
            <div className="text-center mb-16">
              <SectionLabel>PAIN POINTS</SectionLabel>
              <SectionHeading className="mb-4">你是否有这些困惑？</SectionHeading>
              <p style={{ ...ff, fontSize: 15, color: PT.muted }}>每位散户都曾经历，也都可以被系统解决</p>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${PT.border}` }}>
              {/* Table header */}
              <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${PT.border}` }}>
                {[
                  { label: '常见困惑',     color: '#f87171', bg: 'rgba(239,68,68,0.04)',  right: true },
                  { label: '平台解决方案', color: '#27a644', bg: 'rgba(39,166,68,0.04)', right: false },
                ].map(({ label, color, bg, right }) => (
                  <div
                    key={label}
                    className="px-8 py-4 flex items-center gap-2.5"
                    style={{
                      ...ff, fontSize: 11, fontWeight: 590,
                      textTransform: 'uppercase', letterSpacing: '0.14em',
                      color, background: bg,
                      ...(right ? { borderRight: `1px solid ${PT.border}` } : {}),
                    }}
                  >
                    {right
                      ? <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]"
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>✕</span>
                      : <CheckCircle className="h-3.5 w-3.5" />
                    }
                    {label}
                  </div>
                ))}
              </div>

              {PAINS.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-2"
                  style={{ borderBottom: idx < PAINS.length - 1 ? `1px solid ${PT.border}` : undefined }}
                >
                  <div className="flex items-start gap-4 px-8 py-6"
                    style={{ background: 'rgba(239,68,68,0.02)', borderRight: `1px solid ${PT.border}` }}>
                    <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', flexShrink: 0 }}>✕</span>
                    <p style={{ ...ff, fontSize: 14, fontWeight: 400, lineHeight: 1.65, color: PT.muted }}>{item.pain}</p>
                  </div>
                  <div className="flex items-start gap-4 px-8 py-6" style={{ background: 'rgba(39,166,68,0.02)' }}>
                    <CheckCircle className="shrink-0 mt-0.5 h-4 w-4" style={{ color: '#27a644', flexShrink: 0 }} />
                    <p style={{ ...ff, fontSize: 14, fontWeight: 510, lineHeight: 1.65, color: PT.body }}>{item.fix}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section>
          <div className="max-w-6xl mx-auto px-6 py-28">
            <div className="text-center mb-16">
              <SectionLabel>HOW IT WORKS</SectionLabel>
              <SectionHeading>三步，从选股到通知全自动</SectionHeading>
            </div>

            <div className="relative grid md:grid-cols-3 gap-5">
              {/* connector line */}
              <div className="hidden md:block absolute h-px"
                style={{
                  top: 44, left: 'calc(33.33% + 1.5rem)', right: 'calc(33.33% + 1.5rem)',
                  background: `linear-gradient(90deg, rgba(230,0,35,0.2) 0%, rgba(230,0,35,0.2) 100%)`,
                }} />

              {STEPS.map((s) => (
                <div key={s.num} style={{ ...card, padding: '28px 24px' }}>
                  {/* Large decorative number */}
                  <div className="mb-5">
                    <span style={{ ...ff, fontSize: 40, fontWeight: 590, color: PT.redL, letterSpacing: '-1px', lineHeight: 1 }}>
                      {s.num}
                    </span>
                  </div>
                  <h3 style={{ ...ff, fontSize: 16, fontWeight: 590, color: PT.heading, letterSpacing: '-0.24px', marginBottom: 10 }}>
                    {s.title}
                  </h3>
                  <p style={{ ...ff, fontSize: 13.5, fontWeight: 400, color: PT.muted, lineHeight: 1.7, letterSpacing: '-0.1px' }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" style={{ borderTop: `1px solid ${PT.border}`, borderBottom: `1px solid ${PT.border}`, background: PT.bg }}>
          <div className="max-w-6xl mx-auto px-6 py-28">
            <div className="text-center mb-16">
              <SectionLabel>FEATURES</SectionLabel>
              <SectionHeading className="mb-3">完整功能体系</SectionHeading>
              <p style={{ ...ff, fontSize: 15, color: PT.muted }}>覆盖选股 · 分析 · 通知 · 复盘全流程</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="flex gap-4 transition-colors duration-150 cursor-default"
                    style={{ ...card, padding: '22px 22px' }}
                    onMouseEnter={e => (e.currentTarget.style.background = PT.fog)}
                    onMouseLeave={e => (e.currentTarget.style.background = PT.bg)}
                  >
                    <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: f.bg }}>
                      <Icon style={{ color: f.color, width: 17, height: 17 }} />
                    </div>
                    <div>
                      <h3 style={{ ...ff, fontSize: 14, fontWeight: 590, color: PT.heading, letterSpacing: '-0.2px', marginBottom: 6 }}>
                        {f.title}
                      </h3>
                      <p style={{ ...ff, fontSize: 13, fontWeight: 400, color: PT.muted, lineHeight: 1.65 }}>
                        {f.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 数据背书 ── */}
        <section style={{ borderTop: `1px solid ${PT.border}`, borderBottom: `1px solid ${PT.border}` }}>
          <div className="max-w-6xl mx-auto px-6 py-28">
            <div className="text-center mb-16">
              <SectionLabel>BY THE NUMBERS</SectionLabel>
              <SectionHeading className="mb-3">真实数据，看得见的成效</SectionHeading>
              <p style={{ ...ff, fontSize: 15, color: PT.muted }}>策略表现公开透明，历史数据真实可查</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {METRICS.map((m) => (
                <div key={m.label} style={{ ...card, padding: '28px 24px' }}>
                  <div style={{ ...ff, fontSize: 36, fontWeight: 590, color: m.color, letterSpacing: '-1px', lineHeight: 1 }}>
                    {m.value}
                  </div>
                  <div style={{ borderTop: `1px solid ${PT.border}`, marginTop: 16, paddingTop: 14 }}>
                    <div style={{ ...ff, fontSize: 13, fontWeight: 510, color: PT.heading }}>{m.label}</div>
                    <div style={{ ...ff, fontSize: 12, fontWeight: 400, color: PT.muted, marginTop: 3 }}>{m.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section id="testimonials" style={{ borderTop: `1px solid ${PT.border}`, background: PT.bg }}>
          <div className="max-w-6xl mx-auto px-6 py-28">
            <div className="text-center mb-16">
              <SectionLabel>TESTIMONIALS</SectionLabel>
              <SectionHeading>真实用户反馈</SectionHeading>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {TESTIMONIALS.map((r) => (
                <div key={r.name} style={{ ...card, padding: '32px 28px' }}>
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p style={{ ...ff, fontSize: 15, fontWeight: 400, lineHeight: 1.75, color: PT.body, marginBottom: 24 }}>
                    "{r.text}"
                  </p>
                  <div style={{ borderTop: `1px solid ${PT.border}`, paddingTop: 16 }}>
                    <p style={{ ...ff, fontSize: 14, fontWeight: 590, color: PT.heading }}>{r.name}</p>
                    <p style={{ ...ff, fontSize: 12, fontWeight: 400, color: PT.muted, marginTop: 3 }}>{r.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" style={{ borderTop: `1px solid ${PT.border}`, borderBottom: `1px solid ${PT.border}`, background: PT.bg }}>
          <div className="max-w-6xl mx-auto px-6 py-28">
            <div className="text-center mb-16">
              <SectionLabel>PRICING</SectionLabel>
              <SectionHeading className="mb-3">简单透明的定价</SectionHeading>
              <p style={{ ...ff, fontSize: 15, color: PT.muted }}>先免费体验，确认有价值再付费</p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className="relative flex flex-col"
                  style={{
                    background: plan.highlight ? PT.redL : PT.bg,
                    border: `1px solid ${plan.highlight ? 'rgba(230,0,35,0.28)' : PT.border}`,
                    borderRadius: 16,
                    padding: plan.highlight ? '36px 28px' : '28px 24px',
                  }}
                >
                  {plan.badge && (
                    <div
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full whitespace-nowrap"
                      style={{ ...ff, fontSize: 11, fontWeight: 590, background: PT.red, color: '#fff' }}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <div className="mb-6">
                    <p style={{ ...ff, fontSize: 12, fontWeight: 590, color: plan.highlight ? PT.red : PT.muted, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {plan.name}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span style={{ ...ff, fontSize: 42, fontWeight: 590, letterSpacing: '-1.5px', color: PT.heading }}>
                        {plan.price}
                      </span>
                      <span style={{ ...ff, fontSize: 13, color: PT.muted }}>{plan.unit}</span>
                    </div>
                    <p style={{ ...ff, fontSize: 12, color: PT.muted, marginTop: 6 }}>{plan.desc}</p>
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: `1px solid ${plan.highlight ? 'rgba(230,0,35,0.15)' : PT.border}`, marginBottom: 20 }} />

                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2.5">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: plan.highlight ? PT.red : PT.muted }} />
                        <span style={{ ...ff, fontSize: 13, color: plan.highlight ? PT.body : PT.muted }}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/signup" className="block">
                    <button
                      onClick={() => trackEvent('click_cta', { button_name: `pricing_${plan.name}` })}
                      className="cursor-pointer w-full py-3 text-[14px] transition-all hover:brightness-110 active:scale-[0.98]"
                      style={
                        plan.highlight
                          ? { ...ff, fontWeight: 590, background: PT.red, color: '#fff', borderRadius: 10 }
                          : { ...ff, fontWeight: 510, background: PT.fog, border: `1px solid ${PT.border}`, color: PT.body, borderRadius: 10 }
                      }
                    >
                      {plan.cta}
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div
            className="relative text-center overflow-hidden rounded-2xl"
            style={{ background: PT.bg, border: `1px solid ${PT.border}`, padding: '96px 48px' }}
          >
            {/* Decorative glow */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-64 w-64 rounded-full"
                style={{ background: `radial-gradient(circle, rgba(230,0,35,0.06), transparent)` }} />
            </div>

            <div className="relative z-10">
              <SectionLabel>GET STARTED</SectionLabel>
              <h2
                className="font-bold mb-5"
                style={{ ...ff, fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 590, letterSpacing: '-0.8px', color: PT.heading }}
              >
                立即开启 AI 量化投资之旅
              </h2>
              <p className="max-w-md mx-auto mb-10"
                style={{ ...ff, fontSize: 16, color: PT.body, lineHeight: 1.7 }}>
                免费注册，体验 AI 复盘 · 量化选股 · 信号实时推送，
                让 AI 成为你的专属量化分析师。
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signup">
                  <button
                    onClick={() => trackEvent('click_cta', { button_name: 'footer_cta_signup' })}
                    className="cursor-pointer group inline-flex items-center gap-2.5 transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{
                      ...ff, fontWeight: 590, fontSize: 15, borderRadius: 10,
                      background: PT.red, color: '#fff', padding: '14px 28px',
                      boxShadow: `0 0 0 1px rgba(230,0,35,0.5), 0 8px 24px rgba(230,0,35,0.2)`,
                    }}
                  >
                    免费注册，立即体验
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </Link>
                <Link href="/login">
                  <button
                    className="cursor-pointer inline-flex items-center gap-2 transition-all active:scale-[0.98]"
                    style={{
                      ...ff, fontWeight: 510, fontSize: 15, borderRadius: 10,
                      background: PT.fog, border: `1px solid ${PT.border}`, color: PT.body, padding: '14px 24px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = PT.muted; e.currentTarget.style.color = PT.heading; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = PT.border; e.currentTarget.style.color = PT.body; }}
                  >
                    已有账户&nbsp;<span style={{ color: PT.red }}>登录</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ════════ FOOTER ════════ */}
      <footer style={{ borderTop: `1px solid ${PT.border}`, background: PT.bg }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-7 rounded-lg" style={{ background: PT.red }}>
              <BarChart3 className="h-3.5 w-3.5 text-white" />
            </div>
            <span style={{ ...ff, fontSize: 14, fontWeight: 590, color: PT.muted }}>复盘 · AI量化</span>
          </div>

          <div className="flex gap-7" style={{ ...ff, fontSize: 13, color: PT.muted }}>
            {[
              { href: '/privacy', label: '隐私政策' },
              { href: '/terms',   label: '服务条款' },
              { href: '/contact', label: '联系我们' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="transition-colors"
                onMouseEnter={e => (e.currentTarget.style.color = PT.red)}
                onMouseLeave={e => (e.currentTarget.style.color = PT.muted)}>
                {label}
              </Link>
            ))}
          </div>

          <div style={{ ...ff, fontSize: 12, color: PT.muted, textAlign: 'center' }}>
            <span>© 2025 复利时间&nbsp;&nbsp;</span>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer"
              style={{ color: PT.muted }}
              onMouseEnter={e => (e.currentTarget.style.color = PT.body)}
              onMouseLeave={e => (e.currentTarget.style.color = PT.muted)}>
              京ICP备2020034311号-3
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
