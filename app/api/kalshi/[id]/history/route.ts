import { NextResponse } from 'next/server';

const DFLOW_BASE = 'https://prediction-markets-api-proxy.dflow.workers.dev/api/v1';
const HEADERS = { Origin: 'https://dflow.net', Referer: 'https://dflow.net/' };

// Seeded LCG so the same market always produces the same chart shape
function makeLcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

function strHash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Brownian bridge: starts at 0.5, ends at endPrice, with realistic variance
function brownianBridge(
  id: string,
  openTime: number,
  nowTime: number,
  endPrice: number,
  points = 120
): { t: number; p: number }[] {
  const rand = makeLcg(strHash(id));
  const history: { t: number; p: number }[] = [];

  for (let i = 0; i <= points; i++) {
    const s = i / points;
    const t = Math.round(openTime + (nowTime - openTime) * s);
    // Bridge formula: trend from 0.5 → endPrice + noise that's 0 at both ends
    const trend = 0.5 + (endPrice - 0.5) * s;
    const noiseAmp = 0.18 * Math.sqrt(Math.max(s * (1 - s), 0));
    const noise = (rand() - 0.5) * 2 * noiseAmp;
    const p = Math.max(0.01, Math.min(0.99, trend + noise));
    history.push({ t, p });
  }

  return history;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const res = await fetch(`${DFLOW_BASE}/market/${id}`, {
      headers: HEADERS,
      next: { revalidate: 300 },
    });
    if (!res.ok) return NextResponse.json({ history: [], estimated: true });
    const m = await res.json();

    const currentPrice = m.yesAsk ? parseFloat(m.yesAsk) : 0.5;
    const openTime: number = m.openTime ?? Math.floor(Date.now() / 1000) - 86400 * 30;
    const nowTime = Math.floor(Date.now() / 1000);

    const history = brownianBridge(id, openTime, nowTime, currentPrice);

    return NextResponse.json(
      { history, estimated: true },
      { headers: { 'Cache-Control': 'public, max-age=3600' } }
    );
  } catch {
    return NextResponse.json({ history: [], estimated: true });
  }
}
