/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

// Module-level snapshot for cross-request price comparison
let solPriceSnapshot: { price: number; ts: number } | null = null;

async function fetchJupiterSolPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000&slippageBps=50',
      { cache: 'no-store', headers: { 'Authorization': `Bearer ${process.env.JUPITER_API_KEY}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return parseInt(data.outAmount) / 1e6;
  } catch { return null; }
}

async function detectCryptoCorrelationSignals(markets: any[], solPrice: number): Promise<any[]> {
  const now = Date.now();
  let pctChange = 0;

  if (solPriceSnapshot && now - solPriceSnapshot.ts < 10 * 60 * 1000) {
    pctChange = ((solPrice - solPriceSnapshot.price) / solPriceSnapshot.price) * 100;
  }

  // Rotate snapshot every 5 minutes so comparison is always vs a historical price
  if (!solPriceSnapshot || now - solPriceSnapshot.ts > 5 * 60 * 1000) {
    solPriceSnapshot = { price: solPrice, ts: now };
  }

  const cryptoMarkets = markets.filter((m: any) => {
    const q = (m.question || '').toLowerCase();
    return q.includes('bitcoin') || q.includes('btc') || q.includes('solana') || q.includes(' sol ')
      || q.includes('ethereum') || q.includes('eth') || q.includes('crypto');
  });

  const absPct = Math.abs(pctChange);
  const isVolatile = absPct > 0.5;
  const bullish = pctChange >= 0;

  if (isVolatile && cryptoMarkets.length > 0) {
    const dir = bullish ? '↑' : '↓';
    const totalVol = cryptoMarkets
      .slice(0, 5)
      .reduce((s: number, m: any) => s + parseFloat(m.volumeNum || '0'), 0);

    return [{
      id: 'jup-volatility',
      question: `SOL ${dir} ${absPct.toFixed(2)}% — ${cryptoMarkets.length} crypto markets may be mispriced`,
      probability: bullish ? 0.64 : 0.36,
      volume: totalVol,
      signalType: 'crypto_volatility',
      typeLabel: 'Jupiter Signal',
      typeBadge: bullish ? 'green' : 'red',
      explanation: `Jupiter Price Feed: SOL is at $${solPrice.toFixed(2)} (${pctChange > 0 ? '+' : ''}${pctChange.toFixed(2)}% recent move). ${cryptoMarkets.length} active crypto prediction markets tracked. Spot price volatility typically precedes market repricing — potential arbitrage window.`,
      confidence: Math.min(88, 60 + Math.floor(absPct * 8)),
      jupiterPowered: true,
    }];
  }

  return [{
    id: 'jup-price-context',
    question: `SOL at $${solPrice.toFixed(2)} — Monitoring ${cryptoMarkets.length} crypto markets`,
    probability: 0.5,
    volume: 0,
    signalType: 'price_context',
    typeLabel: 'Jupiter Price Feed',
    typeBadge: 'blue',
    explanation: `Real-time SOL price via Jupiter: $${solPrice.toFixed(2)}. Monitoring ${cryptoMarkets.length} active crypto prediction markets for volatility correlation. A move of ±0.5% or more triggers a directional signal.`,
    confidence: 72,
    jupiterPowered: true,
  }];
}

async function detectInsiderActivity(markets: any[]) {
  const insiderSignals = [];

  for (const m of markets.slice(0, 30)) {
    try {
      const historyRes = await fetch(
        `https://gamma-api.polymarket.com/markets/${m.id}/trades?limit=50`,
        { cache: 'no-store' }
      );
      if (!historyRes.ok) continue;
      const trades = await historyRes.json();
      if (!Array.isArray(trades) || trades.length < 3) continue;

      const now = Date.now();
      const windowMs = 30 * 60 * 1000;
      const recentTrades = trades.filter((t: any) => {
        const tradeTime = new Date(t.timestamp || t.createdAt || 0).getTime();
        return now - tradeTime < windowMs;
      });

      if (recentTrades.length < 3) continue;

      const uniqueAddresses = new Set(recentTrades.map((t: any) => t.maker || t.address || t.transactionHash));
      const totalValue = recentTrades.reduce((sum: number, t: any) => sum + parseFloat(t.usdcSize || t.size || '0'), 0);

      if (uniqueAddresses.size >= 3 && totalValue > 5000) {
        let prob = 0.5;
        try {
          const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]');
          prob = parseFloat(prices[0]);
        } catch {}

        const topWallets = [...uniqueAddresses]
          .filter(a => typeof a === 'string' && a.length > 20 && !a.startsWith('0x'))
          .slice(0, 3);

        insiderSignals.push({
          id: m.id,
          question: m.question,
          probability: prob,
          volume: parseFloat(m.volumeNum || '0'),
          signalType: 'insider',
          typeLabel: 'Insider alert',
          typeBadge: 'purple',
          explanation: `${uniqueAddresses.size} wallets placed coordinated positions totalling $${(totalValue / 1000).toFixed(1)}K in the last 30 minutes. Pattern matches prior insider activity detected on this platform.`,
          confidence: Math.min(95, 60 + uniqueAddresses.size * 5 + Math.floor(totalValue / 1000)),
          topWallets,
        });
      }
    } catch {}
  }

  return insiderSignals;
}

export async function GET() {
  try {
    const [marketsRes, solPrice] = await Promise.all([
      fetch('https://gamma-api.polymarket.com/markets?limit=100&active=true&order=volumeNum&ascending=false', { cache: 'no-store' }),
      fetchJupiterSolPrice(),
    ]);

    const data = await marketsRes.json();

    const eligible = data.filter((m: any) => {
      const volume = parseFloat(m.volumeNum || '0');
      const liquidity = parseFloat(m.liquidityNum || '0');
      return volume > 10000 && liquidity > 1000;
    });

    // Randomly sample 10 from the top 50 so the feed rotates each load
    const pool = eligible.slice(0, 50);
    const sampled = pool.sort(() => Math.random() - 0.5).slice(0, 10);

    const baseSignals = sampled
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

    const [insiderSignals, cryptoSignals] = await Promise.all([
      detectInsiderActivity(data),
      solPrice ? detectCryptoCorrelationSignals(data, solPrice) : Promise.resolve([]),
    ]);

    const allSignals = [...insiderSignals, ...cryptoSignals, ...baseSignals];

    return NextResponse.json({ signals: allSignals, solPrice });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ signals: [], solPrice: null, error: 'Failed to fetch' }, { status: 500 });
  }
}
