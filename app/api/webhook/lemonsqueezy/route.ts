import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { setSubscription, getSubscription } from '@/lib/redis';
import type { Plan } from '@/lib/redis';

const VARIANT_PLAN_MAP: Record<string, Plan> = {
  '1744229': 'pro',   // pro-monthly
  '1744204': 'pro',   // pro-annual
  '1744255': 'max',   // max-monthly
  '1744251': 'max',   // max-annual
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-signature') ?? '';
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? '';

  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (hmac !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);
  const eventName: string = event.meta?.event_name ?? '';
  const userId: string = event.meta?.custom_data?.user_id ?? '';
  const attrs = event.data?.attributes ?? {};
  const variantId = String(attrs.variant_id ?? '');
  const email: string = attrs.user_email ?? '';

  // Subscription created or renewed
  if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
    if (!userId) return NextResponse.json({ received: true });

    const plan: Plan = VARIANT_PLAN_MAP[variantId] ?? 'free';
    const existing = await getSubscription(userId);

    await setSubscription(userId, {
      ...(existing ?? {}),
      plan,
      planCode: variantId,
      customerCode: String(attrs.customer_id ?? ''),
      subscriptionCode: String(event.data?.id ?? ''),
      email: email || existing?.email || '',
      createdAt: existing?.createdAt ?? Date.now(),
    });
  }

  // Subscription cancelled or expired → downgrade to free
  if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
    if (!userId) return NextResponse.json({ received: true });

    const existing = await getSubscription(userId);
    if (existing) {
      await setSubscription(userId, { ...existing, plan: 'free' });
    }
  }

  return NextResponse.json({ received: true });
}
