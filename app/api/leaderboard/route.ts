import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const timePeriod = searchParams.get('timePeriod') ?? 'DAY';
  const orderBy = searchParams.get('orderBy') ?? 'PNL';
  const limit = searchParams.get('limit') ?? '100';
  const offset = searchParams.get('offset') ?? '0';

  try {
    const res = await fetch(
      `https://data-api.polymarket.com/v1/leaderboard?timePeriod=${timePeriod}&orderBy=${orderBy}&limit=${limit}&offset=${offset}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json([], { status: 500 });
  }
}
