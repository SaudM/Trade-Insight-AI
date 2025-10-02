export type Stock = {
  value: string;
  label: string;
};

export const stocks: Stock[] = [
  { value: 'AAPL', label: '苹果 (AAPL)' },
  { value: 'GOOGL', label: '谷歌 (GOOGL)' },
  { value: 'MSFT', label: '微软 (MSFT)' },
  { value: 'AMZN', label: '亚马逊 (AMZN)' },
  { value: 'TSLA', label: '特斯拉 (TSLA)' },
  { value: 'NVDA', label: '英伟达 (NVDA)' },
  { value: 'BABA', label: '阿里巴巴 (BABA)' },
  { value: '0700.HK', label: '腾讯控股 (0700.HK)' },
  { value: '300750', label: '宁德时代 (300750)' },
  { value: '300059', label: '东方财富 (300059)' },
  { value: '300124', label: '汇川技术 (300124)' },
  { value: '300308', label: '中际旭创 (300308)' },
  { value: '600519', label: '贵州茅台 (600519)' },
  { value: '601899', label: '紫金矿业 (601899)' },
  { value: '601398', label: '工商银行 (601398)' },
];
