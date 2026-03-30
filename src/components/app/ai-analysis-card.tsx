"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AiAnalysisCardProps = {
  title: string;
  icon: LucideIcon;
  isLoading: boolean;
  content: string | { [key: string]: string } | null;
  accentColor?: string;
};

function renderTextContent(text: string) {
  const lines = text.split('\n').filter(l => l.trim());
  const result: React.ReactNode[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (!listBuffer) return;
    const Tag = listBuffer.type === 'ol' ? 'ol' : 'ul';
    result.push(
      <Tag
        key={`list-${result.length}`}
        className={cn(
          "space-y-1.5 text-sm text-slate-700 leading-relaxed",
          listBuffer.type === 'ol' ? "list-decimal pl-5" : "list-disc pl-5"
        )}
      >
        {listBuffer.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </Tag>
    );
    listBuffer = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Bullet list: lines starting with - or *
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      if (listBuffer?.type !== 'ul') { flushList(); listBuffer = { type: 'ul', items: [] }; }
      listBuffer!.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered list: lines starting with 1. 2. etc.
    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (orderedMatch) {
      if (listBuffer?.type !== 'ol') { flushList(); listBuffer = { type: 'ol', items: [] }; }
      listBuffer!.items.push(orderedMatch[1]);
      continue;
    }

    // Regular paragraph
    flushList();
    result.push(
      <p key={`p-${result.length}`} className="text-sm text-slate-700 leading-relaxed">
        {trimmed}
      </p>
    );
  }
  flushList();
  return result;
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
      return <div className="space-y-2.5">{renderTextContent(content)}</div>;
    }

    // Object content
    return (
      <div className="space-y-4">
        {Object.entries(content).map(([key, value]) => (
          <div key={key}>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </h4>
            <div className="space-y-1.5">{renderTextContent(value)}</div>
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
