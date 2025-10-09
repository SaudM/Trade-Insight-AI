
"use client";

import type { TradeLog } from '@/lib/types';
import { AppHeader } from './header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { TradeLogTable } from './trade-log-table';
import { ScrollArea } from '@/components/ui/scroll-area';

type TradeLogViewProps = {
    tradeLogs: TradeLog[];
    onAddTradeLog: () => void;
    onEditTradeLog: (log: TradeLog) => void;
    deleteTradeLog: (id: string) => void;
};

export function TradeLogView({ tradeLogs, onAddTradeLog, onEditTradeLog, deleteTradeLog }: TradeLogViewProps) {
    
    return (
        <div className="flex flex-col h-full">
            <AppHeader title="交易笔记">
                <Button onClick={onAddTradeLog}>
                    <PlusCircle className="mr-2" />
                    添加交易
                </Button>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="p-4 md:p-6 lg:p-8">
                  <TradeLogTable 
                    tradeLogs={tradeLogs} 
                    handleEdit={onEditTradeLog} 
                    deleteTradeLog={deleteTradeLog} 
                  />
              </main>
            </ScrollArea>
        </div>
    );
}
