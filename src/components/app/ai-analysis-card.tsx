"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

type AiAnalysisCardProps = {
  title: string;
  icon: LucideIcon;
  isLoading: boolean;
  content: string | { [key: string]: string } | null;
  accentColor?: string;
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
          <p className="text-sm text-slate-700 leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 leading-relaxed mb-2 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 leading-relaxed mb-2 last:mb-0">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-800">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-slate-600">{children}</em>
        ),
        h1: ({ children }) => (
          <h1 className="text-base font-bold text-slate-800 mt-2 mb-1">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-bold text-slate-800 mt-2 mb-1">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-slate-700 mt-2 mb-0.5">{children}</h3>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-slate-300 pl-3 text-slate-500 italic text-sm mb-2">{children}</blockquote>
        ),
        code: ({ children }) => (
          <code className="bg-slate-100 rounded px-1 py-0.5 text-xs font-mono text-slate-700">{children}</code>
        ),
      }}
    >
      {normalizeMarkdown(text)}
    </ReactMarkdown>
  );
}

// Accent color presets — Tailwind JIT needs full class names
const ACCENT_STYLES: Record<string, { border: string; iconBg: string; iconText: string }> = {
  blue:   { border: 'border-l-blue-500',   iconBg: 'bg-blue-50',   iconText: 'text-blue-600' },
  violet: { border: 'border-l-violet-500', iconBg: 'bg-violet-50', iconText: 'text-violet-600' },
  amber:  { border: 'border-l-amber-500',  iconBg: 'bg-amber-50',  iconText: 'text-amber-600' },
  rose:   { border: 'border-l-rose-500',   iconBg: 'bg-rose-50',   iconText: 'text-rose-600' },
  emerald:{ border: 'border-l-emerald-500',iconBg: 'bg-emerald-50',iconText: 'text-emerald-600' },
  slate:  { border: 'border-l-slate-400',  iconBg: 'bg-slate-100', iconText: 'text-slate-500' },
};

export function AiAnalysisCard({ title, icon: Icon, isLoading, content, accentColor = 'blue' }: AiAnalysisCardProps) {
  const accent = ACCENT_STYLES[accentColor] ?? ACCENT_STYLES.blue;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 animate-pulse">
          <div className="h-3.5 bg-slate-100 rounded-full w-full" />
          <div className="h-3.5 bg-slate-100 rounded-full w-[90%]" />
          <div className="h-3.5 bg-slate-100 rounded-full w-3/4" />
          <div className="h-3.5 bg-slate-100 rounded-full w-[60%]" />
        </div>
      );
    }

    if (!content) {
      return (
        <p className="text-sm text-slate-400 italic">
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
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </h4>
            <MarkdownContent text={value} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200/80 shadow-sm",
        "border-l-4 transition-shadow hover:shadow-md",
        accent.border,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <div className={cn("p-2 rounded-lg shrink-0", accent.iconBg)}>
          <Icon className={cn("h-4 w-4", accent.iconText)} />
        </div>
        <h3 className="text-[15px] font-bold text-slate-800">{title}</h3>
      </div>
      {/* Divider */}
      <div className="mx-5 border-t border-slate-100" />
      {/* Content */}
      <div className="px-5 pt-3 pb-5">
        {renderContent()}
      </div>
    </div>
  );
}
