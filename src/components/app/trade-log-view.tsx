"use client";

import type { TradeLog } from '@/lib/types';
import { AppHeader } from './header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { TradeLogTable } from './trade-log-table';
import { TradeLogForm } from './trade-log-form';
import { Dialog, DialogTrigger, DialogContent, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

type TradeLogViewProps = {
    tradeLogs: TradeLog[];
    addTradeLog: (log: Omit<TradeLog, 'id'>) => void;
};

export function TradeLogView({ tradeLogs, addTradeLog }: TradeLogViewProps) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    return (
        <div className="flex flex-col h-full">
            <AppHeader title="交易日志">
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2" />
                            添加交易
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <ScrollArea className="max-h-[80vh]">
                        <div className="p-1">
                          <TradeLogForm addTradeLog={addTradeLog} onFormSubmit={() => setIsFormOpen(false)} />
                        </div>
                      </ScrollArea>
                    </DialogContent>
                </Dialog>
            </AppHeader>
            <ScrollArea className="flex-1">
              <main className="p-4 md:p-6 lg:p-8">
                  <TradeLogTable tradeLogs={tradeLogs} />
              </main>
            </ScrollArea>
        </div>
    );
}
