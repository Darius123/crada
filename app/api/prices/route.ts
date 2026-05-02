/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

const TOKENS = [
  { label: 'SOL',  id: 'solana' },
  { label: 'JUP',  id: 'jupiter-exchange-solana' },
  { label: 'JTO',  id: 'jito-governance-token' },
  { label: 'BONK', id: 'bonk' },
  { label: 'WIF',  id: 'dogwifcoin' },
  { label: 'PYTH', id: 'pyth-network' },
];

export async function GET() {
  try {
    const ids = TOKENS.map(t => t.id).join(',');
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);

    const data = await res.json();

    const fmt = (n: number) =>
      n >= 1000
        ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
        : n >= 1
        ? `$${n.toFixed(2)}`
        : `$${n.toFixed(6)}`;

    const prices = TOKENS.map(({ label, id }) => {
      const entry = data[id];
      if (!entry) return { label, price: '—', change: '—', up: true };
      const change = entry.usd_24h_change ?? 0;
      return {
        label,
        price: fmt(entry.usd ?? 0),
        change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        up: change >= 0,
      };
    });

    return NextResponse.json({ prices }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
