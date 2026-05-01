'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface Market {
  id: string;
  question: string;
  probability: number;
  volume: number;
  category: string;
  endDate: string;
  image?: string;
}

interface Signal {
  id: string;
  question: string;
  probability: number;
  volume: number;
  signalType: string;
  typeLabel: string;
  typeBadge: string;
  explanation: string;
  confidence: number;
}

const ITEMS_PER_PAGE = 20;

export default function Home() {
  const { login, logout, authenticated, user } = usePrivy();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [trending, setTrending] = useState<Market[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState<'feed' | 'signals'>('feed');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    fetch('/api/markets')
      .then(res => res.json())
      .then(data => {
        setMarkets(data.markets || []);
        setTrending(data.trending || []);
        setLoadingMarkets(false);
      })
      .catch(() => setLoadingMarkets(false));

    fetch('/api/signals')
      .then(res => res.json())
      .then(data => { setSignals(data.signals || []); setLoadingSignals(false); })
      .catch(() => setLoadingSignals(false));
  }, []);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [filter, search]);

  const filtered = markets.filter(m => {
    const matchesFilter = filter === 'all' || m.category === filter;
    const matchesSearch = search === '' || m.question.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const visible = filtered.slice(0, visibleCount);

  const badgeColors: Record<string, string> = {
    green: 'border-green-500/30 text-green-400 bg-green-500/10',
    red: 'border-red-500/30 text-red-400 bg-red-500/10',
    amber: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    purple: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">

      {/* Top navbar */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 bg-black z-10">
        <img
          src="/crada-logo.png"
          alt="Crada"
          style={{ height: '32px', width: 'auto', maxWidth: '120px', objectFit: 'contain' }}
        />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-green-400 border border-green-400/30 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </div>
          {authenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-300 border border-purple-500/20 px-3 py-1.5 rounded-full bg-purple-500/5">
                {user?.email?.address || (user?.wallet?.address?.slice(0, 4) + '...' + user?.wallet?.address?.slice(-4)) || 'Connected'}
              </span>
              <button onClick={logout} className="text-xs text-white/40 hover:text-white border border-white/10 px-3 py-1.5 rounded-full transition-all">
                Sign out
              </button>
            </div>
          ) : (
            <button onClick={login} className="text-xs px-4 py-1.5 rounded-full font-medium" style={{ backgroundColor: '#7c3aed', color: 'white' }}>
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="border-b border-white/10 px-4 flex gap-1 overflow-x-auto">
        {['all', 'politics', 'crypto', 'sports', 'general'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`py-3 px-4 text-sm whitespace-nowrap border-b-2 transition-all ${
              filter === f
                ? 'border-purple-500 text-white font-medium'
                : 'border-transparent text-white/40 hover:text-white/60'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 flex-1 w-full">

        {/* Feed / Signals toggle */}
        <div className="flex gap-1 mb-5 border border-white/10 rounded-xl p-1 max-w-xs">
          <button
            onClick={() => setTab('feed')}
            className={`flex-1 py-2 rounded-lg text-sm transition-all ${tab === 'feed' ? 'bg-white/10 text-white font-medium' : 'text-white/40 hover:text-white/60'}`}
          >
            Markets
          </button>
          <button
            onClick={() => setTab('signals')}
            className={`flex-1 py-2 rounded-lg text-sm transition-all ${tab === 'signals' ? 'bg-white/10 text-white font-medium' : 'text-white/40 hover:text-white/60'}`}
          >
            Signals ✦
          </button>
        </div>

        {tab === 'feed' && (
          <>
            {/* Trending */}
            {trending.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-white/40 mb-3 uppercase tracking-wide font-medium">🔥 Trending</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {trending.map(market => (
                    <div
                      key={market.id}
                      onClick={() => window.location.href = `/market/${market.id}`}
                      className="flex-shrink-0 w-48 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-purple-500/40 transition-all"
                    >
                      {market.image ? (
                        <img src={market.image} alt={market.question} className="w-full h-28 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-28 bg-white/5 flex items-center justify-center">
                          <span className="text-2xl">📊</span>
                        </div>
                      )}
                      <div className="p-2.5">
                        <p className="text-xs font-medium leading-snug line-clamp-2 mb-1.5">{market.question}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-purple-400 font-semibold">{Math.round(market.probability * 100)}%</span>
                          <span className="text-xs text-white/30">${(market.volume / 1000).toFixed(0)}K</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-5">
              <input
                type="text"
                placeholder="Search markets..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/40"
              />
            </div>

            {loadingMarkets ? (
              <div className="text-white/40 text-sm">Loading markets...</div>
            ) : filtered.length === 0 ? (
              <div className="text-white/40 text-sm">No markets found for "{search}"</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
                  {visible.map(market => (
                    <div
                      key={market.id}
                      onClick={() => window.location.href = `/market/${market.id}`}
                      className="border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/40 transition-all cursor-pointer bg-white/[0.02]"
                    >
                      {market.image ? (
                        <img src={market.image} alt={market.question} className="w-full aspect-square object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-full aspect-square bg-white/5 flex items-center justify-center">
                          <span className="text-3xl">📊</span>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-xs font-medium leading-snug line-clamp-2 mb-2">{market.question}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.round(market.probability * 100)}%` }} />
                            </div>
                            <span className="text-xs text-purple-400 font-semibold">{Math.round(market.probability * 100)}%</span>
                          </div>
                          <span className="text-xs text-white/30">${(market.volume / 1000).toFixed(0)}K</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show more */}
                {visibleCount < filtered.length && (
                  <div className="flex justify-center mb-8">
                    <button
                      onClick={() => setVisibleCount(v => v + ITEMS_PER_PAGE)}
                      className="px-8 py-2.5 rounded-full border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
                    >
                      Show more ({filtered.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'signals' && (
          <>
            <p className="text-sm text-white/40 mb-4">AI-detected signals across active markets</p>
            {loadingSignals ? (
              <div className="text-white/40 text-sm">Analysing markets...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {signals.map(signal => (
                  <div
                    key={signal.id}
                    onClick={() => window.location.href = `/market/${signal.id}`}
                    className="border border-white/10 rounded-xl p-4 hover:border-purple-500/40 transition-all cursor-pointer bg-white/[0.02]"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <p className="text-sm font-medium leading-snug">{signal.question}</p>
                      <span className={`text-xs whitespace-nowrap border px-2 py-0.5 rounded-full ${badgeColors[signal.typeBadge]}`}>
                        {signal.typeLabel}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed mb-3">{signal.explanation}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.round(signal.probability * 100)}%` }} />
                        </div>
                        <span className="text-sm font-medium text-purple-400">{Math.round(signal.probability * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/30">Confidence</span>
                        <span className="text-xs font-medium text-white/50">{signal.confidence}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 px-4 py-10 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <img src="/crada-logo.png" alt="Crada" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} className="mb-4" />
              <p className="text-xs text-white/40 leading-relaxed">Prediction market intelligence. Know before the odds move.</p>
            </div>
            <div>
              <p className="text-xs font-medium text-white/60 mb-3 uppercase tracking-wide">Product</p>
              <div className="flex flex-col gap-2">
                <a href="/" className="text-xs text-white/40 hover:text-white transition-all">Markets</a>
                <a href="/" className="text-xs text-white/40 hover:text-white transition-all">Signals</a>
                <a href="/" className="text-xs text-white/40 hover:text-white transition-all">Insider Detection</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-white/60 mb-3 uppercase tracking-wide">Social</p>
              <div className="flex flex-col gap-2">
                <a href="https://x.com/cradaHQ" target="_blank" rel="noreferrer" className="text-xs text-white/40 hover:text-white transition-all">X (Twitter)</a>
                <a href="/" className="text-xs text-white/40 hover:text-white transition-all">Discord</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-white/60 mb-3 uppercase tracking-wide">Built on</p>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-white/40">Solana</span>
                <span className="text-xs text-white/40">Polymarket</span>
                <span className="text-xs text-white/40">Privy</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/30">© 2026 Crada. All rights reserved.</p>
            <p className="text-xs text-white/30">Trading involves risk. This is not financial advice.</p>
          </div>
        </div>
      </footer>

    </main>
  );
}