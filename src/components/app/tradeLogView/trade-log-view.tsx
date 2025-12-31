
"use client";

import type { TradeLog } from '@/lib/types';
import { AppHeader } from '../header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plus } from 'lucide-react';
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
                <div className="flex items-center gap-2">
                    <Button onClick={onAddTradeLog} className="hidden md:flex">
                        <PlusCircle className="mr-2" />
                        添加交易
                    </Button>
                    <Button onClick={onAddTradeLog} size="icon" className="md:hidden h-9 w-9">
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            </AppHeader>
            <ScrollArea className="flex-1">
                <main className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
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
