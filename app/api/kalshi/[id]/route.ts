/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

const DFLOW_BASE = 'https://prediction-markets-api-proxy.dflow.workers.dev/api/v1';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [marketRes, eventRes] = await Promise.all([
      fetch(`${DFLOW_BASE}/market/${id}`, {
        headers: { Origin: 'https://dflow.net', Referer: 'https://dflow.net/' },
        next: { revalidate: 30 },
      }),
      fetch(`${DFLOW_BASE}/events`, {
        headers: { Origin: 'https://dflow.net', Referer: 'https://dflow.net/' },
        next: { revalidate: 3600 },
      }),
    ]);

    if (!marketRes.ok) throw new Error(`DFlow returned ${marketRes.status}`);
    const m = await marketRes.json();

    // Build image map from events
    let image: string | null = null;
    try {
      const eventsData = await eventRes.json();
      const event = (eventsData.events ?? []).find((e: any) => e.ticker === m.eventTicker);
      image = event?.imageUrl ?? null;
    } catch {}

    return NextResponse.json({
      id: m.ticker,
      question: m.title,
      subtitle: m.subtitle || '',
      status: m.status,
      result: m.result || null,
      yesBid: m.yesBid ? parseFloat(m.yesBid) : null,
      yesAsk: m.yesAsk ? parseFloat(m.yesAsk) : null,
      noBid: m.noBid ? parseFloat(m.noBid) : null,
      noAsk: m.noAsk ? parseFloat(m.noAsk) : null,
      volume: m.volume ?? 0,
      volume24h: m.volume24hFp ? parseFloat(m.volume24hFp) : 0,
      openInterest: m.openInterest ?? 0,
      closeTime: m.closeTime,
      openTime: m.openTime,
      rulesPrimary: m.rulesPrimary || '',
      canCloseEarly: m.canCloseEarly,
      earlyCloseCondition: m.earlyCloseCondition || '',
      eventTicker: m.eventTicker,
      image,
      accounts: m.accounts ?? {},
      tradeUrl: `https://dflow.net/prediction/${m.eventTicker}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
