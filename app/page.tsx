'use client';

import { useEffect, useState } from 'react';

interface Market {
  id: string;
  question: string;
  probability: number;
  volume: number;
  category: string;
  endDate: string;
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

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState<'feed' | 'signals'>('feed');

  useEffect(() => {
    fetch('/api/markets')
      .then(res => res.json())
      .then(data => { setMarkets(data.markets || []); setLoadingMarkets(false); })
      .catch(() => setLoadingMarkets(false));

    fetch('/api/signals')
      .then(res => res.json())
      .then(data => { setSignals(data.signals || []); setLoadingSignals(false); })
      .catch(() => setLoadingSignals(false));
  }, []);

  const filtered = filter === 'all' ? markets : markets.filter(m => m.category === filter);

  const badgeColors: Record<string, string> = {
    green: 'border-green-500/30 text-green-400 bg-green-500/10',
    red: 'border-red-500/30 text-red-400 bg-red-500/10',
    amber: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    purple: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-purple-500 rounded" />
            <span className="font-medium text-lg">Foresight</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-400 border border-green-400/30 px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border border-white/10 rounded-xl p-1">
          <button
            onClick={() => setTab('feed')}
            className={`flex-1 py-2 rounded-lg text-sm transition-all ${tab === 'feed' ? 'bg-white/10 text-white font-medium' : 'text-white/40 hover:text-white/60'}`}
          >
            Market feed
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
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {['all', 'politics', 'crypto', 'sports', 'general'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-sm border whitespace-nowrap transition-all ${
                    filter === f
                      ? 'border-white text-white bg-white/10'
                      : 'border-white/20 text-white/50 hover:border-white/40'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {loadingMarkets ? (
              <div className="text-white/40 text-sm">Loading markets...</div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map(market => (
                  <div key={market.id} className="border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <p className="text-sm font-medium leading-snug">{market.question}</p>
                      <span className="text-xs text-white/40 whitespace-nowrap border border-white/10 px-2 py-0.5 rounded-full">
                        {market.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.round(market.probability * 100)}%` }} />
                        </div>
                        <span className="text-sm font-medium text-purple-400">{Math.round(market.probability * 100)}%</span>
                      </div>
                      <span className="text-xs text-white/40">${(market.volume / 1000).toFixed(0)}K vol</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'signals' && (
          <>
            <p className="text-sm text-white/40 mb-4">AI-detected signals across active markets</p>
            {loadingSignals ? (
              <div className="text-white/40 text-sm">Analysing markets...</div>
            ) : (
              <div className="flex flex-col gap-4">
                {signals.map(signal => (
                  <div key={signal.id} className="border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <p className="text-sm font-medium leading-snug">{signal.question}</p>
                      <span className={`text-xs whitespace-nowrap border px-2 py-0.5 rounded-full ${badgeColors[signal.typeBadge]}`}>
                        {signal.typeLabel}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed mb-3">{signal.explanation}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.round(signal.probability * 100)}%` }} />
                        </div>
                        <span className="text-sm font-medium text-purple-400">{Math.round(signal.probability * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/30">Confidence</span>
                        <span className="text-xs font-medium text-white/60">{signal.confidence}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}