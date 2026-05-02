/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

const DFLOW_BASE = 'https://prediction-markets-api-proxy.dflow.workers.dev/api/v1';
const HEADERS = { Origin: 'https://dflow.net', Referer: 'https://dflow.net/' };

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (/nba|nfl|nhl|mlb|soccer|baseball|football|basketball|tennis|golf|olympic|championship|playoff|super bowl|world cup|ufc|boxing|pro basketball|pro football/.test(t)) return 'sports';
  if (/president|congress|senate|election|democrat|republican|trump|biden|harris|vote|governor|mayor|party|political|fed chair|cabinet|inaugur/.test(t)) return 'politics';
  if (/bitcoin|ethereum|crypto|btc|eth|sol|token|defi|blockchain|coinbase|binance/.test(t)) return 'crypto';
  return 'general';
}

async function fetchEventImages(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch(`${DFLOW_BASE}/events?limit=200`, {
      headers: HEADERS,
      next: { revalidate: 3600 }, // images change rarely
    });
    const data = await res.json();
    for (const e of data.events ?? []) {
      if (e.ticker && e.imageUrl) map.set(e.ticker, e.imageUrl);
    }
  } catch {}
  return map;
}

export async function GET() {
  try {
    const [imageMap, ...pages] = await Promise.all([
      fetchEventImages(),
      ...Array.from({ length: 20 }, (_, i) => i * 50).map(cursor =>
        fetch(`${DFLOW_BASE}/markets?limit=50&cursor=${cursor}`, {
          headers: HEADERS,
          next: { revalidate: 60 },
        })
          .then(r => r.json())
          .then(d => d.markets ?? [])
          .catch(() => [])
      ),
    ]);

    const all: any[] = (pages as any[][]).flat();

    const seen = new Set<string>();
    const markets = all
      .filter(m => {
        if (seen.has(m.ticker)) return false;
        seen.add(m.ticker);
        return true;
      })
      .filter(m => m.status !== 'settled')
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return b.closeTime - a.closeTime;
      })
      .slice(0, 200)
      .map(m => {
        const category = detectCategory(m.title);
        const image = imageMap.get(m.eventTicker) ?? null;
        return {
          id: m.ticker,
          question: m.title,
          category,
          status: m.status,
          result: m.result || null,
          yesPct: m.yesAsk ? Math.round(parseFloat(m.yesAsk) * 100) : null,
          noPct: m.noAsk ? Math.round(parseFloat(m.noAsk) * 100) : null,
          volume: m.volume ?? 0,
          volume24h: m.volume24hFp ? parseFloat(m.volume24hFp) : 0,
          closeTime: m.closeTime,
          image,
          tradeUrl: `https://dflow.net/prediction/${m.eventTicker}`,
        };
      });

    return NextResponse.json({ markets }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
