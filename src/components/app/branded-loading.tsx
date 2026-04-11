'use client';

const PT = {
  bg:     '#ffffff',
  fog:    '#f6f6f3',
  sand:   '#e5e5e0',
  heading:'#211922',
  muted:  '#91918c',
  border: '#e5e5e0',
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
      <div className="relative flex flex-col items-center gap-6">

        {/* Logo mark */}
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{
            width: 56,
            height: 56,
            background: PT.red,
            animation: 'brand-pulse 2s ease-in-out infinite',
          }}
        >
          {/* Bar chart icon */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6"  y1="20" x2="6"  y2="14" />
          </svg>
        </div>

        {/* Brand name */}
        <div className="text-center" style={{ marginTop: -2 }}>
          <p style={{ ...ff, fontSize: 17, fontWeight: 590, color: PT.heading, letterSpacing: '-0.3px' }}>
            复盘 · AI量化
          </p>
          <p style={{ ...ff, fontSize: 12, color: PT.muted, marginTop: 4 }}>
            正在加载您的数据…
          </p>
        </div>

        {/* Three dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: PT.red,
                opacity: 0.3,
                animation: `brand-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes brand-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(230,0,35,0.25); transform: scale(1); }
          50%       { box-shadow: 0 0 0 10px rgba(230,0,35,0); transform: scale(1.04); }
        }
        @keyframes brand-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40%            { opacity: 1;    transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
