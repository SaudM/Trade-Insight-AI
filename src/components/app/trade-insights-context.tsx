"use client";

import { createContext, useContext, type ReactNode } from 'react';
import type { View } from '@/lib/types';

interface TradeInsightsContextType {
  activeView: View;
  setActiveView: (view: View) => void;
}

const TradeInsightsContext = createContext<TradeInsightsContextType | undefined>(undefined);

export const TradeInsightsProvider = ({ children, value }: { children: ReactNode, value: TradeInsightsContextType }) => {
  return (
    <TradeInsightsContext.Provider value={value}>
      {children}
    </TradeInsightsContext.Provider>
  );
};

export const useTradeInsights = () => {
  const context = useContext(TradeInsightsContext);
  if (context === undefined) {
    throw new Error('useTradeInsights must be used within a TradeInsightsProvider');
  }
  return context;
};
