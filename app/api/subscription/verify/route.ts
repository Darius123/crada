import { NextRequest, NextResponse } from 'next/server';
import { setSubscription, setEmailToUser, getSubscription } from '@/lib/redis';
import type { Plan } from '@/lib/redis';

const VARIANT_PLAN_MAP: Record<string, Plan> = {
  '1744229': 'pro',
  '1744204': 'pro',
  '1744255': 'max',
  '1744251': 'max',
};

export async function POST(req: NextRequest) {
  try {
    const { orderId, userId } = await req.json();

    if (!orderId || !userId) {
      return NextResponse.json({ error: 'Missing orderId or userId' }, { status: 400 });
    }

    const res = await fetch(`https://api.lemonsqueezy.com/v1/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        Accept: 'application/vnd.api+json',
      },
    });

    const data = await res.json();
    const attrs = data?.data?.attributes;
    if (!attrs || attrs.status !== 'paid') {
      return NextResponse.json({ error: 'Order not paid' }, { status: 400 });
    }

    const variantId = String(attrs.first_order_item?.variant_id ?? '');
    const plan: Plan = VARIANT_PLAN_MAP[variantId] ?? 'free';
    const email: string = attrs.user_email ?? '';

    const existing = await getSubscription(userId);
    const subscription = {
      ...(existing ?? {}),
      plan,
      planCode: variantId,
      customerCode: String(attrs.customer_id ?? ''),
      subscriptionCode: '',
      email,
      createdAt: existing?.createdAt ?? Date.now(),
    };

    await setSubscription(userId, subscription);
    if (email) await setEmailToUser(email, userId);

    return NextResponse.json({ plan });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
