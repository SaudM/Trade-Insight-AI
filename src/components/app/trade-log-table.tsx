import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
} from "@/components/ui/table"
import type { TradeLog } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import React from "react"

export function TradeLogTable({ tradeLogs }: { tradeLogs: TradeLog[] }) {
    if (tradeLogs.length === 0) {
        return <div className="text-center text-muted-foreground py-16">No trades logged yet. Click "Add Trade" to get started.</div>
    }
    
    return (
      <div className="border rounded-lg">
        <Table>
            <TableCaption>A list of your recent trades.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[180px]">Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Position Size</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                    <TableHead className="w-12"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody asChild>
              <Accordion type="single" collapsible className="w-full">
                  {tradeLogs.map(log => (
                    <AccordionItem value={log.id} key={log.id} asChild>
                      <>
                        <TableRow className="hover:bg-muted/50 data-[state=open]:bg-muted">
                            <TableCell>{new Date(log.tradeTime).toLocaleString()}</TableCell>
                            <TableCell className="font-medium">{log.symbol}</TableCell>
                            <TableCell>
                                <Badge variant={['Buy', 'Long'].includes(log.direction) ? 'default' : 'destructive'} className="capitalize">
                                    {log.direction}
                                </Badge>
                            </TableCell>
                            <TableCell>{log.positionSize}</TableCell>
                            <TableCell className={`text-right font-semibold ${parseFloat(log.tradeResult) >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {parseFloat(log.tradeResult).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </TableCell>
                            <TableCell>
                              <AccordionTrigger className="p-2 [&[data-state=open]>svg]:text-primary"></AccordionTrigger>
                            </TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/20 hover:bg-muted/30">
                          <TableCell colSpan={6} className="p-0">
                              <AccordionContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-4 text-sm">
                                    <div className="space-y-1">
                                      <p className="font-semibold">Mindset / State</p>
                                      <p className="text-muted-foreground">{log.mindsetState}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="font-semibold">Lessons Learned</p>
                                      <p className="text-muted-foreground">{log.lessonsLearned}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="font-semibold">Entry Reason</p>
                                      <p className="text-muted-foreground">{log.entryReason}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="font-semibold">Exit Reason</p>
                                      <p className="text-muted-foreground">{log.exitReason}</p>
                                    </div>
                                  </div>
                              </AccordionContent>
                          </TableCell>
                        </TableRow>
                      </>
                    </AccordionItem>
                  ))}
              </Accordion>
            </TableBody>
        </Table>
      </div>
    );
}
