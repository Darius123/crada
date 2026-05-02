/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

const DFLOW_BASE = 'https://prediction-markets-api-proxy.dflow.workers.dev/api/v1';
const HEADERS = { Origin: 'https://dflow.net', Referer: 'https://dflow.net/' };

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (/nba|nfl|nhl|mlb|soccer|baseball|football|basketball|tennis|golf|olympic|championship|playoff|super bowl|world cup|ufc|boxing/.test(t)) return 'sports';
  if (/president|congress|senate|election|democrat|republican|trump|biden|harris|vote|governor|mayor|political|cabinet/.test(t)) return 'politics';
  if (/bitcoin|ethereum|crypto|btc|eth|sol|token|defi|blockchain|coinbase|binance/.test(t)) return 'crypto';
  return 'general';
}

async function fetchEventImages(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch(`${DFLOW_BASE}/events?limit=200`, {
      headers: HEADERS,
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    for (const e of data.events ?? []) {
      if (e.ticker && e.imageUrl) map.set(e.ticker, e.imageUrl);
    }
  } catch {}
  return map;
}

async function fetchActiveMarkets(): Promise<any[]> {
  // DFlow supports ?status=active — fetch up to 500 in parallel pages
  const pages = await Promise.all(
    [0, 200, 400].map(cursor =>
      fetch(`${DFLOW_BASE}/markets?limit=200&status=active&cursor=${cursor}`, {
        headers: HEADERS,
        next: { revalidate: 60 },
      })
        .then(r => r.json())
        .then(d => d.markets ?? [])
        .catch(() => [] as any[])
    )
  );
  return pages.flat();
}

export async function GET() {
  try {
    const [imageMap, raw] = await Promise.all([
      fetchEventImages(),
      fetchActiveMarkets(),
    ]);

    const seen = new Set<string>();
    const markets = raw
      .filter((m: any) => {
        if (seen.has(m.ticker) || !m.title) return false;
        seen.add(m.ticker);

        // Must have a live price and be genuinely contested
        const yesAsk = m.yesAsk ? parseFloat(m.yesAsk) : null;
        if (yesAsk == null) return false;
        if (yesAsk < 0.05 || yesAsk > 0.95) return false;

        return true;
      })
      .map((m: any) => {
        const category = detectCategory(m.title);
        const image = imageMap.get(m.eventTicker) ?? null;
        const volume24h = m.volume24hFp ? parseFloat(m.volume24hFp) : 0;
        return {
          id: m.ticker,
          question: m.title,
          category,
          status: m.status,
          result: m.result || null,
          yesPct: Math.round(parseFloat(m.yesAsk) * 100),
          noPct: Math.round(parseFloat(m.noAsk ?? (1 - parseFloat(m.yesAsk)).toFixed(4)) * 100),
          volume: m.volume ?? 0,
          volume24h,
          closeTime: m.closeTime,
          image,
          tradeUrl: `https://dflow.net/prediction/${m.eventTicker}`,
        };
      })
      .sort((a: any, b: any) => b.volume24h - a.volume24h);

    // Trending = top 10 by 24h volume
    const trending = markets.slice(0, 10);

    return NextResponse.json(
      { markets, trending },
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
