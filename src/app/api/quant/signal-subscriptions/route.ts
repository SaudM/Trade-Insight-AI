import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type SignalEvent = 'BUY' | 'SELL';
type SignalChannelType =
  | 'feishu'
  | 'wecom'
  | 'sms'
  | 'email'
  | 'telegram'
  | 'dingtalk'
  | 'discord'
  | 'slack'
  | 'webhook';

type ChannelConfig = {
  type: SignalChannelType;
  enabled: boolean;
  target: string;
};

type StrategySignalSubscription = {
  strategyId: string;
  enabled: boolean;
  events: SignalEvent[];
  channels: ChannelConfig[];
  updatedAt?: string;
};

type ChartPrefsWithSignals = Record<string, any> & {
  signalSubscriptions?: Record<string, StrategySignalSubscription>;
};

function normalizeConfig(strategyId: string, input: any): StrategySignalSubscription {
  const eventsRaw = Array.isArray(input?.events) ? input.events : ['BUY', 'SELL'];
  const events = eventsRaw
    .map((v: string) => String(v).toUpperCase())
    .filter((v: string) => v === 'BUY' || v === 'SELL') as SignalEvent[];

  const channelsRaw = Array.isArray(input?.channels) ? input.channels : [];
  const channels: ChannelConfig[] = channelsRaw
    .map((ch: any) => ({
      type: String(ch?.type ?? '').toLowerCase(),
      enabled: Boolean(ch?.enabled),
      target: String(ch?.target ?? ''),
    }))
    .filter((ch: ChannelConfig) => [
      'feishu',
      'wecom',
      'sms',
      'email',
      'telegram',
      'dingtalk',
      'discord',
      'slack',
      'webhook',
    ].includes(ch.type));

  return {
    strategyId,
    enabled: input?.enabled !== false,
    events: events.length ? events : ['BUY', 'SELL'],
    channels,
    updatedAt: input?.updatedAt ?? new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const strategyId = searchParams.get('strategyId');

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    const config = await prisma.userConfig.findFirst({
      where: { userId: uid },
      select: { chartPreferences: true },
    });

    const prefs = (config?.chartPreferences ?? {}) as ChartPrefsWithSignals;
    const allSubscriptions = prefs.signalSubscriptions ?? {};

    if (!strategyId) {
      return NextResponse.json({
        data: allSubscriptions,
      });
    }

    const one = allSubscriptions[strategyId];
    if (!one) {
      return NextResponse.json({
        data: {
          strategyId,
          enabled: true,
          events: ['BUY', 'SELL'],
          channels: [],
        },
      });
    }

    return NextResponse.json({
      data: normalizeConfig(strategyId, one),
    });
  } catch (error: any) {
    console.error('GET /api/quant/signal-subscriptions error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const uid = String(body?.uid ?? '').trim();
    const strategyId = String(body?.strategyId ?? '').trim();

    if (!uid || !strategyId) {
      return NextResponse.json({ error: 'Missing uid or strategyId' }, { status: 400 });
    }

    const nextConfig = normalizeConfig(strategyId, {
      enabled: body?.enabled,
      events: body?.events,
      channels: body?.channels,
      updatedAt: new Date().toISOString(),
    });

    const existing = await prisma.userConfig.findFirst({
      where: { userId: uid },
      select: { id: true, chartPreferences: true },
    });

    const existingPrefs = ((existing?.chartPreferences ?? {}) as ChartPrefsWithSignals);
    const signalSubscriptions = {
      ...(existingPrefs.signalSubscriptions ?? {}),
      [strategyId]: nextConfig,
    };

    const nextPrefs: ChartPrefsWithSignals = {
      ...existingPrefs,
      signalSubscriptions,
    };

    if (existing?.id) {
      await prisma.userConfig.update({
        where: { id: existing.id },
        data: {
          chartPreferences: nextPrefs as any,
        },
      });
    } else {
      await prisma.userConfig.create({
        data: {
          userId: uid,
          initialCapital: 100000,
          currency: 'CNY',
          chartPreferences: nextPrefs as any,
        } as any,
      });
    }

    return NextResponse.json({
      success: true,
      data: nextConfig,
    });
  } catch (error: any) {
    console.error('PUT /api/quant/signal-subscriptions error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

