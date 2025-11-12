/**
 * /api/positions/summary
 * 为指定用户与股票(symbol)返回聚合后的持仓摘要：
 * - avgEntryPrice: 历史买入均价（加权，若数据不可用则为null）
 * - currentQty: 当前持仓股数
 * - maxSellableQty: 最大可卖出股数（考虑冻结股数，若无配置则视为0）
 * - source: 数据来源说明
 *
 * 查询参数：uid 或 firebaseUid；symbol
 */
import { NextResponse } from 'next/server';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { TradeLogAdapter } from '@/lib/adapters/tradelog-adapter';
// 该接口当前不使用统一缓存键，避免无效键导致的类型错误；如需缓存，请在redis模块中新增专用键。

/**
 * 解析用户ID（系统uid优先，其次firebaseUid）
 */
async function resolveUserId(searchParams: URLSearchParams): Promise<string | null> {
  const uid = searchParams.get('uid');
  if (uid) return uid;
  const firebaseUid = searchParams.get('firebaseUid');
  if (firebaseUid) {
    const user = await UserAdapter.getUserByFirebaseUid(firebaseUid);
    return user?.id ?? null;
  }
  return null;
}

/**
 * 从字符串解析股数（兼容“100股/1手/纯数字”），无法解析则返回 NaN
 */
function parseQuantity(positionSize?: string): number {
  if (!positionSize) return NaN;
  const match = String(positionSize).match(/\d+(?:\.\d+)?/);
  if (!match) return NaN;
  return Math.floor(Number(match[0]));
}

/**
 * GET /api/positions/summary?uid=xxx&symbol=阿里巴巴
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = await resolveUserId(searchParams);
    const symbol = searchParams.get('symbol');

    if (!userId || !symbol) {
      return NextResponse.json({ error: 'Missing uid/firebaseUid or symbol' }, { status: 400 });
    }

    // 计算指定标的的持仓摘要（不依赖缓存，直接聚合交易日志）
    const fetchFn = async () => {
      const logs = await TradeLogAdapter.getUserTradeLogs({ userId, limit: 2000 });
      // 仅计算指定标的
      const target = Array.isArray(logs) ? logs.filter((l: any) => l.symbol === symbol) : [];
      let currentQty = 0;
      let totalEntryQty = 0;
      let totalExitQty = 0;

      // 加权均价累加器：Σ(价格×数量)、Σ数量
      let sumValue = 0;
      let sumQty = 0;
      // 最新买入价格（用于卖出界面直接回显）
      let referenceBuyPrice: number | null = null;

      for (const log of target) {
        const qty = parseQuantity(log.positionSize);
        if (!Number.isFinite(qty)) continue;
        const isEntry = ['Buy', 'Long'].includes(log.direction);
        const isExit = ['Sell', 'Close'].includes(log.direction);
        if (isEntry) {
          totalEntryQty += qty;
          currentQty += qty;
          // 后端未保存价格时无法计算均价；若存在 log.buyPrice 则参与加权
          const price = Number((log as any).buyPrice);
          if (Number.isFinite(price)) {
            sumValue += price * qty;
            sumQty += qty;
          }
        }
        if (isExit) {
          totalExitQty += qty;
          currentQty -= qty;
        }
      }

      // 选取“最新一次买入”记录的价格作为参考买入价（若存在）
      try {
        const sorted = [...target].sort((a: any, b: any) => {
          const ta = new Date(a.tradeTime).getTime();
          const tb = new Date(b.tradeTime).getTime();
          return tb - ta; // 降序，最新在前
        });
        for (const log of sorted) {
          const isEntry = ['Buy', 'Long'].includes(log.direction);
          if (!isEntry) continue;
          const price = Number((log as any).buyPrice);
          if (Number.isFinite(price)) {
            referenceBuyPrice = price;
            break;
          }
        }
      } catch {}

      // 冻结股数（占位：目前无配置，视为0；未来可从UserConfig.chartPreferences中读取）
      const frozenQty = 0;
      const maxSellableQty = Math.max(0, currentQty - frozenQty);
      const avgEntryPrice = sumQty > 0 ? Number((sumValue / sumQty).toFixed(4)) : null;

      return {
        symbol,
        avgEntryPrice,
        referenceBuyPrice,
        currentQty,
        maxSellableQty,
        restrictions: { frozenQty },
        source: avgEntryPrice === null
          ? 'position_aggregated_without_price: trade-logs (no price fields)'
          : 'weighted_average_from_trade-logs.buyPrice',
        updatedAt: new Date().toISOString(),
      };
    };

    // 直接调用，无需缓存包装（如需缓存可在redis模块新增专用键）
    const result = await fetchFn();
    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/positions/summary error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}