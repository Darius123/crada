'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

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
  const { login, logout, authenticated } = usePrivy();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market/' + id)
      .then(res => res.json())
      .then(data => {
        if (data.market) setMarket(data.market);
        setLoading(false);
      })
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

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img
              src="/crada-logo.png"
              alt="Crada"
              style={{ height: '40px', width: 'auto', maxWidth: '120px', objectFit: 'contain' }}
            />
            <button onClick={() => router.push('/')} className="text-white/40 text-sm">
              Back
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-green-400 border border-green-400/30 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
            {authenticated ? (
              <button onClick={logout} className="text-xs text-white/40 border border-white/10 px-3 py-1.5 rounded-full">
                Sign out
              </button>
            ) : (
              <button onClick={login} className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: '#7c3aed', color: 'white' }}>
                Sign in
              </button>
            )}
          </div>
        </div>

        <div className="border border-white/10 rounded-xl p-5 mb-4">
          <span className="text-xs border border-white/10 px-2 py-0.5 rounded-full text-white/40 mb-3 inline-block">
            {market.category}
          </span>
          <h1 className="text-lg font-medium leading-snug mb-4">{market.question}</h1>
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
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
            <div className="h-full rounded-full bg-purple-500" style={{ width: pct + '%' }} />
          </div>
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

        <div className="border border-white/10 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-medium mb-4 text-white/60">Risk scenarios</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-green-500" />
              <div>
                <div className="text-sm font-medium mb-0.5">{pct > 60 ? 'Likely resolves Yes' : 'Possible Yes outcome'}</div>
                <div className="text-xs text-white/40 leading-relaxed">Market pricing {pct}% probability. {pct > 60 ? 'Strong consensus forming.' : 'Uncertain — watch for movement.'}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-amber-500" />
              <div>
                <div className="text-sm font-medium mb-0.5">Sideways movement</div>
                <div className="text-xs text-white/40 leading-relaxed">Odds may consolidate before any major shift. Monitor volume for confirmation.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-red-500" />
              <div>
                <div className="text-sm font-medium mb-0.5">{noPct > 60 ? 'Likely resolves No' : 'Possible No outcome'}</div>
                <div className="text-xs text-white/40 leading-relaxed">{noPct}% chance of No outcome. {noPct > 60 ? 'Bears in control.' : 'Still contested.'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-purple-500/20 bg-purple-500/5 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-medium mb-2 text-purple-300">Crada signal</h2>
          <p className="text-xs text-white/50 leading-relaxed">
            {pct > 70
              ? 'Strong consensus at ' + pct + '%. High-conviction market — informed traders appear aligned.'
              : pct < 30
              ? 'Low probability at ' + pct + '%. Contrarian play — any positive news could trigger sharp movement.'
              : 'Contested market at ' + pct + '%. Neither side has conviction. Volume of $' + (market.volume / 1000).toFixed(0) + 'K suggests active interest.'}
          </p>
        </div>

        <div className="border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-medium mb-3 text-white/60">Trade this market</h2>
          <div className="flex gap-3">
            <a
              href={'https://polymarket.com/event/' + market.id}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-3 rounded-xl text-center text-sm font-medium"
              style={{ backgroundColor: '#7c3aed', color: 'white' }}
            >
              Trade on Polymarket
            </a>
            <a
              href="https://kalshi.com"
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-3 rounded-xl text-center text-sm font-medium border border-white/10 text-white"
            >
              Trade on Kalshi
            </a>
          </div>
          <p className="text-xs text-white/20 text-center mt-3">Powered by DFlow x Kalshi on Solana</p>
        </div>

      </div>
    </main>
  );
}