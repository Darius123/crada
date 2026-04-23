'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

interface Market {
  id: string;
  question: string;
  probability: number;
  volume: number;
  category: string;
  endDate: string;
  description?: string;
  liquidity?: number;
}

export default function MarketPage() {
  const { id } = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/market/${id}`)
      .then(res => res.json())
      .then(data => { setMarket(data.market); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-white/40 text-sm">Loading market...</p>
    </main>
  );

  if (!market) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-white/40 text-sm">Market not found.</p>
    </main>
  );

  const pct = Math.round(market.probability * 100);
  const noPct = 100 - pct;

  const scenarios = [
    { color: 'bg-green-500', label: pct > 60 ? 'Likely resolves Yes' : 'Possible Yes outcome', desc: `Market pricing ${pct}% probability. ${pct > 60 ? 'Strong consensus forming.' : 'Uncertain — watch for movement.'}` },
    { color: 'bg-amber-500', label: 'Sideways movement', desc: 'Odds may consolidate before any major shift. Monitor volume for confirmation.' },
    { color: 'bg-red-500', label: noPct > 60 ? 'Likely resolves No' : 'Possible No outcome', desc: `${noPct}% chance of No outcome. ${noPct > 60 ? 'Bears in control.' : 'Still contested.'}` },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="text-white/40 hover:text-white text-sm transition-all">
              ← Back
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-green-400 border border-green-400/30 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
            <WalletMultiButton style={{ fontSize: '12px', padding: '6px 14px', height: 'auto', backgroundColor: '#7c3aed', borderRadius: '20px' }} />
          </div>
        </div>

        {/* Question */}
        <div className="border border-white/10 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs border border-white/10 px-2 py-0.5 rounded-full text-white/40">{market.category}</span>
          </div>
          <h1 className="text-lg font-medium leading-snug mb-4">{market.question}</h1>

          {/* Yes/No bars */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-medium text-purple-400">{pct}%</div>
              <div className="text-xs text-white/40 mt-1">Yes</div>
            </div>
            <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-medium text-white/60">{noPct}%</div>
              <div className="text-xs text-white/40 mt-1">No</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-white/40 mb-1">Volume</div>
              <div className="text-sm font-medium">${(market.volume / 1000).toFixed(0)}K</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-white/40 mb-1">Liquidity</div>
              <div className="text-sm font-medium">${((market.liquidity || 0) / 1000).toFixed(0)}K</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-white/40 mb-1">Category</div>
              <div className="text-sm font-medium capitalize">{market.category}</div>
            </div>
          </div>
        </div>

        {/* Risk scenarios */}
        <div className="border border-white/10 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-medium mb-4 text-white/60">Risk scenarios</h2>
          <div className="flex flex-col gap-3">
            {scenarios.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.color}`} />
                <div>
                  <div className="text-sm font-medium mb-0.5">{s.label}</div>
                  <div className="text-xs text-white/40 leading-relaxed">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Signal box */}
        <div className="border border-purple-500/20 bg-purple-500/5 rounded-xl p-5">
          <h2 className="text-sm font-medium mb-2 text-purple-300">Foresight signal</h2>
          <p className="text-xs text-white/50 leading-relaxed">
            {pct > 70
              ? `Strong consensus at ${pct}%. High-conviction market — informed traders appear aligned. Watch for late reversal if new information emerges.`
              : pct < 30
              ? `Low probability at ${pct}%. Contrarian play — market is pricing this as unlikely. Any positive news could trigger sharp movement.`
              : `Contested market at ${pct}%. Neither side has conviction. Volume of $${(market.volume / 1000).toFixed(0)}K suggests active interest — watch for a decisive move.`
            }
          </p>
        </div>

      </div>
    </main>
  );
}