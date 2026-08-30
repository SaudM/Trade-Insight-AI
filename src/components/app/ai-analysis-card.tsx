"use client";

const PT = {
    bg:      '#ffffff',
    fog:     '#f6f6f3',
    sand:    '#e5e5e0',
    warm:    '#e0e0d9',
    heading: '#211922',
    body:    '#62625b',
    muted:   '#91918c',
    border:  '#e5e5e0',
    borderH: '#bcbcb3',
    red:     '#e60023',
    redH:    '#ad081b',
    redL:    'rgba(230,0,35,0.08)',
    dark:    '#33332e',
} as const;

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

type AiAnalysisCardProps = {
  title: string;
  icon: LucideIcon;
  isLoading: boolean;
  content: string | { [key: string]: string } | null;
  accentColor?: string;
  /** 可选：限制正文区最大宽度的 Tailwind class（如 "max-w-5xl"）；用于满宽长文卡控制行宽可读，不传则占满卡片宽度。 */
  contentMaxWidthClass?: string;
};

/**
 * 规范化 AI 返回的 Markdown 文本：
 * 确保编号列表（1. 2. 3.）和无序列表（- *）各自独占一行，
 * 避免连续出现在同一行无法被 Markdown 解析为列表的问题。
 */
function normalizeMarkdown(text: string): string {
  return text
    // 在编号列表项前插入换行（如 "。2. " → "。\n2. "）
    .replace(/([^\n])\s*(\d+[.)]\s+)/g, (_, before, listItem) => `${before}\n${listItem}`)
    // 在无序列表项前插入换行（如 "。- " → "。\n- "），避免误匹配连字符
    .replace(/([^\n])\s+([-*]\s+)(?=\S)/g, (_, before, listItem) => `${before}\n${listItem}`);
}

function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="text-sm leading-relaxed mb-2 last:mb-0" style={{ color: PT.body }}>{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed mb-2 last:mb-0" style={{ color: PT.body }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 space-y-1 text-sm leading-relaxed mb-2 last:mb-0" style={{ color: PT.body }}>{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold" style={{ color: PT.heading }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic" style={{ color: PT.body }}>{children}</em>
        ),
        h1: ({ children }) => (
          <h1 className="text-base font-bold mt-2 mb-1" style={{ color: PT.heading }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-bold mt-2 mb-1" style={{ color: PT.heading }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mt-2 mb-0.5" style={{ color: PT.body }}>{children}</h3>
        ),
        blockquote: ({ children }) => (
          <blockquote className="pl-3 italic text-sm mb-2" style={{ borderLeft: `2px solid ${PT.border}`, color: PT.muted }}>{children}</blockquote>
        ),
        code: ({ children }) => (
          <code className="rounded px-1 py-0.5 text-xs font-mono" style={{ backgroundColor: PT.fog, color: PT.body }}>{children}</code>
        ),
      }}
    >
      {normalizeMarkdown(text)}
    </ReactMarkdown>
  );
}

// Accent color presets
// blue preset uses PT.red (Pinterest Red); others kept for visual variety
type AccentStyle = {
  borderStyle?: React.CSSProperties;
  iconBgStyle?: React.CSSProperties;
  iconTextStyle?: React.CSSProperties;
  // Tailwind classes for non-blue presets (kept for JIT)
  border?: string;
  iconBg?: string;
  iconText?: string;
};

const ACCENT_STYLES: Record<string, AccentStyle> = {
  blue:   {
    borderStyle:   { borderLeftColor: PT.red },
    iconBgStyle:   { backgroundColor: PT.redL },
    iconTextStyle: { color: PT.red },
  },
  violet: { border: 'border-l-violet-500', iconBg: 'bg-violet-50', iconText: 'text-violet-600' },
  amber:  { border: 'border-l-amber-500',  iconBg: 'bg-amber-50',  iconText: 'text-amber-600' },
  rose:   { border: 'border-l-rose-500',   iconBg: 'bg-rose-50',   iconText: 'text-rose-600' },
  emerald:{ border: 'border-l-emerald-500',iconBg: 'bg-emerald-50',iconText: 'text-emerald-600' },
  slate:  { border: 'border-l-slate-400',  iconBg: 'bg-slate-100', iconText: 'text-slate-500' },
};

export function AiAnalysisCard({ title, icon: Icon, isLoading, content, accentColor = 'blue', contentMaxWidthClass }: AiAnalysisCardProps) {
  const accent = ACCENT_STYLES[accentColor] ?? ACCENT_STYLES.blue;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 animate-pulse">
          <div className="h-3.5 rounded-full w-full" style={{ backgroundColor: PT.fog }} />
          <div className="h-3.5 rounded-full w-[90%]" style={{ backgroundColor: PT.fog }} />
          <div className="h-3.5 rounded-full w-3/4" style={{ backgroundColor: PT.fog }} />
          <div className="h-3.5 rounded-full w-[60%]" style={{ backgroundColor: PT.fog }} />
        </div>
      );
    }

    if (!content) {
      return (
        <p className="text-sm italic" style={{ color: PT.muted }}>
          暂无分析内容，点击上方"生成"按钮获取 AI 洞察。
        </p>
      );
    }

    if (typeof content === 'string') {
      return <MarkdownContent text={content} />;
    }

    // Object content
    return (
      <div className="space-y-4">
        {Object.entries(content).map(([key, value]) => (
          <div key={key}>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: PT.muted }}>
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </h4>
            <MarkdownContent text={value} />
          </div>
        ))}
      </div>
    );
  };

  const isBlue = accentColor === 'blue';

  return (
    <div
      className={cn(
        "rounded-2xl border-l-4 transition-shadow",
        !isBlue && accent.border,
      )}
      style={{
        backgroundColor: PT.bg,
        border: `1px solid ${PT.border}`,
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid',
        ...(isBlue ? accent.borderStyle : {}),
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <div
          className={cn("p-2 rounded-xl shrink-0", !isBlue && accent.iconBg)}
          style={isBlue ? accent.iconBgStyle : undefined}
        >
          <Icon
            className={cn("h-4 w-4", !isBlue && accent.iconText)}
            style={isBlue ? accent.iconTextStyle : undefined}
          />
        </div>
        <h3 className="text-[15px] font-bold" style={{ color: PT.heading }}>{title}</h3>
      </div>
      {/* Divider */}
      <div className="mx-5" style={{ borderTop: `1px solid ${PT.border}` }} />
      {/* Content */}
      <div className={cn("px-5 pt-3 pb-5", contentMaxWidthClass)}>
        {renderContent()}
      </div>
    </div>
  );
}
