import { NextRequest, NextResponse } from 'next/server';
import { getFollowing } from '@/lib/redis';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ traders: [] });

  const addresses = await getFollowing(userId);
  if (addresses.length === 0) return NextResponse.json({ traders: [] });

  // Fetch activity for each followed trader in parallel (cap at 20 to avoid overload)
  const results = await Promise.allSettled(
    addresses.slice(0, 20).map(async (address) => {
      const res = await fetch(
        `https://data-api.polymarket.com/activity?user=${address}&limit=10`,
        { next: { revalidate: 60 } }
      );
      const activity = res.ok ? await res.json() : [];
      const trades = (activity as any[]).filter((a: any) => a.type === 'TRADE');
      const name = trades[0]?.name ?? `${address.slice(0, 6)}…${address.slice(-4)}`;
      return { address, name, trades };
    })
  );

  const traders = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(t => t.trades.length > 0)
    .sort((a, b) => (b.trades[0]?.timestamp ?? 0) - (a.trades[0]?.timestamp ?? 0));

  return NextResponse.json({ traders });
}
