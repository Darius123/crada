'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

interface Signal {
  id: string;
  question: string;
  probability: number;
  volume: number;
  category?: string;
  signalType: string;
  typeLabel: string;
  typeBadge: string;
  explanation: string;
  confidence: number;
  minsAgo: number;
  topWallets?: string[];
  jupiterPowered?: boolean;
}

const sharedStyles = `
  .glass-card {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.10);
  }
  .terminal-glass {
    background: rgba(15,15,15,0.4);
    backdrop-filter: blur(40px);
    border: 1px solid rgba(255,255,255,0.05);
    transition: border-color 0.3s ease;
  }
  .terminal-glass:hover {
    border-color: rgba(124,58,237,0.3);
  }
`;

export default function SignalsPage() {
  const { login, logout, authenticated, ready, user } = usePrivy();
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedTab, setFeedTab] = useState<'live' | 'history' | 'filters'>('live');
  const [activeSideNav, setActiveSideNav] = useState('Signals');
  const [walletDomains, setWalletDomains] = useState<Record<string, string>>({});
  const [solPrice, setSolPrice] = useState<number | null>(null);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    fetch('/api/signals')
      .then(res => res.json())
      .then(data => {
        const list = (data.signals || []).map((s: Omit<Signal, 'minsAgo'>) => ({
          ...s,
          minsAgo: Math.floor(Math.random() * 55) + 1,
        }));
        setSignals(list);
        if (data.solPrice) setSolPrice(data.solPrice);
        setLoading(false);

        // Resolve domains for all wallet addresses in insider signals
        const addresses: string[] = [];
        list.forEach((s: Signal) => { if (s.topWallets) addresses.push(...s.topWallets); });
        const unique = [...new Set(addresses)];
        unique.forEach(addr => {
          fetch(`/api/domain?address=${addr}`)
            .then(r => r.json())
            .then(d => { if (d.domain) setWalletDomains(prev => ({ ...prev, [addr]: d.domain })); })
            .catch(() => {});
        });
      })
      .catch(() => setLoading(false));
  }, []);

  const badgeStyle = (badge: string): React.CSSProperties => {
    switch (badge) {
      case 'green':
        return { background: 'rgba(77,224,130,0.20)', color: '#4de082', border: '1px solid rgba(77,224,130,0.20)' };
      case 'purple':
        return { background: '#7C3AED', color: 'white', border: '1px solid rgba(255,255,255,0.20)' };
      case 'amber':
        return { background: 'rgba(245,158,11,0.20)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.20)' };
      case 'red':
        return { background: 'rgba(239,68,68,0.20)', color: '#f87171', border: '1px solid rgba(239,68,68,0.20)' };
      case 'blue':
        return { background: 'rgba(99,179,237,0.20)', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.20)' };
      default:
        return { background: 'rgba(255,255,255,0.10)', color: 'white', border: '1px solid rgba(255,255,255,0.10)' };
    }
  };

  const sideNavItems = [
    {
      label: 'Markets',
      path: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: 'Signals',
      path: '/signals',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
    },
    {
      label: 'Portfolio',
      path: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
    },
  ];

  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!authenticated) {
    return null; // redirecting
  }

  return (
    <div
      className={`${spaceGrotesk.className} min-h-screen text-white`}
      style={{ background: '#050505' }}
    >
      <style>{sharedStyles}</style>

      {/* Fixed Header */}
      <header
        className="fixed top-0 w-full z-50 flex items-center justify-between px-6 h-16 border-b"
        style={{ background: 'rgba(5,5,5,0.90)', backdropFilter: 'blur(24px)', borderBottomColor: 'rgba(255,255,255,0.10)' }}
      >
        <div className="flex items-center gap-6">
          <img src="/crada-logo.png" alt="Crada" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{ color: '#4de082', border: '1px solid rgba(77,224,130,0.30)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4de082' }} />
            Live
          </div>
          {authenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-full" style={{ color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.20)', background: 'rgba(124,58,237,0.05)' }}>
                {(() => {
                  const sol = user?.linkedAccounts?.find((a: any) => a.type === 'wallet' && a.chainType === 'solana') as any;
                  const addr = sol?.address ?? user?.email?.address;
                  return addr ? addr.slice(0, 4) + '...' + addr.slice(-4) : 'Connected';
                })()}
              </span>
              <button onClick={logout} className="text-xs px-3 py-1.5 rounded-full transition-all hover:text-white" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.10)' }}>
                Sign out
              </button>
            </div>
          ) : (
            <button onClick={login} className="text-xs px-4 py-1.5 rounded-full font-bold text-white" style={{ background: '#7C3AED' }}>
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Left Sidebar */}
      <aside
        className="hidden md:flex flex-col fixed left-0 w-64"
        style={{
          top: '64px',
          height: 'calc(100vh - 64px)',
          background: 'rgba(0,0,0,0.40)',
          backdropFilter: 'blur(32px)',
          borderRight: '1px solid rgba(255,255,255,0.10)',
          zIndex: 40,
        }}
      >
        <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-white">Intelligence</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(124,58,237,0.6)' }}>V0.1-ALPHA</p>
        </div>
        <nav className="flex-1 py-4">
          {sideNavItems.map(({ label, path, icon }) => {
            const isActive = label === 'Signals';
            return (
              <button
                key={label}
                onClick={() => { setActiveSideNav(label); if (label === 'Portfolio') sessionStorage.setItem('crada_tab', 'Portfolio'); router.push(path); }}
                className="w-full flex items-center gap-3 px-6 py-3 text-left transition-all"
                style={{
                  color: isActive ? '#7C3AED' : 'rgba(255,255,255,0.4)',
                  background: isActive ? 'rgba(124,58,237,0.10)' : 'transparent',
                  borderRight: isActive ? '2px solid #7C3AED' : '2px solid transparent',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </nav>
        <div className="p-6">
          <button
            className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:bg-[#7C3AED] hover:text-white"
            style={{ border: '1px solid rgba(124,58,237,0.40)', color: '#c4b5fd' }}
          >
            Upgrade to Pro
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="pt-24 pb-20 md:pb-8 px-4 sm:px-6 md:pl-72 md:pr-10 min-h-screen">

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1
              className="font-bold text-white uppercase mb-3 text-3xl sm:text-5xl"
              style={{ letterSpacing: '-0.03em', lineHeight: 1 }}
            >
              Insider Signals
            </h1>
            <p className={`${inter.className} text-sm max-w-xl`} style={{ color: 'rgba(255,255,255,0.5)' }}>
              Hyper-sensitive detection of unusual volume, smart money flows, and whale movements across prediction markets.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(['live', 'history', 'filters'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFeedTab(tab)}
                className="px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                style={feedTab === tab ? {
                  background: '#7C3AED',
                  color: 'white',
                } : {
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {tab === 'live' ? 'Live Feed' : tab === 'history' ? 'History' : 'Filters'}
              </button>
            ))}
          </div>
        </div>

        {/* Jupiter Price Strip */}
        {solPrice && (
          <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl" style={{ background: 'rgba(99,179,237,0.06)', border: '1px solid rgba(99,179,237,0.15)' }}>
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#63b3ed' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#63b3ed' }}>Jupiter Price Feed</span>
            <span className="w-px h-3" style={{ background: 'rgba(99,179,237,0.3)' }} />
            <span className="text-xs font-mono font-bold text-white">SOL <span style={{ color: '#63b3ed' }}>${solPrice.toFixed(2)}</span></span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>· Live via Jupiter Swap API</span>
          </div>
        )}

        {/* Table header — desktop only */}
        <div
          className="hidden md:grid gap-6 px-6 py-2 mb-2"
          style={{ gridTemplateColumns: '4fr 3fr 2fr 2fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          {['MARKET IDENTIFIER', 'SIGNAL TYPE', 'STRENGTH', 'METRIC / VOL', 'TIME'].map((col, i) => (
            <p
              key={col}
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.30)', textAlign: i >= 3 ? 'right' : 'left' }}
            >
              {col}
            </p>
          ))}
        </div>

        {/* Signal rows */}
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Analysing markets...
          </div>
        ) : signals.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            No signals detected.
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="flex flex-col gap-3 mb-10 md:hidden">
              {signals.map((signal, idx) => {
                const minsAgo = signal.minsAgo;
                return (
                  <div
                    key={'m-' + signal.id + idx}
                    onClick={() => { if (!signal.jupiterPowered) router.push('/market/' + signal.id); }}
                    className="glass-card rounded-xl p-4 transition-all"
                    style={{ cursor: signal.jupiterPowered ? 'default' : 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p
                        className="text-sm font-bold text-white leading-snug flex-1"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}
                      >
                        {signal.question}
                      </p>
                      <span
                        className="inline-flex px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex-shrink-0 ml-2"
                        style={badgeStyle(signal.typeBadge)}
                      >
                        {signal.typeLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full" style={{ width: `${signal.confidence}%`, background: '#7C3AED' }} />
                        </div>
                        <span className="text-xs font-mono font-bold text-white">{signal.confidence}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-white">${(signal.volume / 1000).toFixed(0)}K</span>
                        <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{minsAgo}m ago</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:flex flex-col gap-2 mb-10">
              {signals.map((signal, idx) => {
                const minsAgo = signal.minsAgo;
                return (
                  <div
                    key={signal.id + idx}
                    onClick={() => { if (!signal.jupiterPowered) router.push('/market/' + signal.id); }}
                    className="glass-card grid gap-6 items-center px-6 py-4 rounded-xl transition-all group"
                    style={{ cursor: signal.jupiterPowered ? 'default' : 'pointer', gridTemplateColumns: '4fr 3fr 2fr 2fr 1fr' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  >
                    {/* Market identifier */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
                      >
                        <svg className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.4)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-bold text-white transition-colors truncate group-hover:text-[#7C3AED]"
                          style={{ maxWidth: '260px' }}
                        >
                          {signal.question}
                        </p>
                        {signal.topWallets && signal.topWallets.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap mt-0.5">
                            {signal.topWallets.slice(0, 3).map(addr => (
                              <span key={addr} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(196,181,253,0.1)', color: '#c4b5fd' }}>
                                {walletDomains[addr] ?? `${addr.slice(0, 4)}…${addr.slice(-4)}`}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {signal.category || signal.signalType}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Signal type badge */}
                    <div>
                      <span
                        className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        style={badgeStyle(signal.typeBadge)}
                      >
                        {signal.typeLabel}
                      </span>
                    </div>

                    {/* Strength */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${signal.confidence}%`, background: '#7C3AED' }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-white">{signal.confidence}%</span>
                    </div>

                    {/* Volume */}
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-white">
                        ${(signal.volume / 1000).toFixed(0)}K
                      </p>
                      <p className="text-[10px]" style={{ color: Math.round(signal.probability * 100) >= 50 ? '#4de082' : '#f87171' }}>
                        {Math.round(signal.probability * 100)}%
                      </p>
                    </div>

                    {/* Time */}
                    <div className="text-right">
                      <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{minsAgo}m ago</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Intelligence Overview bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {/* Card 1 — Hot Zone */}
          <div
            className="glass-card rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3" style={{ color: '#4de082' }}>HOT ZONE</p>
              <h3 className="text-lg font-bold text-white mb-2">Market Activity Surge</h3>
              <p className={`${inter.className} text-sm`} style={{ color: 'rgba(255,255,255,0.5)' }}>
                Unusual coordinated buying detected across {signals.length} active markets. Smart money entering positions.
              </p>
            </div>
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(77,224,130,0.3) 0%, transparent 60%)' }}
            />
          </div>

          {/* Card 2 — Predictive Heat */}
          <div className="glass-card rounded-2xl p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>PREDICTIVE HEAT</p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>MACRO SENTIMENT</span>
                  <span className="text-xs font-mono font-bold" style={{ color: '#4de082' }}>72%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: '72%', background: '#4de082' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>WHALE ACTIVITY</span>
                  <span className="text-xs font-mono font-bold" style={{ color: '#7C3AED' }}>85%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: '85%', background: '#7C3AED' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 — Terminal Access */}
          <div
            className="rounded-2xl p-6"
            style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.20)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-1" style={{ color: '#c4b5fd' }}>TERMINAL ACCESS</p>
            <h3 className="text-lg font-bold text-white mb-1">QUANT ALERTS</h3>
            <p className={`${inter.className} text-sm mb-6`} style={{ color: 'rgba(255,255,255,0.5)' }}>
              Configure custom signal thresholds and receive real-time alerts for whale movements.
            </p>
            <button
              className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ color: '#7C3AED' }}
            >
              CONFIGURE API
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-6 left-6 right-6 z-50 flex justify-around items-center py-4"
        style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(20px)', borderRadius: '16px' }}
      >
        {[
          { label: 'Markets',   active: false, onClick: () => router.push('/'),             icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { label: 'Signals',   active: true,  onClick: () => {},                           icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
          { label: 'Portfolio', active: false, onClick: () => { sessionStorage.setItem('crada_tab', 'Portfolio'); router.push('/'); }, icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
        ].map(({ label, active, onClick, icon }) => (
          <button
            key={label}
            onClick={onClick}
            className="flex flex-col items-center gap-1"
            style={{ color: active ? '#7C3AED' : 'rgba(255,255,255,0.4)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
            <span className="text-[10px] font-bold uppercase">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
