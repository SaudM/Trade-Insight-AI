'use client';

const PT = {
  fog:    '#f6f6f3',
  sand:   '#e5e5e0',
  heading:'#211922',
  muted:  '#91918c',
  red:    '#e60023',
} as const;

const ff = { fontFeatureSettings: '"cv01" 1, "ss03" 1' } as const;

export function BrandedLoading() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ ...ff, background: PT.fog, zIndex: 9999 }}
    >
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${PT.sand} 1px, transparent 1px), linear-gradient(90deg, ${PT.sand} 1px, transparent 1px)`,
          backgroundSize: '56px 56px',
          opacity: 0.3,
        }}
      />

      {/* Top glow */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 flex justify-center" style={{ height: 280 }}>
        <div style={{
          width: '50vw',
          height: '100%',
          background: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(230,0,35,0.08) 0%, transparent 70%)',
        }} />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-5">

        {/* Logo mark — 条形图律动动画 */}
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{ width: 56, height: 56, background: PT.red }}
        >
          {/*
            三根条形柱，锚点在底部，scaleY 从底向上律动。
            transform-box: fill-box 让 transform-origin 相对于每个元素自身。
          */}
          <svg
            width="28" height="22"
            viewBox="0 0 28 22"
            fill="none"
            style={{ overflow: 'visible' }}
          >
            {/* 左柱 */}
            <rect
              x="1" y="2" width="6" height="20" rx="1.5"
              fill="white" fillOpacity="0.9"
              style={{ transformBox: 'fill-box', transformOrigin: 'bottom', animation: 'bar-l 1.1s ease-in-out infinite' }}
            />
            {/* 中柱 */}
            <rect
              x="11" y="2" width="6" height="20" rx="1.5"
              fill="white"
              style={{ transformBox: 'fill-box', transformOrigin: 'bottom', animation: 'bar-m 1.1s ease-in-out 0.18s infinite' }}
            />
            {/* 右柱 */}
            <rect
              x="21" y="2" width="6" height="20" rx="1.5"
              fill="white" fillOpacity="0.9"
              style={{ transformBox: 'fill-box', transformOrigin: 'bottom', animation: 'bar-r 1.1s ease-in-out 0.36s infinite' }}
            />
          </svg>
        </div>

        {/* Brand name */}
        <div className="text-center">
          <p style={{ ...ff, fontSize: 17, fontWeight: 590, color: PT.heading, letterSpacing: '-0.3px' }}>
            复盘 · AI量化
          </p>
          <p style={{ ...ff, fontSize: 12, color: PT.muted, marginTop: 4 }}>
            正在加载您的数据…
          </p>
        </div>
      </div>

      <style>{`
        /* 左柱：矮 → 高 → 矮，起始较矮 */
        @keyframes bar-l {
          0%, 100% { transform: scaleY(0.35); }
          50%       { transform: scaleY(1);    }
        }
        /* 中柱：高 → 矮 → 高，起始最高（与 logo 原型一致） */
        @keyframes bar-m {
          0%, 100% { transform: scaleY(1);    }
          50%       { transform: scaleY(0.3);  }
        }
        /* 右柱：中 → 高 → 中，起始中等 */
        @keyframes bar-r {
          0%, 100% { transform: scaleY(0.55); }
          50%       { transform: scaleY(0.95); }
        }
      `}</style>
    </div>
  );
}
