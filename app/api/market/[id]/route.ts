import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?id=${id}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    const m = Array.isArray(data) ? data[0] : data;

    if (!m || !m.question) {
      return NextResponse.json({ market: null, error: 'Not found' }, { status: 404 });
    }

    let prob = 0.5;
    try {
      const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]');
      prob = parseFloat(prices[0]);
    } catch {}

    const q = (m.question || '').toLowerCase();
    const category =
      q.includes('bitcoin') || q.includes('btc') || q.includes('crypto') || q.includes('solana') ? 'crypto'
      : q.includes('nba') || q.includes('nfl') || q.includes('sport') || q.includes('champion') ? 'sports'
      : q.includes('elect') || q.includes('presid') || q.includes('senate') ? 'politics'
      : 'general';

    const market = {
      id: m.id,
      question: m.question,
      probability: prob,
      volume: parseFloat(m.volumeNum || '0'),
      liquidity: parseFloat(m.liquidityNum || '0'),
      category,
      endDate: m.endDateIso || '',
      description: m.description || '',
    };

    return NextResponse.json({ market });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ market: null, error: 'Failed to fetch' }, { status: 500 });
  }
}