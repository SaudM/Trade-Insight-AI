import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type SignalEvent = 'BUY' | 'SELL';
const EVENT_VERSION_DEFAULT = 'v1';
const IDEMPOTENCY_TTL_MS = 6 * 60 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var signalEventIdempotencyMap: Map<string, number> | undefined;
}

type SignalPublishRequest = {
  event_id?: string;
  eventId?: string;
  event_version?: string;
  eventVersion?: string;
  source?: string;
  run_id?: string;
  runId?: string;
  strategy_key?: string;
  strategyKey?: string;
  strategy_name?: string;
  strategyName?: string;
  signal_type?: string;
  signalType?: string;
  symbol?: string;
  stock_name?: string;
  stockName?: string;
  price?: number;
  score?: number;
  stop_loss_ref?: number;
  stopLossRef?: number;
  signal_time?: string;
  signalTime?: string;
  reason_code?: string;
  reasonCode?: string;
  reason?: string;
  trace_id?: string;
  traceId?: string;
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

// Placeholder dispatcher for each channel. Real channel gateways can be wired here later.
async function dispatchToChannel(channel: string, target: string, message: Record<string, any>) {
  console.info('[signal-events][dispatch]', { channel, target, message });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignalPublishRequest;
    const eventId = normalizeUuid(body.event_id ?? body.eventId ?? '');
    const eventVersion = String(body.event_version ?? body.eventVersion ?? EVENT_VERSION_DEFAULT).trim() || EVENT_VERSION_DEFAULT;
    const source = String(body.source ?? '').trim();
    const runId = String(body.run_id ?? body.runId ?? '').trim();
    const strategyKey = String(body.strategy_key ?? body.strategyKey ?? '').trim();
    const strategyName = String(body.strategy_name ?? body.strategyName ?? '').trim();
    const signalType = normalizeSignalType(body.signal_type ?? body.signalType);
    const symbol = String(body.symbol ?? '').trim();
    const stockName = String(body.stock_name ?? body.stockName ?? '').trim();
    const signalTime = String(body.signal_time ?? body.signalTime ?? new Date().toISOString());
    const price = Number(body.price ?? 0);
    const score = body.score === undefined || body.score === null ? undefined : Number(body.score);
    const stopLossRef = body.stop_loss_ref === undefined || body.stop_loss_ref === null
      ? (body.stopLossRef === undefined || body.stopLossRef === null ? undefined : Number(body.stopLossRef))
      : Number(body.stop_loss_ref);
    const reasonCode = String(body.reason_code ?? body.reasonCode ?? '').trim();
    const reason = String(body.reason ?? '');
    const traceId = String(body.trace_id ?? body.traceId ?? '');

    if (!eventId || !source || !runId || !strategyKey || !signalType || !symbol || !reasonCode) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: [
            'event_id|eventId(UUID)',
            'source',
            'run_id|runId',
            'strategy_key|strategyKey',
            'signal_type|signalType(BUY/SELL)',
            'symbol',
            'reason_code|reasonCode',
          ],
        },
        { status: 400 }
      );
    }

    const nowMs = Date.now();
    const idempotencyStore = getIdempotencyMap();
    pruneIdempotencyMap(idempotencyStore, nowMs);
    if (idempotencyStore.has(eventId)) {
      return NextResponse.json({
        success: true,
        accepted: true,
        duplicate: true,
        message: 'Duplicate event ignored by idempotency guard',
        event_id: eventId,
        event_version: eventVersion,
        source,
        run_id: runId,
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

    const matched: Array<{ userId: string; channel: string; target: string }> = [];
    for (const config of configs) {
      const prefs = (config.chartPreferences ?? {}) as ChartPrefsWithSignals;
      const subs = prefs.signalSubscriptions ?? {};
      const strategySub = subs[strategyKey];
      if (!strategySub || strategySub.enabled === false) continue;
      if (!Array.isArray(strategySub.events) || !strategySub.events.includes(signalType)) continue;

      for (const ch of strategySub.channels ?? []) {
        if (!ch?.enabled) continue;
        const target = String(ch?.target ?? '').trim();
        if (!target) continue;
        matched.push({
          userId: config.userId,
          channel: String(ch.type ?? ''),
          target,
        });
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
      stockName: stockName || undefined,
      price: Number.isFinite(price) ? price : undefined,
      score: score !== undefined && Number.isFinite(score) ? score : undefined,
      stopLossRef: stopLossRef !== undefined && Number.isFinite(stopLossRef) ? stopLossRef : undefined,
      signalTime,
      reasonCode,
      reason: reason || undefined,
      traceId: traceId || undefined,
    };

    await Promise.all(
      matched.map(item => dispatchToChannel(item.channel, item.target, {
        userId: item.userId,
        ...message,
      }))
    );

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
          'event_id|eventId(UUID)',
          'source',
          'run_id|runId',
          'strategy_key|strategyKey',
          'signal_type|signalType',
          'symbol',
          'reason_code|reasonCode',
        ],
        optional_fields: [
          'strategy_name|strategyName',
          'stock_name|stockName',
          'price',
          'score',
          'stop_loss_ref|stopLossRef',
          'signal_time|signalTime',
          'reason',
          'trace_id|traceId',
          'event_version|eventVersion',
        ],
        signal_type: ['BUY', 'SELL'],
      },
      idempotency_ttl_ms: IDEMPOTENCY_TTL_MS,
      matchedSubscribers: new Set(matched.map(item => item.userId)).size,
      deliveries: matched.length,
    });
  } catch (error: any) {
    console.error('POST /api/quant/signal-events error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
