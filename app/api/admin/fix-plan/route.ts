import { NextRequest, NextResponse } from 'next/server';
import { redis, setSubscription, getSubscriptionByEmail } from '@/lib/redis';

// One-time admin endpoint — protected by a secret token
export async function POST(req: NextRequest) {
  const { secret, email, plan } = await req.json();

  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getSubscriptionByEmail(email);
  if (!userId) {
    return NextResponse.json({ error: `No userId found for ${email}` }, { status: 404 });
  }

  await setSubscription(userId, {
    plan,
    planCode: plan === 'max' ? (process.env.NEXT_PUBLIC_PAYSTACK_MAX_ANNUAL_PLAN ?? '') : '',
    customerCode: '',
    subscriptionCode: '',
    email,
    createdAt: Date.now(),
  });

  return NextResponse.json({ ok: true, userId, plan });
}
