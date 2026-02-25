import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type SignalEvent = 'BUY' | 'SELL';
const EVENT_VERSION_DEFAULT = 'v1';
const IDEMPOTENCY_TTL_MS = 6 * 60 * 60 * 1000;
const BRAND_NAME = '福利复盘 Trade Insight AI';
const BRAND_URL = 'https://fupan.fulitimes.com/';

declare global {
  // eslint-disable-next-line no-var
  var signalEventIdempotencyMap: Map<string, number> | undefined;
}

type SignalPublishRequest = {
  event_id?: string;
  event_version?: string;
  source?: string;
  run_id?: string;
  strategy_key?: string;
  strategy_name?: string;
  signal_type?: string;
  symbol?: string;
  asset_name?: string;
  price?: number;
  score?: number;
  stop_loss_ref?: number;
  occurred_at?: string;
  reason_code?: string;
  reason?: string;
  meta?: Record<string, any>;
};

type StrategySignalSubscription = {
  strategyId: string;
  enabled: boolean;
  events: SignalEvent[];
  channels: Array<{
    type: string;
    enabled: boolean;
    target: string;
  }>;
};

type ChartPrefsWithSignals = Record<string, any> & {
  signalSubscriptions?: Record<string, StrategySignalSubscription>;
};

function normalizeSignalType(input: string | undefined): SignalEvent | null {
  if (!input) return null;
  const t = input.toUpperCase();
  if (t === 'BUY' || t === 'SELL') return t;
  return null;
}

function normalizeUuid(input: string | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value : null;
}

function getIdempotencyMap(): Map<string, number> {
  if (!globalThis.signalEventIdempotencyMap) {
    globalThis.signalEventIdempotencyMap = new Map<string, number>();
  }
  return globalThis.signalEventIdempotencyMap;
}

function pruneIdempotencyMap(store: Map<string, number>, nowMs: number) {
  for (const [eventId, ts] of store.entries()) {
    if (nowMs - ts > IDEMPOTENCY_TTL_MS) {
      store.delete(eventId);
    }
  }
}

function maskTarget(target: string): string {
  const t = String(target || '').trim();
  if (!t) return '';
  if (t.length <= 12) return '***';
  return `${t.slice(0, 10)}...${t.slice(-6)}`;
}

function buildSignalText(message: Record<string, any>): string {
  const typeText = message.signalType === 'BUY' ? '买入' : '卖出';
  const timeText = message.occurredAt ?? '-';
  const priceText = message.price !== undefined ? String(message.price) : '-';
  const scoreText = message.score !== undefined ? String(message.score) : '-';
  const stopLossText = message.stopLossRef !== undefined ? String(message.stopLossRef) : '-';
  const reasonText = message.reason ?? '-';

  return [
    `交易信号通知（${typeText}）`,
    `策略：${message.strategyName ?? message.strategyKey ?? '-'}`,
    `标的：${message.assetName ?? ''} ${message.symbol ?? '-'}`.trim(),
    `价格：${priceText}`,
    `评分：${scoreText}`,
    `止损参考：${stopLossText}`,
    `原因码：${message.reasonCode ?? '-'}`,
    `原因：${reasonText}`,
    `时间：${timeText}`,
    `事件ID：${message.eventId ?? '-'}`,
  ].join('\n');
}

function buildFeishuPostContent(message: Record<string, any>) {
  const isBuy = message.signalType === 'BUY';
  const actionLabel = isBuy ? '买入' : '卖出';
  const symbolText = `${message.assetName ?? ''} ${message.symbol ?? '-'}`.trim();
  const priceLabel = isBuy ? '买入参考' : '卖出参考';
  const priceText = message.price !== undefined ? String(message.price) : '-';
  const scoreText = message.score !== undefined ? String(message.score) : '-';
  const stopLossText = message.stopLossRef !== undefined ? String(message.stopLossRef) : '-';
  const occurredAtRaw = String(message.occurredAt ?? '-');
  const occurredAtText = occurredAtRaw.length >= 10 ? occurredAtRaw.slice(0, 10) : occurredAtRaw;

  return {
    post: {
      zh_cn: {
        title: `【${actionLabel}】${symbolText}`,
        content: [
          [
            { tag: 'text', text: `信号解读：【${actionLabel}】` },
          ],
          [
            { tag: 'text', text: `标的：${symbolText}` },
          ],
          [
            { tag: 'text', text: `评分：${scoreText}` },
          ],
          [
            { tag: 'text', text: `${priceLabel}：${priceText}` },
          ],
          [
            { tag: 'text', text: `止损参考：${stopLossText}` },
          ],
          [
            { tag: 'text', text: `触发时间(UTC)：${occurredAtText}` },
          ],
          [
            { tag: 'text', text: '风险提示：策略信号仅供参考，不构成投资建议；请结合仓位管理与止损规则独立决策。' },
          ],
          [
            { tag: 'text', text: `推送来源：${BRAND_NAME} 策略引擎` },
          ],
          [
            { tag: 'a', text: '查看完整策略与订阅设置', href: BRAND_URL },
          ],
        ],
      },
    },
  };
}

async function postJson(url: string, body: Record<string, any>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
  }
}

async function dispatchToChannel(channel: string, target: string, message: Record<string, any>) {
  const channelType = String(channel || '').toLowerCase();

  if (channelType === 'feishu') {
    await postJson(target, {
      msg_type: 'post',
      content: buildFeishuPostContent(message),
    });
    return;
  }

  if (channelType === 'webhook') {
    await postJson(target, message);
    return;
  }

  throw new Error(`Unsupported channel: ${channelType}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignalPublishRequest;
    const eventId = normalizeUuid(body.event_id ?? '');
    const eventVersion = String(body.event_version ?? '').trim();
    const source = String(body.source ?? '').trim();
    const runId = String(body.run_id ?? '').trim();
    const strategyKey = String(body.strategy_key ?? '').trim();
    const strategyName = String(body.strategy_name ?? '').trim();
    const signalType = normalizeSignalType(body.signal_type ?? '');
    const symbol = String(body.symbol ?? '').trim();
    const assetName = String(body.asset_name ?? '').trim();
    const occurredAt = String(body.occurred_at ?? '').trim();
    const price = body.price === undefined || body.price === null ? undefined : Number(body.price);
    const score = body.score === undefined || body.score === null ? undefined : Number(body.score);
    const stopLossRef = body.stop_loss_ref === undefined || body.stop_loss_ref === null ? undefined : Number(body.stop_loss_ref);
    const reasonCode = String(body.reason_code ?? '').trim();
    const reason = String(body.reason ?? '');
    const meta = body.meta && typeof body.meta === 'object' ? body.meta : undefined;

    if (!eventId || !source || !runId || !strategyKey || !signalType || !symbol || !reasonCode || !occurredAt || !eventVersion) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: [
            'event_id(UUID)',
            'event_version(v1)',
            'source',
            'run_id',
            'strategy_key',
            'signal_type(BUY/SELL)',
            'symbol',
            'reason_code',
            'occurred_at(ISO8601 UTC)',
          ],
        },
        { status: 400 }
      );
    }
    if (eventVersion !== EVENT_VERSION_DEFAULT) {
      return NextResponse.json(
        { error: 'Invalid event_version', expected: EVENT_VERSION_DEFAULT },
        { status: 400 }
      );
    }
    if (source !== 'strategy-engine') {
      return NextResponse.json(
        { error: 'Invalid source', expected: 'strategy-engine' },
        { status: 400 }
      );
    }
    const occurredAtTs = Date.parse(occurredAt);
    if (Number.isNaN(occurredAtTs)) {
      return NextResponse.json(
        { error: 'Invalid occurred_at', expected: 'ISO8601 UTC string' },
        { status: 400 }
      );
    }
    console.info('[signal-events][incoming]', {
      eventIdRaw: body.event_id ?? null,
      eventId: eventId ?? null,
      eventVersion,
      source,
      runId,
      strategyKey,
      signalType: signalType ?? null,
      symbol,
      reasonCode,
      occurredAt,
    });

    const nowMs = Date.now();
    const idempotencyStore = getIdempotencyMap();
    pruneIdempotencyMap(idempotencyStore, nowMs);
    // TEST MODE:
    // Temporarily disable idempotency short-circuit for end-to-end verification.
    // Re-enable this block before production.
    const firstSeenAtMs = idempotencyStore.get(eventId);
    if (firstSeenAtMs) {
      const duplicateAgeSeconds = Math.floor((nowMs - firstSeenAtMs) / 1000);
      console.info('[signal-events][summary]', {
        eventId,
        duplicate: true,
        reason: 'idempotency_hit',
        firstSeenAt: new Date(firstSeenAtMs).toISOString(),
        duplicateAgeSeconds,
        strategyKey,
        signalType,
        runId,
        matchedSubscribers: 0,
        deliveries: 0,
        failedDeliveries: 0,
      });
      return NextResponse.json({
        success: true,
        accepted: true,
        duplicate: true,
        message: 'Duplicate event ignored by idempotency guard',
        event_id: eventId,
        event_version: eventVersion,
        source,
        run_id: runId,
        reason: 'idempotency_hit',
        first_seen_at: new Date(firstSeenAtMs).toISOString(),
        duplicate_age_seconds: duplicateAgeSeconds,
        matchedSubscribers: 0,
        deliveries: 0,
        failedDeliveries: 0,
        idempotency_ttl_ms: IDEMPOTENCY_TTL_MS,
      });
    }
    idempotencyStore.set(eventId, nowMs);

    const configs = await prisma.userConfig.findMany({
      select: {
        userId: true,
        chartPreferences: true,
      },
    });

    const matchStats = {
      totalUserConfigs: configs.length,
      missingStrategySubscription: 0,
      strategyDisabled: 0,
      eventNotSubscribed: 0,
      channelDisabledOrEmptyTarget: 0,
      matchedChannels: 0,
    };
    const matched: Array<{ userId: string; channel: string; target: string }> = [];
    for (const config of configs) {
      const prefs = (config.chartPreferences ?? {}) as ChartPrefsWithSignals;
      const subs = prefs.signalSubscriptions ?? {};
      const strategySub = subs[strategyKey];
      if (!strategySub) {
        matchStats.missingStrategySubscription += 1;
        continue;
      }
      if (strategySub.enabled === false) {
        matchStats.strategyDisabled += 1;
        continue;
      }
      if (!Array.isArray(strategySub.events) || !strategySub.events.includes(signalType)) {
        matchStats.eventNotSubscribed += 1;
        continue;
      }

      for (const ch of strategySub.channels ?? []) {
        if (!ch?.enabled) {
          matchStats.channelDisabledOrEmptyTarget += 1;
          continue;
        }
        const target = String(ch?.target ?? '').trim();
        if (!target) {
          matchStats.channelDisabledOrEmptyTarget += 1;
          continue;
        }
        matched.push({
          userId: config.userId,
          channel: String(ch.type ?? ''),
          target,
        });
        matchStats.matchedChannels += 1;
      }
    }

    const message = {
      eventId,
      eventVersion,
      source,
      runId,
      strategyKey,
      strategyName: strategyName || undefined,
      signalType,
      symbol,
      assetName: assetName || undefined,
      price: Number.isFinite(price) ? price : undefined,
      score: score !== undefined && Number.isFinite(score) ? score : undefined,
      stopLossRef: stopLossRef !== undefined && Number.isFinite(stopLossRef) ? stopLossRef : undefined,
      occurredAt,
      reasonCode,
      reason: reason || undefined,
      meta,
    };

    const deliveryResults = await Promise.allSettled(
      matched.map(async (item) => {
        await dispatchToChannel(item.channel, item.target, {
          userId: item.userId,
          ...message,
        });
        return item;
      })
    );
    const successDeliveries = deliveryResults.filter(r => r.status === 'fulfilled').length;
    const failedDeliveries = deliveryResults.length - successDeliveries;
    const matchedSubscribers = new Set(matched.map(item => item.userId)).size;
    if (failedDeliveries > 0) {
      const failed = deliveryResults
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => String(r.reason?.message ?? r.reason ?? 'unknown error'));
      console.error('[signal-events][delivery-failed]', {
        eventId,
        failedDeliveries,
        matchedTargets: matched.map(m => ({ channel: m.channel, target: maskTarget(m.target), userId: m.userId })),
        errors: failed,
      });
    }
    console.info('[signal-events][summary]', {
      eventId,
      duplicate: false,
      reason: failedDeliveries > 0 ? 'delivery_partial_failed_or_failed' : 'delivered_or_no_subscriber',
      strategyKey,
      signalType,
      runId,
      matchStats,
      matchedSubscribers,
      deliveries: successDeliveries,
      failedDeliveries,
    });

    return NextResponse.json({
      success: true,
      accepted: true,
      message: 'Signal accepted and dispatched to subscribed channels',
      event_id: eventId,
      event_version: eventVersion,
      source,
      run_id: runId,
      protocol: {
        required_fields: [
          'event_id(UUID)',
          'event_version(v1)',
          'source',
          'run_id',
          'strategy_key',
          'signal_type',
          'symbol',
          'reason_code',
          'occurred_at',
        ],
        optional_fields: [
          'strategy_name',
          'asset_name',
          'price',
          'score',
          'stop_loss_ref',
          'reason',
          'meta',
        ],
        signal_type: ['BUY', 'SELL'],
      },
      idempotency_ttl_ms: IDEMPOTENCY_TTL_MS,
      matchedSubscribers,
      deliveries: successDeliveries,
      failedDeliveries,
    });
  } catch (error: any) {
    console.error('POST /api/quant/signal-events error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
