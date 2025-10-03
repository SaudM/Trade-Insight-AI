import { Timestamp } from "firebase/firestore";
import { z } from 'zod';

export type TradeLog = {
  id: string;
  userId: string;
  tradeTime: string | Timestamp;
  symbol: string;
  direction: 'Buy' | 'Sell' | 'Long' | 'Short' | 'Close';
  positionSize: string;
  entryReason?: string;
  exitReason?: string;
  tradeResult: string;
  mindsetState: string;
  lessonsLearned: string;
  createdAt: Timestamp;
};

export type View = 'dashboard' | 'tradelog' | 'daily' | 'weekly' | 'monthly';

export const StockSchema = z.object({
  value: z.string(),
  label: z.string(),
});
export type Stock = z.infer<typeof StockSchema>;
