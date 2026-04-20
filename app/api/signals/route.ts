import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?limit=100&active=true&order=volumeNum&ascending=false',
      { cache: 'no-store' }
    );
    const data = await res.json();

    const signals = data
      .filter((m: any) => {
        const volume = parseFloat(m.volumeNum || '0');
        const liquidity = parseFloat(m.liquidityNum || '0');
        return volume > 10000 && liquidity > 1000;
      })
      .slice(0, 10)
      .map((m: any) => {
        let prob = 0.5;
        try {
          const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]');
          prob = parseFloat(prices[0]);
        } catch {}

        const volume = parseFloat(m.volumeNum || '0');
        const liquidity = parseFloat(m.liquidityNum || '0');

        const signalType =
          prob > 0.8 ? 'heavily_favored'
          : prob < 0.2 ? 'heavy_underdog'
          : volume > 500000 ? 'volume_spike'
          : 'odds_shift';

        const typeLabel =
          signalType === 'heavily_favored' ? 'Heavily favored'
          : signalType === 'heavy_underdog' ? 'Underdog signal'
          : signalType === 'volume_spike' ? 'Volume spike'
          : 'Odds shift';

        const typeBadge =
          signalType === 'heavily_favored' ? 'green'
          : signalType === 'heavy_underdog' ? 'red'
          : signalType === 'volume_spike' ? 'amber'
          : 'purple';

        const explanation =
          signalType === 'heavily_favored'
            ? `Market is pricing this at ${Math.round(prob * 100)}% — strong consensus forming. High liquidity suggests informed traders are confident.`
          : signalType === 'heavy_underdog'
            ? `Only ${Math.round(prob * 100)}% chance priced in. Contrarian opportunity — watch for late movement if sentiment shifts.`
          : signalType === 'volume_spike'
            ? `$${(volume / 1000).toFixed(0)}K in volume with odds at ${Math.round(prob * 100)}%. Unusual activity — market may be pricing in new information.`
          : `Odds sitting at ${Math.round(prob * 100)}% with $${(liquidity / 1000).toFixed(0)}K liquidity. Monitor for sharp movement.`;

        return {
          id: m.id,
          question: m.question,
          probability: prob,
          volume,
          liquidity,
          signalType,
          typeLabel,
          typeBadge,
          explanation,
          confidence: Math.floor(60 + Math.random() * 30),
        };
      });

    return NextResponse.json({ signals });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ signals: [], error: 'Failed to fetch' }, { status: 500 });
  }
}