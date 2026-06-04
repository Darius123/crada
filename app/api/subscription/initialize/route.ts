import { NextRequest, NextResponse } from 'next/server';

const VARIANT_MAP: Record<string, string> = {
  'pro-monthly':  '1744229',
  'pro-annual':   '1744204',
  'max-monthly':  '1744255',
  'max-annual':   '1744251',
};

const STORE_ID = '391005';

export async function POST(req: NextRequest) {
  try {
    const { email, plan, userId } = await req.json();

    if (!email || !plan || !userId) {
      return NextResponse.json({ error: 'Missing email, plan, or userId' }, { status: 400 });
    }

    const variantId = VARIANT_MAP[plan];
    if (!variantId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            product_options: {
              redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://crada.fun'}/pricing/callback`,
            },
            checkout_data: {
              email,
              custom: { user_id: userId },
            },
          },
          relationships: {
            store:   { data: { type: 'stores',   id: STORE_ID } },
            variant: { data: { type: 'variants',  id: variantId } },
          },
        },
      }),
    });

    const data = await res.json();
    const url = data?.data?.attributes?.url;
    if (!url) {
      return NextResponse.json({ error: data?.errors?.[0]?.detail ?? 'Failed to create checkout' }, { status: 400 });
    }

    return NextResponse.json({ authorizationUrl: url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 });
  }
}
