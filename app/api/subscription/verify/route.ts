import { NextRequest, NextResponse } from 'next/server';
import { setSubscription, setEmailToUser, Plan } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const { reference, userId } = await req.json();

    if (!reference || !userId) {
      return NextResponse.json({ error: 'Missing reference or userId' }, { status: 400 });
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const data = await res.json();
    if (!data.status || data.data.status !== 'success') {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
    }

    const tx = data.data;
    const planCode = tx.plan?.plan_code ?? tx.plan_object?.plan_code ?? '';

    const maxCodes = [
      process.env.NEXT_PUBLIC_PAYSTACK_MAX_PLAN,
      process.env.NEXT_PUBLIC_PAYSTACK_MAX_ANNUAL_PLAN,
    ];
    const proCodes = [
      process.env.NEXT_PUBLIC_PAYSTACK_PRO_PLAN,
      process.env.NEXT_PUBLIC_PAYSTACK_PRO_ANNUAL_PLAN,
    ];

    const plan: Plan =
      maxCodes.includes(planCode) ? 'max'
      : proCodes.includes(planCode) ? 'pro'
      : 'free';

    const subscription = {
      plan,
      planCode,
      customerCode: tx.customer?.customer_code ?? '',
      subscriptionCode: tx.subscription?.subscription_code ?? tx.subscription_code ?? '',
      email: tx.customer?.email ?? '',
      createdAt: Date.now(),
    };

    await setSubscription(userId, subscription);
    if (subscription.email) await setEmailToUser(subscription.email, userId);

    return NextResponse.json({ plan });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
