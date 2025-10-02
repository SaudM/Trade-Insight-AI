"use client";

import type { TradeLog } from '@/lib/types';
import { AppHeader } from './header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { TradeLogTable } from './trade-log-table';
import { TradeLogForm } from './trade-log-form';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

type TradeLogViewProps = {
    tradeLogs: TradeLog[];
    addTradeLog: (log: Omit<TradeLog, 'id'>) => void;
    updateTradeLog: (log: TradeLog) => void;
    deleteTradeLog: (id: string) => void;
};

export function TradeLogView({ tradeLogs, addTradeLog, updateTradeLog, deleteTradeLog }: TradeLogViewProps) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<TradeLog | null>(null);

    const handleAddClick = () => {
        setEditingLog(null);
        setIsFormOpen(true);
    };

    const handleEditClick = (log: TradeLog) => {
        setEditingLog(log);
        setIsFormOpen(true);
    };

    const handleFormSubmit = (log: Omit<TradeLog, 'id'> | TradeLog) => {
        if ('id' in log) {
            updateTradeLog(log as TradeLog);
        } else {
            addTradeLog(log);
        }
        setIsFormOpen(false);
        setEditingLog(null);
    };

    const handleFormCancel = () => {
        setIsFormOpen(false);
        setEditingLog(null);
    };
    
    return (
        <div className="flex flex-col h-full">
            <AppHeader title="交易笔记">
                <Button onClick={handleAddClick}>
                    <PlusCircle className="mr-2" />
                    添加交易
                </Button>
            </AppHeader>
             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-3xl">
                    <ScrollArea className="max-h-[80vh]">
                    <div className="p-1">
                        <TradeLogForm 
                            tradeLog={editingLog} 
                            onSubmit={handleFormSubmit}
                            onCancel={handleFormCancel}
                        />
                    </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <ScrollArea className="flex-1">
              <main className="p-4 md:p-6 lg:p-8">
                  <TradeLogTable 
                    tradeLogs={tradeLogs} 
                    handleEdit={handleEditClick} 
                    deleteTradeLog={deleteTradeLog} 
                  />
              </main>
            </ScrollArea>
        </div>
    );
}
