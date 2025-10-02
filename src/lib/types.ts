export type TradeLog = {
  id: string;
  tradeTime: string;
  symbol: string;
  direction: 'Buy' | 'Sell' | 'Long' | 'Short';
  positionSize: string;
  entryReason: string;
  exitReason: string;
  tradeResult: string;
  mindsetState: string;
  lessonsLearned: string;
};

export type View = 'dashboard' | 'tradelog' | 'daily' | 'weekly' | 'monthly';
