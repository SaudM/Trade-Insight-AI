import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'A股量化策略会员定价 - 实盘信号订阅 | Trade Insight AI',
  description:
    '订阅 A 股量化策略实时信号：体制自适应轮动 + 底部反转双策略，历史模拟年化 37%~47%、持仓交易全透明。月付 ¥39 起，年付低至 ¥24.9/月，新用户 7 天免费试用。',
  keywords: [
    'A股量化策略',
    '量化交易信号',
    '股票策略订阅',
    'AI炒股助手',
    '量化选股',
    '交易复盘AI',
  ],
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'A股量化策略会员 - 双策略实时信号订阅',
    description:
      '体制自适应轮动 + 底部反转双量化策略，净值曲线与持仓全公开。月付 ¥39 起，7 天免费试用。',
    type: 'website',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
