import { NextRequest, NextResponse } from 'next/server';
import { getSubscription } from '@/lib/redis';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ plan: 'free' });

  const sub = await getSubscription(userId);
  return NextResponse.json({ plan: sub?.plan ?? 'free', subscription: sub ?? null });
}
