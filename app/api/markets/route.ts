/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

function detectCategory(q: string, tags: string): string {
  const t = (q + ' ' + tags).toLowerCase();
  if (/bitcoin|btc|\beth\b|ethereum|crypto|solana|token|defi|blockchain|coinbase|binance|nft/.test(t)) return 'crypto';
  if (/nba|nfl|nhl|mlb|soccer|football|basketball|tennis|ufc|boxing|sport|champion|league|match|playoff|tournament|world cup|super bowl/.test(t)) return 'sports';
  if (/elect|presid|senate|democrat|republican|vote|minister|congress|government|trump|biden|harris|campaign/.test(t)) return 'politics';
  return 'general';
}

async function fetchMultiOutcomeEvents(now: Date): Promise<any[]> {
  const pages = await Promise.all(
    [0, 100].map(offset =>
      fetch(
        `https://gamma-api.polymarket.com/events?limit=100&offset=${offset}&active=true&order=volume24hr&ascending=false`,
        { next: { revalidate: 60 } }
      )
        .then(r => r.json())
        .then((d: any[]) => (Array.isArray(d) ? d : []))
        .catch(() => [] as any[])
    )
  );

  const results: any[] = [];
  const seen = new Set<string>();

  for (const event of pages.flat()) {
    const markets: any[] = event.markets ?? [];
    if (markets.length < 3) continue;
    if (seen.has(event.id)) continue;

    // Parse all YES probabilities
    const outcomes: { name: string; probability: number }[] = [];
    let total = 0;
    for (const m of markets) {
      try {
        const p = parseFloat(JSON.parse(m.outcomePrices ?? '["0"]')[0]);
        const name = m.groupItemTitle || m.question || '';
        outcomes.push({ name, probability: p });
        total += p;
      } catch { /* skip bad markets */ }
    }

    // Drop events whose resolution date has already passed
    if (event.endDate) {
      try { if (new Date(event.endDate) < now) continue; } catch {}
    }
    // Only include genuine multi-outcome events (probabilities sum to ~1)
    if (total < 0.7 || total > 1.4) continue;
    seen.add(event.id);

    // Sort by probability descending
    outcomes.sort((a, b) => b.probability - a.probability);

    const volume24h = parseFloat(event.volume24hr || event.volume24hFp || '0');
    const category = detectCategory(event.title || '', JSON.stringify(event.tags || ''));

    results.push({
      id: `event_${event.id}`,
      question: event.title || '',
      probability: outcomes[0]?.probability ?? 0.5,
      outcomes,
      volume: parseFloat(event.volume || '0'),
      volume24h,
      category,
      endDate: event.endDate || '',
      image: event.image || null,
      tradeUrl: `https://polymarket.com/event/${event.slug}`,
      priceChange: null,
    });
  }

  return results;
}

export async function GET() {
  try {
    const now = new Date();
    const [binaryPages, multiOutcome] = await Promise.all([
      Promise.all(
        [0, 100, 200].map(offset =>
          fetch(
            `https://gamma-api.polymarket.com/markets?limit=100&offset=${offset}&active=true&order=volume24hr&ascending=false`,
            { next: { revalidate: 60 } }
          )
            .then(r => r.json())
            .then((d: any[]) => (Array.isArray(d) ? d : []))
            .catch(() => [] as any[])
        )
      ),
      fetchMultiOutcomeEvents(now),
    ]);
    const raw: any[] = binaryPages.flat();
    const seen = new Set<string>();

    const binaryMarkets = raw
      .filter((m: any) => {
        if (seen.has(m.id) || !m.question) return false;
        seen.add(m.id);
        // Drop markets whose resolution date has already passed
        if (m.endDateIso) {
          try { if (new Date(m.endDateIso) < now) return false; } catch {}
        }
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

    // Merge and sort all markets by 24h volume
    const allMarkets = [...multiOutcome, ...binaryMarkets]
      .sort((a, b) => b.volume24h - a.volume24h);

    // Trending = top 10 by 24h volume (mix of binary and multi-outcome)
    const trending = allMarkets.slice(0, 10);

    return NextResponse.json(
      { markets: allMarkets, trending },
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    );
  } catch (err: any) {
    return NextResponse.json({ markets: [], trending: [], error: err.message }, { status: 500 });
  }
}
