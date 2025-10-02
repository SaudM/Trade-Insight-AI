"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type AiAnalysisCardProps = {
  title: string;
  icon: LucideIcon;
  isLoading: boolean;
  content: string | { [key: string]: string } | null;
};

export function AiAnalysisCard({ title, icon: Icon, isLoading, content }: AiAnalysisCardProps) {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      );
    }

    if (!content) {
      return <p className="text-sm text-muted-foreground">No analysis available. Generate a report to see insights.</p>;
    }

    if (typeof content === 'string') {
      // Split by newline and render paragraphs to respect formatting from AI
      return (
        <div className="space-y-2">
            {content.split('\n').map((paragraph, index) => (
                <p key={index} className="text-sm text-foreground/90">{paragraph}</p>
            ))}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {Object.entries(content).map(([key, value]) => (
          <div key={key}>
            <h4 className="font-semibold text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-headline font-semibold">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
