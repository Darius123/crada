import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, plan } = await req.json();

    if (!email || !plan) {
      return NextResponse.json({ error: 'Missing email or plan' }, { status: 400 });
    }

    const planMap: Record<string, string | undefined> = {
      'pro-monthly': process.env.NEXT_PUBLIC_PAYSTACK_PRO_PLAN,
      'max-monthly': process.env.NEXT_PUBLIC_PAYSTACK_MAX_PLAN,
      'pro-annual': process.env.NEXT_PUBLIC_PAYSTACK_PRO_ANNUAL_PLAN,
      'max-annual': process.env.NEXT_PUBLIC_PAYSTACK_MAX_ANNUAL_PLAN,
    };

    const amountMap: Record<string, number> = {
      'pro-monthly': 999900,
      'max-monthly': 2499900,
      'pro-annual': 9999900,
      'max-annual': 24999900,
    };

    const planCode = planMap[plan];
    if (!planCode) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountMap[plan],
        plan: planCode,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing/callback`,
      }),
    });

    const data = await res.json();
    if (!data.status) {
      return NextResponse.json({ error: data.message }, { status: 400 });
    }

    return NextResponse.json({ authorizationUrl: data.data.authorization_url, reference: data.data.reference });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
  }
}
