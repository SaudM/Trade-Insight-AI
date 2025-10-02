import type { TradeLog } from './types';

// Helper function to get a date string for X days ago
const getDateDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0] + 'T10:00:00.000Z';
};

export const sampleTradeLogs: TradeLog[] = [
  {
    id: '1',
    tradeTime: getDateDaysAgo(1),
    symbol: 'AAPL',
    direction: 'Buy',
    positionSize: '100 shares',
    entryReason: 'Strong earnings report and bullish market sentiment.',
    exitReason: 'Reached profit target of 5%.',
    tradeResult: '500',
    mindsetState: 'Confident and focused.',
    lessonsLearned: 'Sticking to the plan pays off. Profit target was well-placed.',
  },
  {
    id: '2',
    tradeTime: getDateDaysAgo(1),
    symbol: 'TSLA',
    direction: 'Sell',
    positionSize: '50 shares',
    entryReason: 'News of increased competition and bearish technical signals.',
    exitReason: 'Hit stop-loss after unexpected positive news.',
    tradeResult: '-250',
    mindsetState: 'Anxious due to high volatility.',
    lessonsLearned: 'Volatility can be a double-edged sword. Should have used a wider stop-loss or smaller position.',
  },
  {
    id: '3',
    tradeTime: getDateDaysAgo(2),
    symbol: 'NVDA',
    direction: 'Long',
    positionSize: '1 lot',
    entryReason: 'Breakout above key resistance level.',
    exitReason: 'Partial profit taken, rest stopped at breakeven.',
    tradeResult: '150',
    mindsetState: 'Calm, followed the system.',
    lessonsLearned: 'Good trade management. Taking partial profits reduces risk.',
  },
  {
    id: '4',
    tradeTime: getDateDaysAgo(8),
    symbol: 'GOOGL',
    direction: 'Buy',
    positionSize: '20 shares',
    entryReason: 'Dip buying opportunity on a strong support level.',
    exitReason: 'Exited due to fear of market downturn.',
    tradeResult: '-100',
    mindsetState: 'Fearful, FOMO',
    lessonsLearned: 'Should not let market noise dictate exits. The setup was still valid.',
  },
  {
    id: '5',
    tradeTime: getDateDaysAgo(35),
    symbol: 'MSFT',
    direction: 'Long',
    positionSize: '30 shares',
    entryReason: 'Positive analyst ratings.',
    exitReason: 'Reached profit target.',
    tradeResult: '300',
    mindsetState: 'Neutral',
    lessonsLearned: 'Solid trade based on external catalyst.',
  },
];
