/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

function detectCategory(q: string, tags: string): string {
  const t = (q + ' ' + tags).toLowerCase();
  if (/bitcoin|btc|\beth\b|ethereum|crypto|solana|token|defi|blockchain|coinbase|binance|nft/.test(t)) return 'crypto';
  if (/nba|nfl|nhl|mlb|soccer|football|basketball|tennis|ufc|boxing|sport|champion|league|match|playoff|tournament|world cup|super bowl/.test(t)) return 'sports';
  if (/elect|presid|senate|democrat|republican|vote|minister|congress|government|trump|biden|harris|campaign/.test(t)) return 'politics';
  return 'general';
}

export async function GET() {
  try {
    // Fetch 300 active markets ordered by 24h volume — gives us the hottest markets first
    const pages = await Promise.all(
      [0, 100, 200].map(offset =>
        fetch(
          `https://gamma-api.polymarket.com/markets?limit=100&offset=${offset}&active=true&order=volume24hr&ascending=false`,
          { next: { revalidate: 60 } }
        )
          .then(r => r.json())
          .then((d: any[]) => (Array.isArray(d) ? d : []))
          .catch(() => [] as any[])
      )
    );

    const raw: any[] = pages.flat();
    const seen = new Set<string>();

    const markets = raw
      .filter((m: any) => {
        if (seen.has(m.id) || !m.question) return false;
        seen.add(m.id);

        // Skip extreme-probability markets (already decided)
        let prob = 0.5;
        try { prob = parseFloat(JSON.parse(m.outcomePrices || '["0.5"]')[0]); } catch {}
        if (prob < 0.04 || prob > 0.96) return false;

        return true;
      })
      .map((m: any) => {
        let prob = 0.5;
        try { prob = parseFloat(JSON.parse(m.outcomePrices || '["0.5","0.5"]')[0]); } catch {}

        const category = detectCategory(m.question || '', JSON.stringify(m.tags || ''));
        const eventSlug = m.events?.[0]?.slug || m.slug || null;
        const volume24h = parseFloat(m.volume24hr || '0');
        const priceChange = m.oneMonthPriceChange != null ? parseFloat(m.oneMonthPriceChange) : null;

        return {
          id: m.id,
          question: m.question,
          probability: prob,
          volume: parseFloat(m.volumeNum || '0'),
          volume24h,
          category,
          endDate: m.endDateIso || '',
          image: m.image || m.icon || null,
          tradeUrl: eventSlug ? `https://polymarket.com/event/${eventSlug}` : 'https://polymarket.com',
          priceChange,
          spread: m.spread != null ? parseFloat(m.spread) : null,
        };
      });

    // Trending = top 10 by 24h volume
    const trending = [...markets]
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 10);

    return NextResponse.json(
      { markets, trending },
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    );
  } catch (err: any) {
    return NextResponse.json({ markets: [], trending: [], error: err.message }, { status: 500 });
  }
}
