/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

function detectCategory(q: string): string {
  const t = q.toLowerCase();
  if (/bitcoin|btc|\beth\b|ethereum|crypto|solana|token|defi|blockchain|coinbase|binance|nft/.test(t)) return 'crypto';
  if (/nba|nfl|nhl|mlb|soccer|football|basketball|tennis|ufc|boxing|sport|champion|league|match|playoff|tournament|world cup|super bowl/.test(t)) return 'sports';
  if (/elect|presid|senate|democrat|republican|vote|minister|congress|government|trump|biden|harris|campaign/.test(t)) return 'politics';
  return 'general';
}

async function fetchEventMarket(eventId: string) {
  const res = await fetch(
    `https://gamma-api.polymarket.com/events?id=${eventId}`,
    { cache: 'no-store' }
  );
  const data = await res.json();
  const e = Array.isArray(data) ? data[0] : data;
  if (!e || !e.title) return null;

  const outcomes: { name: string; probability: number; slug: string }[] = [];
  for (const m of e.markets ?? []) {
    try {
      const p = parseFloat(JSON.parse(m.outcomePrices ?? '["0"]')[0]);
      outcomes.push({
        name: m.groupItemTitle || m.question || '',
        probability: p,
        slug: m.slug || '',
      });
    } catch { /* skip */ }
  }
  outcomes.sort((a, b) => b.probability - a.probability);

  return {
    id: `event_${eventId}`,
    question: e.title,
    outcomes,
    probability: outcomes[0]?.probability ?? 0,
    volume: parseFloat(e.volume || '0'),
    liquidity: 0,
    category: detectCategory(e.title),
    endDate: e.endDate || '',
    description: e.description || '',
    image: e.image || null,
    tradeUrl: `https://polymarket.com/event/${e.slug}`,
  };
}

async function fetchBinaryMarket(id: string) {
  const res = await fetch(
    `https://gamma-api.polymarket.com/markets?id=${id}`,
    { cache: 'no-store' }
  );
  const data = await res.json();
  const m = Array.isArray(data) ? data[0] : data;
  if (!m || !m.question) return null;

  let prob = 0.5;
  try {
    const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]');
    prob = parseFloat(prices[0]);
  } catch {}

  const eventSlug = m.events?.[0]?.slug || m.slug || null;
  let clobTokenId: string | null = null;
  try {
    const ids = JSON.parse(m.clobTokenIds || '[]');
    clobTokenId = ids[0] ?? null;
  } catch {}

  return {
    id: m.id,
    question: m.question,
    probability: prob,
    volume: parseFloat(m.volumeNum || '0'),
    liquidity: parseFloat(m.liquidityNum || '0'),
    category: detectCategory(m.question),
    endDate: m.endDateIso || '',
    description: m.description || '',
    tradeUrl: eventSlug ? `https://polymarket.com/event/${eventSlug}` : 'https://polymarket.com',
    clobTokenId,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const market = id.startsWith('event_')
      ? await fetchEventMarket(id.replace('event_', ''))
      : await fetchBinaryMarket(id);

    if (!market) {
      return NextResponse.json({ market: null, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ market });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ market: null, error: 'Failed to fetch' }, { status: 500 });
  }
}
