import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams.toString();
  try {
    const res = await fetch(`https://api.jup.ag/swap/v1/quote?${params}`, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Quote failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
