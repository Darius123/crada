import { NextRequest, NextResponse } from 'next/server';
import { followTrader, unfollowTrader, isFollowing, getFollowing } from '@/lib/redis';

// GET /api/trader/follow?userId=xxx&address=yyy — check follow status
// GET /api/trader/follow?userId=xxx — list all followed addresses
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const address = req.nextUrl.searchParams.get('address');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  if (address) {
    const following = await isFollowing(userId, address);
    return NextResponse.json({ following });
  }

  const addresses = await getFollowing(userId);
  return NextResponse.json({ addresses });
}

// POST /api/trader/follow — { userId, address }
export async function POST(req: NextRequest) {
  const { userId, address } = await req.json();
  if (!userId || !address) return NextResponse.json({ error: 'userId and address required' }, { status: 400 });
  await followTrader(userId, address);
  return NextResponse.json({ ok: true });
}

// DELETE /api/trader/follow — { userId, address }
export async function DELETE(req: NextRequest) {
  const { userId, address } = await req.json();
  if (!userId || !address) return NextResponse.json({ error: 'userId and address required' }, { status: 400 });
  await unfollowTrader(userId, address);
  return NextResponse.json({ ok: true });
}
