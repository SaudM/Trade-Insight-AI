import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to determine stock exchange prefix
export function getStockPrefix(symbol: string): string {
  // Shanghai (60xxxx, 68xxxx - STAR Market)
  if (symbol.startsWith('60') || symbol.startsWith('68')) {
    return 'SH';
  }
  // Shenzhen (00xxxx, 30xxxx - ChiNext)
  if (symbol.startsWith('00') || symbol.startsWith('30')) {
    return 'SZ';
  }
  // Beijing (4xxxxx, 8xxxxx, 9xxxxx)
  if (symbol.startsWith('4') || symbol.startsWith('8') || symbol.startsWith('9')) {
    return 'BJ';
  }
  // Default fallback (though usually should match one of above)
  return 'SH';
}

// Generate Xueqiu stock detail URL
export function getXueqiuUrl(symbol: string): string {
  const prefix = getStockPrefix(symbol);
  return `https://xueqiu.com/S/${prefix}${symbol}`;
}
