import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  try {
    const [activityRes, positionsRes] = await Promise.all([
      fetch(`https://data-api.polymarket.com/activity?user=${address}&limit=50`, { next: { revalidate: 60 } }),
      fetch(`https://data-api.polymarket.com/positions?user=${address}&limit=50`, { next: { revalidate: 60 } }),
    ]);

    const [activity, positions] = await Promise.all([
      activityRes.ok ? activityRes.json() : [],
      positionsRes.ok ? positionsRes.json() : [],
    ]);

    return NextResponse.json({ activity, positions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ activity: [], positions: [] }, { status: 500 });
  }
}
