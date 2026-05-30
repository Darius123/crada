'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

type TimePeriod = 'DAY' | 'WEEK' | 'MONTH' | 'ALL';
type OrderBy = 'PNL' | 'VOL';
type LeaderboardTab = 'polymarket' | 'following' | 'crada';

interface FollowedTrade {
  type: string;
  title: string;
  outcome: string;
  side: string;
  price: number;
  usdcSize: number;
  timestamp: number;
  icon: string;
  slug: string;
}

interface FollowedTrader {
  address: string;
  name: string;
  trades: FollowedTrade[];
}

interface Trader {
  rank: string;
  proxyWallet: string;
  userName: string;
  xUsername: string;
  verifiedBadge: boolean;
  vol: number;
  pnl: number;
  profileImage: string;
}

const TIME_LABELS: Record<TimePeriod, string> = {
  DAY: '1D',
  WEEK: '7D',
  MONTH: '30D',
  ALL: 'All Time',
};

const sharedStyles = `
  .glass-card {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.10);
  }
`;

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatPnl(val: number) {
  const abs = Math.abs(val);
  const str = abs >= 1_000_000
    ? `$${(abs / 1_000_000).toFixed(2)}M`
    : abs >= 1_000
    ? `$${(abs / 1_000).toFixed(1)}K`
    : `$${abs.toFixed(2)}`;
  return val >= 0 ? `+${str}` : `-${str}`;
}

function formatVol(val: number) {
  if (!val || val === 0) return '—';
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function TraderName({ trader }: { trader: Trader }) {
  const name = trader.userName && trader.userName !== trader.proxyWallet
    ? trader.userName
    : shortAddress(trader.proxyWallet);
  return (
    <div className="flex items-center gap-2 min-w-0">
      {trader.profileImage ? (
        <img src={trader.profileImage} alt={name} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" style={{ border: '1px solid rgba(255,255,255,0.10)' }} />
      ) : (
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold uppercase" style={{ background: 'rgba(124,58,237,0.20)', color: '#c4b5fd' }}>
          {name[0]}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-bold text-white truncate">{name}</p>
        {trader.xUsername && (
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>@{trader.xUsername}</p>
        )}
      </div>
      {trader.verifiedBadge && (
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#7C3AED' }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const { login, logout, authenticated, ready, user } = usePrivy();
  const router = useRouter();

  const [tab, setTab] = useState<LeaderboardTab>('polymarket');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('DAY');
  const [orderBy, setOrderBy] = useState<OrderBy>('PNL');
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedTraders, setFollowedTraders] = useState<FollowedTrader[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?timePeriod=${timePeriod}&orderBy=${orderBy}&limit=100`);
      const data = await res.json();
      setTraders(Array.isArray(data) ? data : []);
    } catch {
      setTraders([]);
    } finally {
      setLoading(false);
    }
  }, [timePeriod, orderBy]);

  const fetchFollowing = useCallback(async () => {
    if (!user?.id) return;
    setFollowingLoading(true);
    try {
      const res = await fetch(`/api/following?userId=${user.id}`);
      const data = await res.json();
      setFollowedTraders(data.traders ?? []);
    } catch {
      setFollowedTraders([]);
    } finally {
      setFollowingLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (tab === 'polymarket') fetchLeaderboard();
    if (tab === 'following') fetchFollowing();
  }, [tab, fetchLeaderboard, fetchFollowing]);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) router.push('/');
  }, [ready, authenticated, router]);

  const sideNavItems = [
    { label: 'Markets', path: '/', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { label: 'Signals', path: '/signals', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
    { label: 'Leaderboard', path: '/leaderboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { label: 'Portfolio', path: '/', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
  ];

  if (!ready) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!authenticated) return null;

  const shortAddr = (() => {
    const sol = user?.linkedAccounts?.find((a: any) => a.type === 'wallet' && a.chainType === 'solana') as any;
    const addr = sol?.address ?? user?.email?.address;
    return addr ? addr.slice(0, 4) + '...' + addr.slice(-4) : 'Connected';
  })();

  return (
    <div className={`${spaceGrotesk.className} min-h-screen text-white`} style={{ background: '#050505' }}>
      <style>{sharedStyles}</style>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 h-16 border-b" style={{ background: 'rgba(5,5,5,0.90)', backdropFilter: 'blur(24px)', borderBottomColor: 'rgba(255,255,255,0.10)' }}>
        <img src="/crada-logo.png" alt="Crada" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{ color: '#4de082', border: '1px solid rgba(77,224,130,0.30)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4de082' }} />
            Live
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full" style={{ color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.20)', background: 'rgba(124,58,237,0.05)' }}>
            {shortAddr}
          </span>
          <button onClick={logout} className="text-xs px-3 py-1.5 rounded-full transition-all hover:text-white" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.10)' }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 w-64" style={{ top: '64px', height: 'calc(100vh - 64px)', background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(32px)', borderRight: '1px solid rgba(255,255,255,0.10)', zIndex: 40 }}>
        <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-white">Intelligence</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(124,58,237,0.6)' }}>V0.1-ALPHA</p>
        </div>
        <nav className="flex-1 py-4">
          {sideNavItems.map(({ label, path, icon }) => {
            const isActive = label === 'Leaderboard';
            return (
              <button
                key={label}
                onClick={() => { if (label === 'Portfolio') sessionStorage.setItem('crada_tab', 'Portfolio'); router.push(path); }}
                className="w-full flex items-center gap-3 px-6 py-3 text-left transition-all"
                style={{ color: isActive ? '#7C3AED' : 'rgba(255,255,255,0.4)', background: isActive ? 'rgba(124,58,237,0.10)' : 'transparent', borderRight: isActive ? '2px solid #7C3AED' : '2px solid transparent', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
                {label}
              </button>
            );
          })}
        </nav>
        <div className="p-6">
          <button onClick={() => router.push('/pricing')} className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:bg-[#7C3AED] hover:text-white" style={{ border: '1px solid rgba(124,58,237,0.40)', color: '#c4b5fd' }}>
            Upgrade to Pro
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="pt-24 pb-20 md:pb-8 px-4 sm:px-6 md:pl-72 md:pr-10 min-h-screen">

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="font-bold text-white uppercase mb-3 text-3xl sm:text-5xl" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>
              Leaderboard
            </h1>
            <p className={`${inter.className} text-sm max-w-xl`} style={{ color: 'rgba(255,255,255,0.5)' }}>
              Top traders ranked by profit and volume across prediction markets.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 mb-6">
          {([
            { key: 'polymarket', label: 'Polymarket' },
            { key: 'following', label: 'Following' },
            { key: 'crada', label: 'Crada' },
          ] as { key: LeaderboardTab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
              style={tab === key
                ? { background: '#7C3AED', color: 'white' }
                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.5)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'polymarket' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* Time period */}
              <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {(Object.keys(TIME_LABELS) as TimePeriod[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTimePeriod(t)}
                    className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                    style={timePeriod === t ? { background: '#7C3AED', color: 'white' } : { color: 'rgba(255,255,255,0.4)' }}
                  >
                    {TIME_LABELS[t]}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {(['PNL', 'VOL'] as OrderBy[]).map(o => (
                  <button
                    key={o}
                    onClick={() => setOrderBy(o)}
                    className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                    style={orderBy === o ? { background: '#7C3AED', color: 'white' } : { color: 'rgba(255,255,255,0.4)' }}
                  >
                    {o === 'PNL' ? 'Profit' : 'Volume'}
                  </button>
                ))}
              </div>
            </div>

            {/* Table header */}
            <div className="hidden md:grid gap-4 px-6 py-2 mb-2" style={{ gridTemplateColumns: '60px 1fr 160px 160px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['RANK', 'TRADER', 'P&L', 'VOLUME'].map((col, i) => (
                <p key={col} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)', textAlign: i >= 2 ? 'right' : 'left' }}>
                  {col}
                </p>
              ))}
            </div>

            {/* Rows */}
            {loading ? (
              <div className="py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading leaderboard...</div>
            ) : traders.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No data available.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {traders.map((trader, idx) => {
                  const rank = parseInt(trader.rank);
                  const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : 'rgba(255,255,255,0.3)';
                  const pnlPositive = trader.pnl >= 0;

                  return (
                    <div
                      key={trader.proxyWallet + idx}
                      className="glass-card rounded-xl px-6 py-4 transition-all cursor-pointer"
                      onClick={() => router.push(`/trader/${trader.proxyWallet}`)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    >
                      {/* Desktop */}
                      <div className="hidden md:grid gap-4 items-center" style={{ gridTemplateColumns: '60px 1fr 160px 160px' }}>
                        <p className="text-lg font-bold" style={{ color: rankColor }}>
                          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                        </p>
                        <TraderName trader={trader} />
                        <p className="text-sm font-mono font-bold text-right" style={{ color: pnlPositive ? '#4de082' : '#f87171' }}>
                          {formatPnl(trader.pnl)}
                        </p>
                        <p className="text-sm font-mono font-bold text-right" style={{ color: trader.vol ? 'white' : 'rgba(255,255,255,0.20)' }}>
                          {formatVol(trader.vol)}
                        </p>
                      </div>

                      {/* Mobile */}
                      <div className="flex md:hidden items-center gap-3">
                        <p className="text-base font-bold w-8 flex-shrink-0" style={{ color: rankColor }}>
                          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                        </p>
                        <div className="flex-1 min-w-0">
                          <TraderName trader={trader} />
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold" style={{ color: pnlPositive ? '#4de082' : '#f87171' }}>{formatPnl(trader.pnl)}</p>
                          <p className="text-[10px] font-mono" style={{ color: trader.vol ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)' }}>{formatVol(trader.vol)}{trader.vol ? ' vol' : ''}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'following' && (
          <div>
            {followingLoading ? (
              <div className="py-12 text-center">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
              </div>
            ) : followedTraders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2" style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.20)' }}>
                  <svg className="w-8 h-8" style={{ color: '#7C3AED' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">No one followed yet</h3>
                <p className={`${inter.className} text-sm text-center max-w-xs`} style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Go to a trader's profile and hit Follow to see their latest trades here.
                </p>
                <button onClick={() => setTab('polymarket')} className="mt-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: '#7C3AED', color: 'white' }}>
                  Browse traders
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {followedTraders.map(ft => (
                  <div key={ft.address}>
                    {/* Trader header */}
                    <button
                      onClick={() => router.push(`/trader/${ft.address}`)}
                      className="flex items-center gap-3 mb-3 group"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase" style={{ background: 'rgba(124,58,237,0.20)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}>
                        {ft.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">{ft.name}</span>
                      <svg className="w-3.5 h-3.5 opacity-40 group-hover:opacity-70 transition-opacity" style={{ color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Recent trades */}
                    <div className="flex flex-col gap-1.5">
                      {ft.trades.slice(0, 3).map((t, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${t.side === 'BUY' && t.outcome === 'Yes' ? '#4de082' : t.side === 'BUY' ? '#f87171' : 'rgba(148,163,184,0.5)'}` }}>
                          {t.icon
                            ? <img src={t.icon} alt="" className="w-8 h-8 rounded-lg flex-shrink-0 object-cover" style={{ opacity: 0.8 }} />
                            : <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />
                          }
                          <div className="flex-1 min-w-0">
                            <p className={`${inter.className} text-sm font-medium text-white truncate`}>{t.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={
                                t.side === 'BUY' && t.outcome !== 'No'
                                  ? { color: '#4de082', background: 'rgba(77,224,130,0.10)', border: '1px solid rgba(77,224,130,0.18)' }
                                  : t.side === 'BUY'
                                  ? { color: '#f87171', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.18)' }
                                  : { color: '#94a3b8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)' }
                              }>
                                {t.side} {t.outcome}
                              </span>
                              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.22)' }}>@ {Math.round(t.price * 100)}¢</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-mono font-bold text-white">${t.usdcSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.22)' }}>{timeAgo(t.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'crada' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2" style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.20)' }}>
              <svg className="w-8 h-8" style={{ color: '#7C3AED' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Crada Leaderboard</h3>
            <p className={`${inter.className} text-sm text-center max-w-sm`} style={{ color: 'rgba(255,255,255,0.4)' }}>
              Rankings for traders placing trades through Crada. Coming as trade execution rolls out.
            </p>
          </div>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 z-50 flex justify-around items-center py-4" style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(20px)', borderRadius: '16px' }}>
        {[
          { label: 'Markets', active: false, onClick: () => router.push('/'), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { label: 'Signals', active: false, onClick: () => router.push('/signals'), icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
          { label: 'Board', active: true, onClick: () => {}, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { label: 'Portfolio', active: false, onClick: () => { sessionStorage.setItem('crada_tab', 'Portfolio'); router.push('/'); }, icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
        ].map(({ label, active, onClick, icon }) => (
          <button key={label} onClick={onClick} className="flex flex-col items-center gap-1" style={{ color: active ? '#7C3AED' : 'rgba(255,255,255,0.4)' }}>
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
