/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Resolve the YES token ID from the Gamma API
    const marketRes = await fetch(`https://gamma-api.polymarket.com/markets?id=${id}`, {
      next: { revalidate: 3600 },
    });
    const data = await marketRes.json();
    const m = Array.isArray(data) ? data[0] : data;
    if (!m) return NextResponse.json({ history: [] });

    const ids = JSON.parse(m.clobTokenIds || '[]');
    const tokenId: string = ids[0];
    if (!tokenId) return NextResponse.json({ history: [] });

    // Fetch 30-day hourly history from CLOB
    const histRes = await fetch(
      `https://clob.polymarket.com/prices-history?market=${tokenId}&interval=1m&fidelity=60`,
      { next: { revalidate: 300 } }
    );
    const histData = await histRes.json();
    const history: { t: number; p: number }[] = histData.history ?? [];

    // Thin to at most 200 points so the chart stays fast
    const thinned = history.length > 200
      ? history.filter((_: any, i: number) => i % Math.ceil(history.length / 200) === 0)
      : history;

    return NextResponse.json({ history: thinned });
  } catch {
    return NextResponse.json({ history: [] });
  }
}
