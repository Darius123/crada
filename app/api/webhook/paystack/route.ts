import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { setSubscription, setEmailToUser, getSubscriptionByEmail, Plan } from '@/lib/redis';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex');

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === 'subscription.create' || event.event === 'charge.success') {
    const data = event.data;
    const email = data.customer?.email;
    if (!email) return NextResponse.json({ received: true });

    const userId = await getSubscriptionByEmail(email);
    if (!userId) return NextResponse.json({ received: true });

    const planCode = data.plan?.plan_code ?? '';
    const maxCodes = [process.env.NEXT_PUBLIC_PAYSTACK_MAX_PLAN, process.env.NEXT_PUBLIC_PAYSTACK_MAX_ANNUAL_PLAN];
    const proCodes = [process.env.NEXT_PUBLIC_PAYSTACK_PRO_PLAN, process.env.NEXT_PUBLIC_PAYSTACK_PRO_ANNUAL_PLAN];

    const plan: Plan =
      maxCodes.includes(planCode) ? 'max'
      : proCodes.includes(planCode) ? 'pro'
      : 'free';

    await setSubscription(userId, {
      plan,
      planCode,
      customerCode: data.customer?.customer_code ?? '',
      subscriptionCode: data.subscription_code ?? '',
      email,
      createdAt: Date.now(),
    });
  }

  if (event.event === 'subscription.disable') {
    const email = event.data.customer?.email;
    const customerCode = event.data.customer?.customer_code;
    if (!email || !customerCode) return NextResponse.json({ received: true });
    const userId = await getSubscriptionByEmail(email);
    if (!userId) return NextResponse.json({ received: true });

    // Before downgrading, check if this customer has any other active subscription.
    // This prevents a billing-cycle switch (monthly → annual) from wiping the plan
    // because Paystack cancels the old sub before confirming the new one.
    try {
      const subsRes = await fetch(
        `https://api.paystack.co/subscription?customer=${customerCode}&status=active`,
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );
      const subsData = await subsRes.json();
      const activeCount = subsData?.data?.length ?? 0;
      if (activeCount > 0) {
        // Customer already has a new active subscription — don't downgrade
        return NextResponse.json({ received: true });
      }
    } catch {
      // If the check fails, err on the side of caution and don't downgrade
      return NextResponse.json({ received: true });
    }

    const existing = await import('@/lib/redis').then(m => m.getSubscription(userId));
    if (existing) {
      await setSubscription(userId, { ...existing, plan: 'free' });
    }
  }

  return NextResponse.json({ received: true });
}
