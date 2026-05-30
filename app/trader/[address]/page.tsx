'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

interface Activity {
  type: string;
  title: string;
  outcome: string;
  side: string;
  price: number;
  size: number;
  usdcSize: number;
  timestamp: number;
  icon: string;
  slug: string;
  transactionHash: string;
  name?: string;
  profileImage?: string;
  profileImageOptimized?: string;
  pseudonym?: string;
}

interface Position {
  title: string;
  outcome: string;
  icon: string;
  slug: string;
  size: number;
  avgPrice: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  curPrice: number;
  redeemable: boolean;
  endDate: string;
}

interface MarketGroup {
  slug: string;
  title: string;
  icon: string;
  trades: Activity[];
  totalUsdc: number;
  latestTimestamp: number;
  actions: Map<string, number>;
}

function groupByMarket(trades: Activity[]): MarketGroup[] {
  const map = new Map<string, MarketGroup>();
  for (const t of trades) {
    const key = t.slug || t.title;
    if (!map.has(key)) {
      map.set(key, { slug: key, title: t.title, icon: t.icon, trades: [], totalUsdc: 0, latestTimestamp: 0, actions: new Map() });
    }
    const g = map.get(key)!;
    g.trades.push(t);
    g.totalUsdc += t.usdcSize;
    if (t.timestamp > g.latestTimestamp) g.latestTimestamp = t.timestamp;
    const label = `${t.side} ${t.outcome}`;
    g.actions.set(label, (g.actions.get(label) ?? 0) + 1);
  }
  return Array.from(map.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
}

function actionStyle(label: string) {
  if (label.startsWith('BUY YES'))  return { color: '#4de082', background: 'rgba(77,224,130,0.10)',  border: '1px solid rgba(77,224,130,0.20)' };
  if (label.startsWith('BUY NO'))   return { color: '#f87171', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)' };
  return { color: '#94a3b8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)' };
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const sideNavItems = [
  { label: 'Markets', path: '/', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { label: 'Signals', path: '/signals', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
  { label: 'Leaderboard', path: '/leaderboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { label: 'Portfolio', path: '/', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
];

export default function TraderPage() {
  const { address } = useParams<{ address: string }>();
  const router = useRouter();
  const { authenticated, ready, user, logout } = usePrivy();

  const [activity, setActivity] = useState<Activity[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'trades' | 'positions'>('trades');
  const [plan, setPlan] = useState<'free' | 'pro' | 'max'>('free');
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [copyTradeGroup, setCopyTradeGroup] = useState<MarketGroup | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) router.push('/');
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/trader/${address}`)
      .then(r => r.json())
      .then(data => {
        setActivity(data.activity ?? []);
        setPositions(data.positions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [address]);

  // Fetch plan + follow status once user is ready
  useEffect(() => {
    if (!user?.id || !address) return;
    Promise.all([
      fetch(`/api/subscription/status?userId=${user.id}`).then(r => r.json()),
      fetch(`/api/trader/follow?userId=${user.id}&address=${address}`).then(r => r.json()),
    ]).then(([sub, followData]) => {
      setPlan(sub.plan ?? 'free');
      setFollowing(followData.following ?? false);
    }).catch(() => {});
  }, [user?.id, address]);

  const toggleFollow = useCallback(async () => {
    if (!user?.id || !address) return;
    setFollowLoading(true);
    const method = following ? 'DELETE' : 'POST';
    await fetch('/api/trader/follow', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, address }),
    });
    setFollowing(f => !f);
    setFollowLoading(false);
  }, [following, user?.id, address]);

  const handleCopyTrade = useCallback((g: MarketGroup) => {
    if (plan === 'free') {
      setShowUpgradePrompt(true);
      return;
    }
    setCopyTradeGroup(g);
  }, [plan]);

  const trades = activity.filter(a => a.type === 'TRADE');
  const grouped = groupByMarket(trades);
  const firstActivity = activity[0];
  const traderName = firstActivity?.name ?? shortAddress(address ?? '');
  const profileImage = firstActivity?.profileImageOptimized || firstActivity?.profileImage || '';
  const totalPnl = positions.reduce((s, p) => s + p.cashPnl, 0);
  const pnlColor = totalPnl >= 0 ? '#4de082' : '#f87171';
  const initials = traderName.slice(0, 2).toUpperCase();

  const shortAddr = (() => {
    const sol = user?.linkedAccounts?.find((a: any) => a.type === 'wallet' && a.chainType === 'solana') as any;
    const a = sol?.address ?? user?.email?.address;
    return a ? a.slice(0, 4) + '...' + a.slice(-4) : 'Connected';
  })();

  if (!ready) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!authenticated) return null;

  // Dominant action for the copy trade modal
  const dominantAction = copyTradeGroup
    ? Array.from(copyTradeGroup.actions.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    : '';

  return (
    <div className={`${spaceGrotesk.className} min-h-screen text-white`} style={{ background: '#050505' }}>

      {/* Copy Trade Modal */}
      {copyTradeGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setCopyTradeGroup(null)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.10)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              {copyTradeGroup.icon
                ? <img src={copyTradeGroup.icon} alt="" className="w-10 h-10 rounded-lg object-cover" />
                : <div className="w-10 h-10 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
              }
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: '#7C3AED' }}>Copy Trade</p>
                <p className={`${inter.className} text-sm font-medium text-white truncate`}>{copyTradeGroup.title}</p>
              </div>
            </div>

            <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>What {traderName} did</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(copyTradeGroup.actions.entries()).map(([label, count]) => {
                    const s = actionStyle(label);
                    return (
                      <span key={label} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={s}>
                        {count > 1 ? `${count}× ` : ''}{label}
                      </span>
                    );
                  })}
                </div>
                <p className="text-sm font-mono font-bold text-white ml-3">${copyTradeGroup.totalUsdc.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>

            <p className={`${inter.className} text-xs mb-5`} style={{ color: 'rgba(255,255,255,0.40)' }}>
              You'll be taken to Polymarket to place the same trade. Review the market before confirming.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setCopyTradeGroup(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cancel
              </button>
              <a
                href={`https://polymarket.com/event/${copyTradeGroup.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-center"
                style={{ background: '#7C3AED', color: 'white' }}
                onClick={() => setCopyTradeGroup(null)}
              >
                Trade on Polymarket →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowUpgradePrompt(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6 text-center" style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.10)' }} onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <svg className="w-7 h-7" style={{ color: '#c4b5fd' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Pro feature</h3>
            <p className={`${inter.className} text-sm mb-6`} style={{ color: 'rgba(255,255,255,0.40)' }}>
              Copy trading is available on Pro and Max plans. Upgrade to mirror top traders instantly.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowUpgradePrompt(false)} className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Not now
              </button>
              <button onClick={() => { setShowUpgradePrompt(false); router.push('/pricing'); }} className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest" style={{ background: '#7C3AED', color: 'white' }}>
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 h-16 border-b" style={{ background: 'rgba(5,5,5,0.90)', backdropFilter: 'blur(24px)', borderBottomColor: 'rgba(255,255,255,0.08)' }}>
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
      <main className="pt-16 pb-20 md:pb-8 md:pl-64 min-h-screen">

        {/* Breadcrumb */}
        <div className="px-4 sm:px-8 pt-6 pb-2">
          <button onClick={() => router.push('/leaderboard')} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all hover:text-white" style={{ color: 'rgba(255,255,255,0.28)' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Leaderboard
          </button>
        </div>

        {/* Trader hero card */}
        <div className="mx-4 sm:mx-8 mt-3 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(255,255,255,0.03) 100%)', border: '1px solid rgba(124,58,237,0.18)' }}>
          <div className="px-6 py-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {profileImage ? (
                  <img src={profileImage} alt={traderName} className="w-16 h-16 rounded-2xl object-cover" style={{ border: '1px solid rgba(124,58,237,0.35)' }} />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(124,58,237,0.12))', border: '1px solid rgba(124,58,237,0.35)', color: '#c4b5fd' }}>
                    {initials}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 animate-pulse" style={{ background: '#4de082', borderColor: '#050505' }} />
              </div>

              {/* Name + address + follow */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>{traderName}</h1>
                  {/* Follow button */}
                  <button
                    onClick={toggleFollow}
                    disabled={followLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                    style={following
                      ? { background: 'rgba(77,224,130,0.12)', color: '#4de082', border: '1px solid rgba(77,224,130,0.25)' }
                      : { background: 'rgba(124,58,237,0.12)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.30)' }
                    }
                  >
                    {following ? (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Following
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Follow
                      </>
                    )}
                  </button>
                </div>
                <p className={`${inter.className} text-[10px] font-mono mt-1 truncate`} style={{ color: 'rgba(255,255,255,0.20)' }}>{address}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Trades</p>
                <p className="text-2xl font-bold text-white">{trades.length}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.18)' }}>{grouped.length} markets</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Open Positions</p>
                <p className="text-2xl font-bold text-white">{positions.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Unrealised P&L</p>
                <p className="text-2xl font-bold" style={{ color: pnlColor }}>
                  {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl / 1000).toFixed(1)}K
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs + content */}
        <div className="px-4 sm:px-8 mt-6">
          <div className="flex items-center mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {(['trades', 'positions'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="pb-3 text-[10px] font-bold uppercase tracking-widest transition-all mr-5"
                style={{
                  color: tab === t ? '#c4b5fd' : 'rgba(255,255,255,0.28)',
                  borderBottom: tab === t ? '2px solid #7C3AED' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {t === 'trades' ? `Markets (${grouped.length})` : `Positions (${positions.length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
            </div>
          ) : tab === 'trades' ? (
            <div className="flex flex-col gap-2">
              {grouped.length === 0 ? (
                <p className="py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No trades found.</p>
              ) : grouped.map((g) => (
                <div
                  key={g.slug}
                  className="flex items-center gap-4 rounded-xl px-4 py-3.5"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderLeft: `3px solid ${(g.actions.get('BUY YES') ?? 0) >= (g.actions.get('BUY NO') ?? 0) ? '#4de082' : '#f87171'}`,
                  }}
                >
                  {g.icon
                    ? <img src={g.icon} alt="" className="w-10 h-10 rounded-lg flex-shrink-0 object-cover" style={{ opacity: 0.85 }} />
                    : <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`${inter.className} text-sm font-medium text-white truncate`}>{g.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {Array.from(g.actions.entries()).map(([label, count]) => (
                        <span key={label} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={actionStyle(label)}>
                          {count > 1 ? `${count}× ` : ''}{label}
                        </span>
                      ))}
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.20)' }}>{g.trades.length} trade{g.trades.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-white">${g.totalUsdc.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.20)' }}>{timeAgo(g.latestTimestamp)}</p>
                    </div>
                    {/* Copy Trade button */}
                    <button
                      onClick={() => handleCopyTrade(g)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                      style={plan !== 'free'
                        ? { background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.28)' }
                        : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.28)', border: '1px solid rgba(255,255,255,0.08)' }
                      }
                    >
                      {plan === 'free' && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                      Copy Trade
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {positions.length === 0 ? (
                <p className="py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No open positions.</p>
              ) : positions.map((p, i) => (
                <div
                  key={p.slug + i}
                  className="flex items-center gap-4 rounded-xl px-4 py-3.5"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderLeft: `3px solid ${p.cashPnl >= 0 ? '#4de082' : '#f87171'}`,
                  }}
                >
                  {p.icon
                    ? <img src={p.icon} alt="" className="w-10 h-10 rounded-lg flex-shrink-0 object-cover" style={{ opacity: 0.85 }} />
                    : <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`${inter.className} text-sm font-medium text-white truncate`}>{p.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-bold" style={{ color: '#c4b5fd' }}>{p.outcome}</span>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.22)' }}>avg {Math.round(p.avgPrice * 100)}¢ → {Math.round(p.curPrice * 100)}¢</span>
                      {p.redeemable && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(77,224,130,0.10)', color: '#4de082', border: '1px solid rgba(77,224,130,0.18)' }}>
                          Redeemable
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-mono font-bold" style={{ color: p.cashPnl >= 0 ? '#4de082' : '#f87171' }}>
                      {p.cashPnl >= 0 ? '+' : '-'}${Math.abs(p.cashPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.22)' }}>{p.percentPnl >= 0 ? '+' : ''}{p.percentPnl.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 z-50 flex justify-around items-center py-4" style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(20px)', borderRadius: '16px' }}>
        {[
          { label: 'Markets', active: false, onClick: () => router.push('/'), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { label: 'Signals', active: false, onClick: () => router.push('/signals'), icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
          { label: 'Board', active: true, onClick: () => router.push('/leaderboard'), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
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
