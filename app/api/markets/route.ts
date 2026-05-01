import { NextResponse } from 'next/server';

async function fetchAllMarkets() {
  const allMarkets: any[] = [];
  let offset = 0;
  const limit = 100;

  while (allMarkets.length < 500) {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?limit=${limit}&offset=${offset}&active=true&order=volumeNum&ascending=false`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    if (!data || data.length === 0) break;
    allMarkets.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }

  return allMarkets;
}

export async function GET() {
  try {
    const raw = await fetchAllMarkets();

    const seen = new Set();
    const markets = raw
      .filter((m: any) => {
        if (seen.has(m.id) || !m.question) return false;
        seen.add(m.id);
        return true;
      })
      .map((m: any) => {
        let prob = 0.5;
        try {
          const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]');
          prob = parseFloat(prices[0]);
        } catch {}

        const q = (m.question || '').toLowerCase();
        const tags = JSON.stringify(m.tags || '').toLowerCase();
        const combined = q + ' ' + tags;

        const category =
          combined.includes('bitcoin') || combined.includes('btc') || combined.includes(' eth') ||
          combined.includes('crypto') || combined.includes('solana') || combined.includes('token') ||
          combined.includes('coin') || combined.includes('blockchain') || combined.includes('defi')
            ? 'crypto'
          : combined.includes('nba') || combined.includes('nfl') || combined.includes('nhl') ||
            combined.includes('mlb') || combined.includes('soccer') || combined.includes('football') ||
            combined.includes('basketball') || combined.includes('tennis') || combined.includes('ufc') ||
            combined.includes('sport') || combined.includes('champion') || combined.includes('league') ||
            combined.includes('match') || combined.includes('tournament') || combined.includes('playoff')
            ? 'sports'
          : combined.includes('elect') || combined.includes('presid') || combined.includes('senate') ||
            combined.includes('democrat') || combined.includes('republican') || combined.includes('vote') ||
            combined.includes('minister') || combined.includes('congress') || combined.includes('government')
            ? 'politics'
          : 'general';

        return {
          id: m.id,
          question: m.question,
          probability: prob,
          volume: parseFloat(m.volumeNum || '0'),
          category,
          endDate: m.endDateIso || '',
          image: m.image || m.icon || null,
        };
      });

    // Trending = top 5 by volume
    const trending = markets.slice(0, 5);

    return NextResponse.json({ markets, trending });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ markets: [], trending: [], error: 'Failed to fetch' }, { status: 500 });
  }
}