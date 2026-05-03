import { NextResponse } from 'next/server';

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'RPC error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
