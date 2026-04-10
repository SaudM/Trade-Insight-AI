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
} from 'lucide-react';
import Link from 'next/link';
import { trackEvent } from '@/lib/tracking';
import { useEffect } from 'react';

/* ─────────────────────────────────────────────
   Pinterest Design Tokens
───────────────────────────────────────────── */
const PT = {
  bg:      '#ffffff',
  fog:     '#f6f6f3',    // page background, section alternates
  sand:    '#e5e5e0',    // subtle surfaces, dividers
  heading: '#211922',    // plum black — main titles
  body:    '#62625b',    // olive gray — body text
  muted:   '#91918c',    // warm silver — captions, meta
  border:  '#e5e5e0',    // borders
  red:     '#e60023',    // Pinterest Red — CTA / accent
  redH:    '#ad081b',    // red hover
  redL:    'rgba(230,0,35,0.08)',  // red light tint
  dark:    '#211922',    // same as heading, for hero contrast
} as const;

/* ─────────────────────────────────────────────
   Data
───────────────────────────────────────────── */
const METRICS = [
  { value: '~40%',  label: '策略年化收益', note: '历史回测',  color: '#27a644' },
  { value: '<15%',  label: '最大回撤',     note: '风险可控',  color: PT.red },
  { value: '5000+', label: '每日扫描',     note: 'A股全市场', color: PT.red },
  { value: '全自动', label: '收盘即更新',  note: '无需值守',  color: PT.muted  },
];

const STEPS = [
  {
    num: '01',
    color: PT.red,
    title: '量化扫描全市场',
    desc: 'MACD W底双重金叉 + 底背离检测，结合板块主力资金流强度，每日收盘后自动扫描 5000+ 股票，生成评分排行榜。',
  },
  {
    num: '02',
    color: PT.red,
    title: 'AI 深度复盘分析',
    desc: '对你的每笔交易进行 AI 解析：识别成功与失败模式、情绪影响、操作纪律，生成个性化改进报告。',
  },
  {
    num: '03',
    color: PT.red,
    title: '信号触发实时推送',
    desc: '关注的策略或个股出现买入信号，第一时间推送到手机。不错过每个关键买点，告别后知后觉。',
  },
];

const FEATURES = [
  { icon: Activity,  color: '#27a644', bg: 'rgba(39,166,68,0.1)',   title: 'MACD W底策略',   desc: '双重金叉 + 底背离双重确认，精准捕捉趋势反转入场时机，大幅减少假信号干扰。' },
  { icon: BarChart3, color: '#10b981', bg: 'rgba(16,185,129,0.1)', title: '板块资金流追踪', desc: '实时量化主力资金板块流向，智能筛选热点板块强势个股，顺势而为不逆水行舟。' },
  { icon: Brain,     color: PT.red,    bg: PT.redL,                 title: 'AI 交易复盘',    desc: '每笔盈亏背后的交易逻辑、持仓心态、时机判断全面剖析，找到你专属的薄弱环节。' },
  { icon: Bell,      color: PT.red,    bg: PT.redL,                 title: '策略信号订阅',   desc: '按策略、板块、个股自定义订阅，信号触发即时推送，绝不让你在关键时刻缺席。' },
  { icon: Target,    color: PT.red,    bg: PT.redL,                 title: '智能评分排序',   desc: '技术面 + 资金面多维度量化打分，自动排出买入优先级，决策有据可依，执行有章可循。' },
  { icon: LineChart, color: '#27a644', bg: 'rgba(39,166,68,0.1)',   title: '策略回测验证',   desc: 'NAV 净值曲线 + 胜率统计完整呈现，历史表现透明公开，策略效果看得见、算得清。' },
];

const PAINS = [
  { pain: '每天上百只股票看不过来，不知道优先关注哪只',        fix: '量化系统每日自动产出 Top 信号清单，开盘前优先级一目了然' },
  { pain: '看到好买点时已经拉升，永远在追高买在高位',          fix: '信号订阅实时推送，策略触发第一时间通知，先人一步进场' },
  { pain: '亏了不知道哪里错了，下次还是犯同样的错',           fix: 'AI 自动剖析失败交易，识别个人操作模式弱点并给出针对性建议' },
  { pain: '外面策略听起来都厉害，没有真实数据不敢信',          fix: '完整回测数据 + 历史 NAV 曲线全公开，~40% 年化真实可查' },
];

const PLANS = [
  {
    name: '月度会员', price: '¥14', unit: '/ 月',
    desc: '灵活体验，随时开始',
    features: ['全功能解锁', 'AI 复盘报告', '信号实时推送', '量化策略广场'],
    cta: '立即订阅', highlight: false,
  },
  {
    name: '年度会员', price: '¥134', unit: '/ 年',
    desc: '相当于 ¥11.2 / 月，节省 20%',
    features: ['全功能解锁', 'AI 复盘报告', '信号实时推送', '量化策略广场', '优先客服支持', '新功能优先体验'],
    cta: '最优惠，立即订阅', highlight: true, badge: '最受欢迎',
  },
  {
    name: '季度会员', price: '¥39', unit: '/ 季',
    desc: '相当于 ¥13 / 月',
    features: ['全功能解锁', 'AI 复盘报告', '信号实时推送', '量化策略广场'],
    cta: '立即订阅', highlight: false,
  },
];

const TESTIMONIALS = [
  { name: '张先生', role: '职业交易员 · A股 5年', text: '信号通知改变了我的交易节奏——以前总错过买点，现在策略触发手机就响。配合 AI 复盘找到了自己追高的习惯，两个月胜率从 45% 提到 62%。' },
  { name: '李女士', role: '股票投资者 · A股 3年', text: 'MACD W底策略信号质量很高，板块资金热度帮我远离冷门板块。AI 复盘让我看到自己常在情绪化时做决定，改掉后亏损幅度明显下降了。' },
];

/* ─────────────────────────────────────────────
   Shared Styles (Pinterest spec)
───────────────────────────────────────────── */

// Inter Variable 510 weight with OpenType features
const ffSettings = { fontFeatureSettings: '"cv01" 1, "ss03" 1' } as const;

const cardStyle: React.CSSProperties = {
  background: PT.bg,
  border: `1px solid ${PT.border}`,
  borderRadius: 16,
};

const cardHoverStyle: React.CSSProperties = {
  ...cardStyle,
  transition: 'background 150ms',
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
      style={{ ...ffSettings, color: PT.red, fontWeight: 590 }}
    >
      {children}
    </p>
  );
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export function LandingPage() {
  useEffect(() => {
    trackEvent('view_landing_page', { source: 'direct' });
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ ...ffSettings, background: PT.fog, color: PT.body }}
    >
      {/* ── Background: subtle warm grid ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(${PT.sand} 1px, transparent 1px),
            linear-gradient(90deg, ${PT.sand} 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
          opacity: 0.35,
        }}
      />

      {/* ── Background: red glow orb (subtle) ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -left-48 -top-48 h-[600px] w-[600px] rounded-full"
          style={{ background: `radial-gradient(circle, rgba(230,0,35,0.04) 0%, transparent 65%)` }}
        />
      </div>

      {/* ════════════════ NAV ════════════════ */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: `rgba(255,255,255,0.92)`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${PT.border}`,
        }}
      >
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center size-7 rounded-lg"
              style={{ background: PT.redL }}
            >
              <BarChart3 className="h-3.5 w-3.5" style={{ color: PT.red }} />
            </div>
            <span
              className="text-[16px]"
              style={{ ...ffSettings, fontWeight: 590, color: PT.heading, letterSpacing: '-0.24px' }}
            >
              复盘 · AI量化
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] transition-colors"
              style={{ ...ffSettings, fontWeight: 510, color: PT.body }}
              onMouseEnter={e => (e.currentTarget.style.color = PT.heading)}
              onMouseLeave={e => (e.currentTarget.style.color = PT.body)}
            >
              登录
            </Link>
            <Link href="/signup">
              <button
                onClick={() => trackEvent('click_cta', { button_name: 'nav_signup' })}
                className="cursor-pointer text-[13px] px-4 py-1.5 rounded-md transition-all hover:brightness-110"
                style={{ ...ffSettings, fontWeight: 510, background: PT.red, color: '#fff', borderRadius: 6 }}
              >
                免费注册
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ════════════════ MAIN ════════════════ */}
      <main className="relative z-10">

        {/* ── Hero ── */}
        <section className="max-w-5xl mx-auto px-5 pt-24 pb-20 text-center">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs mb-10"
            style={{
              ...ffSettings,
              fontWeight: 510,
              background: PT.redL,
              border: `1px solid rgba(230,0,35,0.2)`,
              color: PT.red,
            }}
          >
            <Zap className="h-3 w-3 fill-current" />
            量化策略 · AI复盘 · 信号推送 · 全自动运行
          </div>

          {/* H1 */}
          <h1
            className="font-bold leading-[1.08] mb-6"
            style={{
              ...ffSettings,
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontWeight: 510,
              letterSpacing: '-1.056px',
              color: PT.heading,
            }}
          >
            让 AI 替你盯盘<br />量化选股不凭感觉
          </h1>

          {/* Subtitle */}
          <p
            className="max-w-2xl mx-auto leading-relaxed mb-3"
            style={{ ...ffSettings, fontSize: 18, fontWeight: 400, letterSpacing: '-0.165px', color: PT.body }}
          >
            基于 MACD W底量化策略，结合板块主力资金流追踪与 AI 智能复盘，
            每日自动扫描全市场{' '}
            <strong style={{ color: PT.heading, fontWeight: 590 }}>5000+</strong>{' '}
            股票，精准发现高胜率买入信号并
            <strong style={{ color: '#27a644', fontWeight: 590 }}>实时推送到手机</strong>。
          </p>

          {/* Pain points line */}
          <p className="text-sm mb-10" style={{ ...ffSettings, fontWeight: 400, color: PT.muted }}>
            解决三大痛点：
            <span style={{ color: PT.body }}>不知道买什么</span>
            <span className="mx-2" style={{ color: PT.muted }}>·</span>
            <span style={{ color: PT.body }}>不知道什么时候买</span>
            <span className="mx-2" style={{ color: PT.muted }}>·</span>
            <span style={{ color: PT.body }}>错过信号后知后觉</span>
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup">
              <button
                onClick={() => trackEvent('click_cta', { button_name: 'hero_start' })}
                className="cursor-pointer group inline-flex items-center gap-2 px-6 py-3 rounded-md text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  ...ffSettings,
                  fontWeight: 510,
                  borderRadius: 6,
                  background: PT.red,
                  color: '#fff',
                  boxShadow: `0 0 0 1px rgba(230,0,35,0.4), 0 4px 16px rgba(230,0,35,0.25)`,
                }}
              >
                免费开始使用
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>

            <Link href="/login">
              <button
                className="cursor-pointer inline-flex items-center gap-1.5 px-6 py-3 rounded-md text-sm transition-all active:scale-[0.98]"
                style={{
                  ...ffSettings,
                  fontWeight: 510,
                  borderRadius: 6,
                  background: PT.bg,
                  border: `1px solid ${PT.border}`,
                  color: PT.body,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = PT.fog)}
                onMouseLeave={e => (e.currentTarget.style.background = PT.bg)}
              >
                已有账户，立即登录
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>

          {/* Metrics strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto mt-14">
            {METRICS.map((m) => (
              <div key={m.label} style={{ ...cardStyle, padding: '14px 16px', textAlign: 'left' }}>
                <div style={{ ...ffSettings, fontSize: 22, fontWeight: 590, color: m.color, letterSpacing: '-0.288px' }}>
                  {m.value}
                </div>
                <div style={{ ...ffSettings, fontSize: 12, fontWeight: 510, color: PT.muted, marginTop: 2 }}>{m.label}</div>
                <div style={{ ...ffSettings, fontSize: 11, fontWeight: 400, color: PT.muted, marginTop: 1 }}>{m.note}</div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-10">
            {[
              { icon: Users,      text: '1000+ 交易者信任使用', color: PT.red },
              { icon: TrendingUp, text: '回测年化收益 ~40%',    color: '#27a644' },
              { icon: Layers,     text: '全市场 A股覆盖',       color: PT.red },
            ].map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-center gap-1.5" style={{ ...ffSettings, fontSize: 12, fontWeight: 400, color: PT.muted }}>
                <Icon className="h-3.5 w-3.5" style={{ color }} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="max-w-5xl mx-auto px-5 pb-24">
          <div className="text-center mb-14">
            <SectionLabel>HOW IT WORKS</SectionLabel>
            <h2
              className="font-bold"
              style={{ ...ffSettings, fontSize: 32, fontWeight: 510, letterSpacing: '-0.704px', color: PT.heading }}
            >
              三步，从选股到通知全自动
            </h2>
          </div>

          <div className="relative grid md:grid-cols-3 gap-5">
            {/* connector line */}
            <div
              className="hidden md:block absolute top-10 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px"
              style={{ background: `linear-gradient(90deg, rgba(230,0,35,0.25) 0%, rgba(230,0,35,0.25) 100%)` }}
            />

            {STEPS.map((s) => (
              <div key={s.num} style={{ ...cardStyle, padding: 24 }}>
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-lg mb-5"
                  style={{
                    background: PT.redL,
                    border: `1px solid ${PT.border}`,
                    ...ffSettings,
                    fontSize: 13,
                    fontWeight: 590,
                    color: s.color,
                  }}
                >
                  {s.num}
                </div>
                <h3 style={{ ...ffSettings, fontSize: 16, fontWeight: 590, color: PT.heading, letterSpacing: '-0.24px', marginBottom: 10 }}>
                  {s.title}
                </h3>
                <p style={{ ...ffSettings, fontSize: 14, fontWeight: 400, color: PT.muted, lineHeight: 1.6, letterSpacing: '-0.182px' }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section style={{ borderTop: `1px solid ${PT.border}`, borderBottom: `1px solid ${PT.border}`, background: PT.bg }}>
          <div className="max-w-5xl mx-auto px-5 py-24">
            <div className="text-center mb-14">
              <SectionLabel>FEATURES</SectionLabel>
              <h2
                className="font-bold mb-2"
                style={{ ...ffSettings, fontSize: 32, fontWeight: 510, letterSpacing: '-0.704px', color: PT.heading }}
              >
                完整功能体系
              </h2>
              <p style={{ ...ffSettings, fontSize: 15, fontWeight: 400, color: PT.muted }}>
                覆盖选股 · 分析 · 通知 · 复盘全流程
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="flex gap-4 transition-all duration-150"
                    style={{ ...cardHoverStyle, padding: '18px 20px' }}
                    onMouseEnter={e => (e.currentTarget.style.background = PT.fog)}
                    onMouseLeave={e => (e.currentTarget.style.background = PT.bg)}
                  >
                    <div
                      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md"
                      style={{ background: f.bg }}
                    >
                      <Icon style={{ color: f.color, width: 16, height: 16 }} />
                    </div>
                    <div>
                      <h3 style={{ ...ffSettings, fontSize: 14, fontWeight: 590, color: PT.heading, letterSpacing: '-0.182px', marginBottom: 6 }}>
                        {f.title}
                      </h3>
                      <p style={{ ...ffSettings, fontSize: 13, fontWeight: 400, color: PT.muted, lineHeight: 1.6, letterSpacing: '-0.13px' }}>
                        {f.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Pain vs Solution ── */}
        <section className="max-w-4xl mx-auto px-5 py-24">
          <div className="text-center mb-14">
            <SectionLabel>PAIN POINTS</SectionLabel>
            <h2
              className="font-bold"
              style={{ ...ffSettings, fontSize: 32, fontWeight: 510, letterSpacing: '-0.704px', color: PT.heading }}
            >
              你是否有这些困惑？
            </h2>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${PT.border}` }}
          >
            {/* Header */}
            <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${PT.border}` }}>
              {[
                { label: '常见困惑',    color: '#f87171', icon: '✕', bg: 'rgba(239,68,68,0.05)',   right: true },
                { label: '平台解决方案', color: '#27a644', icon: null, bg: 'rgba(39,166,68,0.05)', right: false },
              ].map(({ label, color, icon, bg, right }) => (
                <div
                  key={label}
                  className="px-6 py-3 flex items-center gap-2"
                  style={{
                    ...ffSettings, fontSize: 11, fontWeight: 590,
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                    color, background: bg,
                    ...(right ? { borderRight: `1px solid ${PT.border}` } : {}),
                  }}
                >
                  {icon ? (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>✕</span>
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
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
                <div
                  className="flex items-start gap-3 px-6 py-5"
                  style={{ background: 'rgba(239,68,68,0.02)', borderRight: `1px solid ${PT.border}` }}
                >
                  <span
                    className="shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', flexShrink: 0 }}
                  >
                    ✕
                  </span>
                  <p style={{ ...ffSettings, fontSize: 13, fontWeight: 400, lineHeight: 1.6, color: PT.muted }}>
                    {item.pain}
                  </p>
                </div>
                <div className="flex items-start gap-3 px-6 py-5" style={{ background: 'rgba(39,166,68,0.02)' }}>
                  <CheckCircle className="shrink-0 mt-0.5 h-4 w-4" style={{ color: '#27a644', flexShrink: 0 }} />
                  <p style={{ ...ffSettings, fontSize: 13, fontWeight: 510, lineHeight: 1.6, color: PT.body }}>
                    {item.fix}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section style={{ borderTop: `1px solid ${PT.border}`, borderBottom: `1px solid ${PT.border}`, background: PT.bg }}>
          <div className="max-w-5xl mx-auto px-5 py-24">
            <div className="text-center mb-14">
              <SectionLabel>PRICING</SectionLabel>
              <h2
                className="font-bold mb-2"
                style={{ ...ffSettings, fontSize: 32, fontWeight: 510, letterSpacing: '-0.704px', color: PT.heading }}
              >
                简单透明的定价
              </h2>
              <p style={{ ...ffSettings, fontSize: 15, fontWeight: 400, color: PT.muted }}>
                先免费体验，确认有价值再付费
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className="relative rounded-xl flex flex-col"
                  style={{
                    background: plan.highlight ? PT.redL : PT.bg,
                    border: `1px solid ${plan.highlight ? 'rgba(230,0,35,0.35)' : PT.border}`,
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: plan.highlight ? '0 0 32px rgba(230,0,35,0.08)' : 'none',
                  }}
                >
                  {plan.badge && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full whitespace-nowrap"
                      style={{ ...ffSettings, fontWeight: 510, background: PT.red, color: '#fff', fontSize: 11 }}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <div className="mb-5">
                    <p style={{ ...ffSettings, fontSize: 13, fontWeight: 510, color: plan.highlight ? PT.red : PT.muted, marginBottom: 4 }}>
                      {plan.name}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span style={{ ...ffSettings, fontSize: 36, fontWeight: 590, letterSpacing: '-0.704px', color: PT.heading }}>
                        {plan.price}
                      </span>
                      <span style={{ ...ffSettings, fontSize: 13, fontWeight: 400, color: PT.muted }}>{plan.unit}</span>
                    </div>
                    <p style={{ ...ffSettings, fontSize: 12, fontWeight: 400, color: PT.muted, marginTop: 4 }}>{plan.desc}</p>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: plan.highlight ? PT.red : PT.muted }} />
                        <span style={{ ...ffSettings, fontSize: 13, fontWeight: 400, color: PT.muted }}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/signup" className="block">
                    <button
                      onClick={() => trackEvent('click_cta', { button_name: `pricing_${plan.name}` })}
                      className="cursor-pointer w-full py-2.5 rounded-md text-sm transition-all hover:brightness-110"
                      style={
                        plan.highlight
                          ? { ...ffSettings, fontWeight: 510, borderRadius: 6, background: PT.red, color: '#fff' }
                          : { ...ffSettings, fontWeight: 510, borderRadius: 6, background: PT.fog, border: `1px solid ${PT.border}`, color: PT.body }
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

        {/* ── Testimonials ── */}
        <section className="max-w-4xl mx-auto px-5 py-24">
          <div className="text-center mb-14">
            <SectionLabel>TESTIMONIALS</SectionLabel>
            <h2
              className="font-bold"
              style={{ ...ffSettings, fontSize: 32, fontWeight: 510, letterSpacing: '-0.704px', color: PT.heading }}
            >
              真实用户反馈
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {TESTIMONIALS.map((r) => (
              <div key={r.name} style={{ ...cardStyle, padding: 24 }}>
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p style={{ ...ffSettings, fontSize: 14, fontWeight: 400, lineHeight: 1.65, color: PT.body, marginBottom: 20 }}>
                  "{r.text}"
                </p>
                <div>
                  <p style={{ ...ffSettings, fontSize: 14, fontWeight: 590, color: PT.heading }}>{r.name}</p>
                  <p style={{ ...ffSettings, fontSize: 12, fontWeight: 400, color: PT.muted, marginTop: 2 }}>{r.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-5xl mx-auto px-5 pb-24">
          <div
            className="relative text-center overflow-hidden"
            style={{
              background: PT.fog,
              border: `1px solid ${PT.border}`,
              borderRadius: 16,
              padding: '72px 32px',
            }}
          >
            <div
              className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 rounded-full"
              style={{ background: `radial-gradient(circle, rgba(230,0,35,0.06), transparent)` }}
            />
            <div className="relative z-10">
              <h2
                className="font-bold mb-4"
                style={{ ...ffSettings, fontSize: 32, fontWeight: 510, letterSpacing: '-0.704px', color: PT.heading }}
              >
                立即开启 AI 量化投资之旅
              </h2>
              <p className="max-w-lg mx-auto mb-8" style={{ ...ffSettings, fontSize: 15, fontWeight: 400, color: PT.body, lineHeight: 1.65 }}>
                免费注册，体验 AI 复盘 · 量化选股 · 信号实时推送，<br />
                让 AI 成为你的专属量化分析师。
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signup">
                  <button
                    onClick={() => trackEvent('click_cta', { button_name: 'footer_cta_signup' })}
                    className="cursor-pointer group inline-flex items-center gap-2 px-6 py-3 rounded-md text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{
                      ...ffSettings, fontWeight: 510, borderRadius: 6,
                      background: PT.red, color: '#fff',
                      boxShadow: `0 0 0 1px rgba(230,0,35,0.4), 0 4px 16px rgba(230,0,35,0.2)`,
                    }}
                  >
                    免费注册，立即体验
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </Link>
                <Link href="/login">
                  <button
                    className="cursor-pointer inline-flex items-center gap-1.5 px-6 py-3 rounded-md text-sm transition-all active:scale-[0.98]"
                    style={{
                      ...ffSettings, fontWeight: 510, borderRadius: 6,
                      background: PT.bg,
                      border: `1px solid ${PT.border}`,
                      color: PT.body,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = PT.fog;
                      e.currentTarget.style.color = PT.heading;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = PT.bg;
                      e.currentTarget.style.color = PT.body;
                    }}
                  >
                    已有账户&nbsp;<span style={{ color: PT.red }}>登录</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer style={{ borderTop: `1px solid ${PT.border}`, background: PT.bg }}>
        <div className="max-w-6xl mx-auto px-5 py-7 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center size-6 rounded-md"
              style={{ background: PT.redL }}
            >
              <BarChart3 className="h-3 w-3" style={{ color: PT.red }} />
            </div>
            <span style={{ ...ffSettings, fontSize: 13, fontWeight: 510, color: PT.muted }}>
              复盘 · AI量化
            </span>
          </div>

          <div className="flex gap-6" style={{ ...ffSettings, fontSize: 12, fontWeight: 400, color: PT.muted }}>
            {[
              { href: '/privacy', label: '隐私政策' },
              { href: '/terms',   label: '服务条款' },
              { href: '/contact', label: '联系我们' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="transition-colors"
                onMouseEnter={e => (e.currentTarget.style.color = PT.red)}
                onMouseLeave={e => (e.currentTarget.style.color = PT.muted)}
              >
                {label}
              </Link>
            ))}
          </div>

          <div style={{ ...ffSettings, fontSize: 11, fontWeight: 400, color: PT.muted, textAlign: 'center' }}>
            <span>© 2025 富利时代 · 复盘平台&nbsp;&nbsp;</span>
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: PT.muted }}
              onMouseEnter={e => (e.currentTarget.style.color = PT.body)}
              onMouseLeave={e => (e.currentTarget.style.color = PT.muted)}
            >
              京ICP备2020034311号-3
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
