'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

interface KalshiMarket {
  id: string;
  question: string;
  subtitle: string;
  status: string;
  result: string | null;
  yesBid: number | null;
  yesAsk: number | null;
  noBid: number | null;
  noAsk: number | null;
  volume: number;
  volume24h: number;
  openInterest: number;
  closeTime: number;
  openTime: number;
  rulesPrimary: string;
  canCloseEarly: boolean;
  earlyCloseCondition: string;
  eventTicker: string;
  image: string | null;
  tradeUrl: string;
  error?: string;
}

const pageStyles = `
  .glass-card {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.10);
  }
  .cyber-border {
    border-bottom: 1px solid rgba(255,255,255,0.10);
  }
`;

export default function KalshiMarketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { login, logout, authenticated } = usePrivy();
  const [market, setMarket] = useState<KalshiMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [tradeTab, setTradeTab] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    fetch(`/api/kalshi/${id}`)
      .then(r => r.json())
      .then(d => { setMarket(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className={`${spaceGrotesk.className} min-h-screen flex items-center justify-center`} style={{ background: '#050505' }}>
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!market || market.error) return (
    <div className={`${spaceGrotesk.className} min-h-screen flex items-center justify-center`} style={{ background: '#050505' }}>
      <div className="text-center">
        <p className="text-lg font-bold text-white mb-2">Market not found.</p>
        <button onClick={() => router.push('/')} className="text-sm" style={{ color: '#7C3AED' }}>Back to markets</button>
      </div>
    </div>
  );

  const yesPct = market.yesAsk != null ? Math.round(market.yesAsk * 100) : (market.result === 'yes' ? 100 : market.result === 'no' ? 0 : 50);
  const noPct = 100 - yesPct;
  const isActive = market.status === 'active' || market.status === 'open';
  const isFinalized = market.status === 'finalized';

  const amountNum = parseFloat(amount) || 0;
  const payoutYes = tradeTab === 'yes' && amountNum > 0 && yesPct > 0 ? (amountNum / (yesPct / 100)).toFixed(2) : '—';
  const payoutNo  = tradeTab === 'no'  && amountNum > 0 && noPct  > 0 ? (amountNum / (noPct  / 100)).toFixed(2) : '—';

  const signalText =
    yesPct > 70
      ? `Strong consensus at ${yesPct}¢. High-conviction market — informed traders appear aligned on YES.`
      : yesPct < 30
      ? `Low probability at ${yesPct}¢. Contrarian play — any positive news could trigger sharp movement.`
      : `Contested market at ${yesPct}¢. Neither side has conviction. Volume of $${(market.volume / 1_000_000).toFixed(2)}M suggests active interest.`;

  const edgePct = yesPct > 50 ? `+${yesPct - 50}` : `-${50 - yesPct}`;
  const closeDate = new Date(market.closeTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className={`${spaceGrotesk.className} min-h-screen text-white`} style={{ background: '#050505' }}>
      <style>{pageStyles}</style>

      {/* Header */}
      <header
        className="fixed top-0 w-full z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b"
        style={{ background: 'rgba(5,5,5,0.90)', backdropFilter: 'blur(24px)', borderBottomColor: 'rgba(255,255,255,0.10)' }}
      >
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/')}>
            <img src="/crada-logo.png" alt="Crada" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
          </button>
          <button
            onClick={() => router.push('/')}
            className="hidden sm:flex items-center gap-2 text-sm transition-colors hover:text-white"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Markets
          </button>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{ color: '#4de082', border: '1px solid rgba(77,224,130,0.30)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4de082' }} />
              Live
            </div>
          )}
          {authenticated ? (
            <button onClick={logout} className="text-xs px-3 py-1.5 rounded-full transition-all hover:text-white" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.10)' }}>
              Sign out
            </button>
          ) : (
            <button onClick={login} className="text-xs px-4 py-1.5 rounded-full font-bold text-white" style={{ background: '#7C3AED' }}>
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Main grid */}
      <main className="pt-24 pb-32 px-6 md:px-12 max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT — col-span-8 */}
        <div className="lg:col-span-8 space-y-6">

          {/* Hero image */}
          {market.image && (
            <div className="rounded-xl overflow-hidden h-52 relative">
              <img src={market.image} alt={market.question} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,5,5,1) 0%, transparent 55%)' }} />
            </div>
          )}

          {/* Top badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.20)', color: '#c4b5fd' }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              AI Verified
            </span>
            {isFinalized && market.result && (
              <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: market.result === 'yes' ? 'rgba(77,224,130,0.10)' : 'rgba(248,113,113,0.10)', color: market.result === 'yes' ? '#4de082' : '#f87171', border: `1px solid ${market.result === 'yes' ? 'rgba(77,224,130,0.30)' : 'rgba(248,113,113,0.30)'}` }}>
                Resolved {market.result.toUpperCase()}
              </span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Closes {closeDate}
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.5)' }}>
              ◎ Kalshi via DFlow
            </span>
          </div>

          {/* Title */}
          <h1 className="font-bold text-white leading-tight" style={{ fontSize: '48px', letterSpacing: '-0.02em' }}>
            {market.question}
          </h1>

          {/* YES / NO probability cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-6 rounded-xl flex flex-col items-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>YES</p>
              <p className="text-5xl font-bold" style={{ color: '#7C3AED' }}>{yesPct}¢</p>
            </div>
            <div className="glass-card p-6 rounded-xl flex flex-col items-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>NO</p>
              <p className="text-5xl font-bold text-white">{noPct}¢</p>
            </div>
          </div>

          {/* Full-width probability bar */}
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${yesPct}%`, background: '#7C3AED', boxShadow: '0 0 12px rgba(124,58,237,0.5)' }}
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-1 py-4">
            {[
              { label: 'Total Volume', value: `$${(market.volume / 1_000_000).toFixed(2)}M` },
              { label: '24h Volume',   value: `$${(market.volume24h / 1000).toFixed(1)}K` },
              { label: 'Open Interest', value: `$${(market.openInterest / 1_000_000).toFixed(2)}M` },
            ].map(({ label, value }) => (
              <div key={label} className="cyber-border pb-4">
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
                <p className="text-lg font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Chart placeholder */}
          <div className="glass-card w-full rounded-xl relative overflow-hidden flex items-center justify-center" style={{ aspectRatio: '21/9' }}>
            <div className="absolute inset-0 opacity-20" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, transparent 60%)' }} />
            <div className="relative z-10 text-center">
              <svg className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(124,58,237,0.5)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Historical Probability Index</p>
            </div>
          </div>

          {/* Risk Analysis */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Risk Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  label: 'Macro Lag',
                  dot: '#4de082',
                  text: yesPct > 60
                    ? `Likely resolves Yes. Strong consensus forming at ${yesPct}¢.`
                    : `Possible Yes outcome. Market pricing ${yesPct}¢ probability.`,
                },
                {
                  label: 'Network Load',
                  dot: '#fbbf24',
                  text: 'Sideways movement possible. Odds may consolidate before any major shift. Monitor volume for confirmation.',
                },
                {
                  label: 'Regulatory',
                  dot: '#f87171',
                  text: noPct > 60
                    ? `Likely resolves No. Bears in control at ${noPct}¢.`
                    : `${noPct}¢ chance of No outcome. Still contested.`,
                },
              ].map(({ label, dot, text }) => (
                <div key={label} className="glass-card p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
                    <p className="text-xs font-bold uppercase tracking-widest text-white">{label}</p>
                  </div>
                  <p className={`${inter.className} text-xs leading-relaxed`} style={{ color: 'rgba(255,255,255,0.5)' }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution rules */}
          {market.rulesPrimary && (
            <div className="glass-card p-5 rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Resolution Rules</p>
              <p className={`${inter.className} text-sm leading-relaxed`} style={{ color: 'rgba(255,255,255,0.6)' }}>{market.rulesPrimary}</p>
              {market.canCloseEarly && market.earlyCloseCondition && (
                <p className={`${inter.className} text-xs mt-3 pt-3`} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                  ⚡ Early close: {market.earlyCloseCondition}
                </p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — col-span-4 */}
        <div className="lg:col-span-4 space-y-6">

          {/* Trade Panel */}
          <div
            className="glass-card p-6 rounded-2xl space-y-6 sticky top-24"
            style={{ border: '1px solid rgba(255,255,255,0.20)', background: 'rgba(255,255,255,0.05)' }}
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Trade This Market</h3>

            {/* YES / NO toggle */}
            <div className="flex p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.40)' }}>
              {(['yes', 'no'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setTradeTab(tab)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                  style={tradeTab === tab ? {
                    background: tab === 'yes' ? '#7C3AED' : 'rgba(255,255,255,0.10)',
                    color: 'white',
                  } : { color: 'rgba(255,255,255,0.4)' }}
                >
                  Buy {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm font-mono font-bold text-white pr-16 focus:outline-none"
                  style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.10)' }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  USDC
                </span>
              </div>
            </div>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 50].map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="py-2 rounded-lg text-xs font-bold transition-all hover:text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.5)' }}
                >
                  ${v}
                </button>
              ))}
            </div>

            {/* Payout + implied probability */}
            <div className="space-y-2 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Est. Payout</span>
                <span className="text-sm font-mono font-bold text-white">
                  ${tradeTab === 'yes' ? payoutYes : payoutNo}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Implied Prob.</span>
                <span className="text-sm font-mono font-bold" style={{ color: '#7C3AED' }}>
                  {tradeTab === 'yes' ? yesPct : noPct}¢
                </span>
              </div>
            </div>

            {/* CTA */}
            {isActive ? (
              <a
                href={market.tradeUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full py-4 rounded-xl text-center text-sm font-bold text-white transition-all hover:brightness-110"
                style={{ background: '#7C3AED', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
              >
                Trade on DFlow
              </a>
            ) : (
              <div className="w-full py-4 rounded-xl text-center text-sm font-bold uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
                Market Closed
              </div>
            )}

            <p className={`${inter.className} text-[10px] text-center`} style={{ color: 'rgba(255,255,255,0.2)' }}>
              Settled on Solana · Powered by DFlow x Kalshi
            </p>
          </div>

          {/* Crada Signal Card */}
          <div className="p-6 rounded-2xl" style={{ border: '1px solid rgba(124,58,237,0.30)', background: 'rgba(124,58,237,0.05)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#7C3AED' }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Crada Intelligence</p>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Live Edge Monitoring</p>
              </div>
            </div>

            <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(0,0,0,0.60)' }}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Calculated Edge</p>
                <span className="text-sm font-mono font-bold" style={{ color: yesPct >= 50 ? '#4de082' : '#f87171' }}>
                  {edgePct}¢
                </span>
              </div>
              <p className={`${inter.className} text-xs leading-relaxed italic`} style={{ color: 'rgba(255,255,255,0.6)' }}>
                {signalText}
              </p>
            </div>

            <button className={`${inter.className} text-xs flex items-center gap-1 transition-opacity hover:opacity-70`} style={{ color: '#7C3AED' }}>
              View Full Terminal Data
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
