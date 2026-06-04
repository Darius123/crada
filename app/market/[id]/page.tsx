'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

interface MarketOutcome {
  name: string;
  probability: number;
  slug: string;
}

interface Market {
  id: string;
  question: string;
  probability: number;
  volume: number;
  category: string;
  endDate: string;
  description?: string;
  liquidity?: number;
  tradeUrl?: string;
  clobTokenId?: string | null;
  outcomes?: MarketOutcome[];
  image?: string | null;
}

interface HistoryPoint { t: number; p: number; }


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

function ProbabilityChart({ history, currentPct }: { history: HistoryPoint[]; currentPct: number }) {
  const W = 600, H = 180;
  const PAD = { top: 16, right: 16, bottom: 28, left: 42 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  if (history.length < 2) {
    return (
      <div
        className="glass-card w-full rounded-xl flex items-center justify-center"
        style={{ height: '180px' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {history.length === 0 ? 'Loading chart…' : 'Not enough data'}
        </p>
      </div>
    );
  }

  const minT = history[0].t;
  const maxT = history[history.length - 1].t;
  const tRange = maxT - minT || 1;

  const toX = (t: number) => PAD.left + ((t - minT) / tRange) * cw;
  const toY = (p: number) => PAD.top + (1 - p) * ch;

  // Build SVG path
  const pts = history.map(d => `${toX(d.t).toFixed(1)},${toY(d.p).toFixed(1)}`).join(' ');
  const firstX = toX(history[0].t).toFixed(1);
  const lastX = toX(history[history.length - 1].t).toFixed(1);
  const bottomY = (PAD.top + ch).toFixed(1);
  const areaPath = `M${firstX},${bottomY} L${pts.replace(/(\d+\.?\d*),(\d+\.?\d*)/g, 'L$1,$2').slice(1)} L${lastX},${bottomY} Z`;

  // X-axis labels: pick 4 evenly spaced dates
  const labelCount = 4;
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (history.length - 1))
  );
  const xLabels = labelIndices.map(i => {
    const d = new Date(history[i].t * 1000);
    return { x: toX(history[i].t), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  });

  // Y-axis ticks: 0%, 25%, 50%, 75%, 100%
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  const lineColor = currentPct >= 50 ? '#7c3aed' : '#f87171';
  const areaColor = currentPct >= 50 ? 'rgba(124,58,237,0.12)' : 'rgba(248,113,113,0.10)';

  return (
    <div className="glass-card rounded-xl overflow-hidden" style={{ padding: '4px 0 0' }}>
      <p className="text-[10px] font-bold uppercase tracking-widest px-4 pt-3 pb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Historical Probability — YES
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: '180px' }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map(p => {
          const y = toY(p);
          return (
            <g key={p}>
              <line
                x1={PAD.left} y1={y} x2={PAD.left + cw} y2={y}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1"
              />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.3)">
                {Math.round(p * 100)}%
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Current price dot */}
        <circle
          cx={toX(history[history.length - 1].t)}
          cy={toY(history[history.length - 1].p)}
          r="3"
          fill={lineColor}
        />

        {/* X-axis labels */}
        {xLabels.map(({ x, label }) => (
          <text key={label} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)">
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function MarketPage() {
  const { id } = useParams();
  const router = useRouter();
  const { login, logout, authenticated } = usePrivy();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [tradeTab, setTradeTab] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'news'>('overview');
  const [selectedOutcome, setSelectedOutcome] = useState(0);
  const [news, setNews] = useState<{ title: string; link: string; source: string; minsAgo: number; sentiment: string }[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsFetched, setNewsFetched] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (activeTab !== 'news' || newsFetched) return;
    setNewsLoading(true);
    fetch('/api/market/' + id + '/news')
      .then(r => r.json())
      .then(d => { setNews(d.news || []); setNewsFetched(true); })
      .catch(() => setNewsFetched(true))
      .finally(() => setNewsLoading(false));
  }, [activeTab, id, newsFetched]);

  useEffect(() => {
    fetch('/api/market/' + id)
      .then(res => res.json())
      .then(data => {
        if (data.market) setMarket(data.market);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch('/api/market/' + id + '/history')
      .then(res => res.json())
      .then(data => setHistory(data.history ?? []))
      .catch(() => {});
  }, [id]);

  if (loading) return (
    <div
      className={`${spaceGrotesk.className} min-h-screen flex items-center justify-center`}
      style={{ background: '#050505' }}
    >
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!market) return (
    <div
      className={`${spaceGrotesk.className} min-h-screen flex items-center justify-center`}
      style={{ background: '#050505' }}
    >
      <div className="text-center">
        <p className="text-lg font-bold text-white mb-2">Market not found.</p>
        <button onClick={() => router.push('/')} className="text-sm" style={{ color: '#7C3AED' }}>
          Back to markets
        </button>
      </div>
    </div>
  );

  const pct = Math.round(market.probability * 100);
  const noPct = 100 - pct;

  const amountNum = parseFloat(amount) || 0;
  const payoutYes = tradeTab === 'yes' && amountNum > 0 ? (amountNum / market.probability).toFixed(2) : '—';
  const payoutNo = tradeTab === 'no' && amountNum > 0 ? (amountNum / (1 - market.probability)).toFixed(2) : '—';

  // Risk signal logic (preserved from original)
  const signalText =
    pct > 70
      ? `Strong consensus at ${pct}%. High-conviction market — informed traders appear aligned.`
      : pct < 30
      ? `Low probability at ${pct}%. Contrarian play — any positive news could trigger sharp movement.`
      : `Contested market at ${pct}%. Neither side has conviction. Volume of $${(market.volume / 1000).toFixed(0)}K suggests active interest.`;

  const edgePct = pct > 50 ? `+${(pct - 50)}` : `-${50 - pct}`;

  // ── Multi-outcome detail view ──────────────────────────────────────────────
  if (market.outcomes && market.outcomes.length > 2) {
    const volStr = market.volume >= 1_000_000
      ? `$${(market.volume / 1_000_000).toFixed(1)}M`
      : market.volume >= 1_000
      ? `$${(market.volume / 1_000).toFixed(0)}K`
      : `$${market.volume.toFixed(0)}`;
    const colors = ['#a78bfa','#60a5fa','#34d399','#fb923c','#f472b6','#facc15','#38bdf8','#4ade80'];
    const bgColors = ['rgba(167,139,250,0.15)','rgba(96,165,250,0.13)','rgba(52,211,153,0.13)','rgba(251,146,60,0.13)','rgba(244,114,182,0.13)','rgba(250,204,21,0.13)','rgba(56,189,248,0.13)','rgba(74,222,128,0.13)'];
    const bgColorsStrong = ['rgba(167,139,250,0.25)','rgba(96,165,250,0.22)','rgba(52,211,153,0.22)','rgba(251,146,60,0.22)','rgba(244,114,182,0.22)','rgba(250,204,21,0.22)','rgba(56,189,248,0.22)','rgba(74,222,128,0.22)'];
    const leader = market.outcomes[0];
    const second = market.outcomes[1];
    const leaderPct = Math.round(leader.probability * 100);
    const spread = Math.round((leader.probability - second.probability) * 100);

    const selIdx = Math.min(selectedOutcome, market.outcomes.length - 1);
    const selectedOutcomeData = market.outcomes[selIdx];
    const selectedTradeLink = market.tradeUrl || 'https://polymarket.com';
    const selectedPayout = amountNum > 0 && selectedOutcomeData.probability > 0
      ? (amountNum / selectedOutcomeData.probability).toFixed(2)
      : '—';

    const multiSignalText = spread > 20
      ? `${leader.name} is the dominant outcome at ${leaderPct}%. High conviction — ${spread}% spread vs. nearest competitor.`
      : spread > 10
      ? `${leader.name} leads at ${leaderPct}% but ${second.name} is close at ${Math.round(second.probability * 100)}%. Contested — watch for shifts.`
      : `Highly uncertain. ${leader.name} leads at ${leaderPct}% but top outcomes are nearly tied. High variance play.`;

    return (
      <div className={`${spaceGrotesk.className} min-h-screen text-white`} style={{ background: '#050505' }}>
        <style>{pageStyles}</style>

        {/* Header */}
        <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b" style={{ background: 'rgba(5,5,5,0.90)', backdropFilter: 'blur(24px)', borderBottomColor: 'rgba(255,255,255,0.10)' }}>
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')}>
              <img src="/crada-logo.png" alt="Crada" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
            </button>
            <button onClick={() => router.push('/')} className="hidden sm:flex items-center gap-2 text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Markets
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{ color: '#4de082', border: '1px solid rgba(77,224,130,0.30)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4de082' }} />
              Live
            </div>
            {authenticated ? (
              <button onClick={logout} className="text-xs px-3 py-1.5 rounded-full transition-all hover:text-white" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.10)' }}>Sign out</button>
            ) : (
              <button onClick={login} className="text-xs px-4 py-1.5 rounded-full font-bold text-white" style={{ background: '#7C3AED' }}>Sign in</button>
            )}
          </div>
        </header>

        {/* Main grid */}
        <main className="pt-24 pb-32 px-6 md:px-12 max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT — col-span-8 */}
          <div className="lg:col-span-8 space-y-6">

            {/* Top badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.20)', color: '#c4b5fd' }}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                AI Verified
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: 'rgba(124,58,237,0.3)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.4)' }}>
                {market.outcomes.length} outcomes
              </span>
              {market.endDate && (
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Expires {new Date(market.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.5)' }}>
                {market.category}
              </span>
            </div>

            {/* Title + Share */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-bold text-white leading-tight text-2xl sm:text-4xl lg:text-5xl flex-1" style={{ letterSpacing: '-0.02em' }}>
                {market.question}
              </h1>
              <button
                onClick={() => {
                  const url = `https://crada.fun/market/${id}`;
                  if (navigator.share) {
                    navigator.share({ title: market.question, url });
                  } else {
                    navigator.clipboard.writeText(url);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }
                }}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all mt-1"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: shareCopied ? '#4de082' : 'rgba(255,255,255,0.5)' }}
              >
                {shareCopied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </>
                )}
              </button>
            </div>

            {/* Top 2 outcome probability cards */}
            <div className="grid grid-cols-2 gap-4">
              {[leader, second].map((o, i) => (
                <div key={i} className="glass-card p-6 rounded-xl flex flex-col items-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 text-center w-full truncate" style={{ color: colors[i] }}>
                    {o.name.length > 18 ? o.name.slice(0, 18) + '…' : o.name}
                  </p>
                  <p className="text-5xl font-bold" style={{ color: i === 0 ? '#7C3AED' : 'white' }}>
                    {Math.round(o.probability * 100)}%
                  </p>
                  <p className="text-[9px] uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {i === 0 ? 'Leader' : '2nd Place'}
                  </p>
                </div>
              ))}
            </div>

            {/* Distributed probability bar */}
            <div>
              <div className="flex w-full h-2 rounded-full overflow-hidden" style={{ gap: '1px' }}>
                {market.outcomes.map((o, i) => (
                  <div
                    key={i}
                    style={{
                      width: `${Math.max(o.probability * 100, 0.5)}%`,
                      background: colors[i % colors.length],
                      boxShadow: i === 0 ? `0 0 12px ${colors[0]}80` : undefined,
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {market.outcomes.slice(0, 5).map((o, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                    <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {o.name.length > 12 ? o.name.slice(0, 12) + '…' : o.name}
                    </span>
                  </div>
                ))}
                {market.outcomes.length > 5 && (
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>+{market.outcomes.length - 5} more</span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-1 py-4">
              {[
                { label: '24h Volume', value: volStr },
                { label: 'Leading', value: leader.name.length > 14 ? leader.name.slice(0, 14) + '…' : leader.name },
                { label: 'Category', value: market.category.charAt(0).toUpperCase() + market.category.slice(1) },
              ].map(({ label, value }) => (
                <div key={label} className="cyber-border pb-4">
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
                  <p className="text-lg font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['overview', 'news'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                  style={activeTab === tab
                    ? { background: '#7C3AED', color: 'white' }
                    : { color: 'rgba(255,255,255,0.4)' }}
                >
                  {tab === 'overview' ? 'Overview' : 'News & Social'}
                </button>
              ))}
            </div>

            {activeTab === 'overview' ? (
              <>
                {/* All outcomes ranked */}
                <div className="glass-card rounded-3xl p-6 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    All Outcomes · ranked by probability
                  </p>
                  {market.outcomes.map((o, i) => {
                    const oPct = Math.round(o.probability * 100);
                    const color = colors[i % colors.length];
                    const bg = bgColors[i % bgColors.length];
                    const tradeLink = market.tradeUrl || 'https://polymarket.com';
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-[11px] font-bold w-5 text-right flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>{i + 1}</span>
                        <div className="flex-1 relative rounded-xl overflow-hidden" style={{ height: 38, background: 'rgba(255,255,255,0.04)' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(oPct, 1)}%`, background: bg, transition: 'width 0.6s ease' }} />
                          <span className="absolute inset-0 flex items-center px-3 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{o.name}</span>
                        </div>
                        <span className="text-sm font-bold font-mono w-10 text-right flex-shrink-0" style={{ color }}>{oPct}%</span>
                        <a
                          href={tradeLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0 transition-all hover:brightness-125"
                          style={{ background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.3)' }}
                        >
                          Trade
                        </a>
                      </div>
                    );
                  })}
                </div>

                {/* Risk Analysis */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Risk Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        label: 'Leader Strength',
                        dot: '#4de082',
                        text: spread > 20
                          ? `${leader.name} at ${leaderPct}% — dominant. High confidence in this outcome.`
                          : `${leader.name} leads at ${leaderPct}% but spread is thin. Outcome remains volatile.`,
                      },
                      {
                        label: 'Market Depth',
                        dot: '#fbbf24',
                        text: `${market.outcomes.length} active outcomes competing. Volume of ${volStr} suggests strong market interest across participants.`,
                      },
                      {
                        label: 'Upset Risk',
                        dot: '#f87171',
                        text: spread < 10
                          ? `High upset risk. ${second.name} at ${Math.round(second.probability * 100)}% — nearly tied with leader.`
                          : `${second.name} at ${Math.round(second.probability * 100)}% is the main challenger. ${spread}% spread gives leader some cushion.`,
                      },
                    ].map(({ label, dot, text }) => (
                      <div key={label} className="glass-card p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
                          <p className="text-xs font-bold uppercase tracking-widest text-white">{label}</p>
                        </div>
                        <p className={`${inter.className} text-xs leading-relaxed`} style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {market.description && (
                  <div className="glass-card rounded-3xl p-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>About</p>
                    <p className={`${inter.className} text-sm leading-relaxed`} style={{ color: 'rgba(255,255,255,0.6)' }}>{market.description}</p>
                  </div>
                )}
              </>
            ) : (
              /* News & Social */
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Signal direction vs. market question
                  </p>
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
                {newsLoading ? (
                  <div className="py-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Scanning news feeds...</div>
                ) : news.length === 0 ? (
                  <div className="py-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No recent news found for this market.</div>
                ) : news.map((item, i) => {
                  const age = item.minsAgo < 60 ? `${item.minsAgo}m ago` : item.minsAgo < 1440 ? `${Math.round(item.minsAgo / 60)}h ago` : `${Math.round(item.minsAgo / 1440)}d ago`;
                  return (
                    <a key={i} href={item.link} target="_blank" rel="noreferrer" className="glass-card block rounded-xl p-4 transition-all hover:border-purple-500/30">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white leading-snug mb-2">{item.title}</p>
                          <div className="flex items-center gap-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            <span className="font-bold">{item.source}</span>
                            <span>·</span>
                            <span>{age}</span>
                          </div>
                        </div>
                        <span
                          className="flex-shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest"
                          style={item.sentiment === 'yes'
                            ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }
                            : item.sentiment === 'no'
                            ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
                            : item.sentiment === 'neutral'
                            ? { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }
                            : { background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}
                        >
                          {item.sentiment === 'yes'
                            ? '↑ YES'
                            : item.sentiment === 'no'
                            ? '↓ NO'
                            : item.sentiment === 'neutral'
                            ? '— Neutral'
                            : `↑ ${item.sentiment.length > 14 ? item.sentiment.slice(0, 14) + '…' : item.sentiment}`}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT — col-span-4 sticky */}
          <div className="hidden lg:block lg:col-span-4 lg:self-start">
            <div className="sticky top-24 space-y-6">

              {/* Trade Panel */}
              <div className="glass-card p-6 rounded-2xl space-y-5" style={{ border: '1px solid rgba(255,255,255,0.20)', background: 'rgba(255,255,255,0.05)' }}>
                <h3 className="text-sm font-bold uppercase tracking-widest text-white">Trade This Market</h3>

                {/* Outcome selector */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Select Outcome
                  </label>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    {market.outcomes.map((o, i) => {
                      const oPct = Math.round(o.probability * 100);
                      const color = colors[i % colors.length];
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedOutcome(i)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all"
                          style={selIdx === i ? {
                            background: bgColorsStrong[i % bgColorsStrong.length],
                            border: `1px solid ${color}50`,
                          } : {
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <span className="text-xs font-semibold truncate" style={{ color: selIdx === i ? color : 'rgba(255,255,255,0.7)', maxWidth: '70%' }}>
                            {o.name}
                          </span>
                          <span className="text-xs font-bold font-mono flex-shrink-0" style={{ color }}>
                            {oPct}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
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
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>USDC</span>
                  </div>
                </div>

                {/* Quick amounts */}
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
                    <span className="text-sm font-mono font-bold text-white">${selectedPayout}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Implied Prob.</span>
                    <span className="text-sm font-mono font-bold" style={{ color: colors[selIdx % colors.length] }}>
                      {Math.round(selectedOutcomeData.probability * 100)}%
                    </span>
                  </div>
                </div>

                {/* Trade button */}
                <a
                  href={selectedTradeLink}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-4 rounded-xl text-center text-sm font-bold text-white transition-all hover:brightness-110"
                  style={{ background: '#7C3AED', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
                >
                  Trade {selectedOutcomeData.name.length > 14 ? selectedOutcomeData.name.slice(0, 14) + '…' : selectedOutcomeData.name} →
                </a>

                <p className={`${inter.className} text-[10px] text-center`} style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Powered by DFlow x Kalshi on Solana
                </p>
              </div>

              {/* Crada Intelligence */}
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
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Leader Edge</p>
                    <span className="text-sm font-mono font-bold" style={{ color: spread > 15 ? '#4de082' : '#fbbf24' }}>
                      +{spread}%
                    </span>
                  </div>
                  <p className={`${inter.className} text-xs leading-relaxed italic`} style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {multiSignalText}
                  </p>
                </div>

                <button
                  onClick={() => setTerminalOpen(o => !o)}
                  className={`${inter.className} text-xs flex items-center gap-1 transition-opacity hover:opacity-70`}
                  style={{ color: '#7C3AED' }}
                >
                  View Full Terminal Data
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>

                {terminalOpen && (
                  <p className={`${inter.className} text-xs mt-3`} style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Coming Soon
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Mobile sticky bottom bar — top 2 outcomes */}
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-4"
          style={{ background: 'rgba(5,5,5,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div className="flex gap-3">
            <a
              href={market.tradeUrl || 'https://polymarket.com'}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-3.5 rounded-xl text-center text-sm font-bold"
              style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.30)', color: '#a78bfa' }}
            >
              {leader.name.length > 12 ? leader.name.slice(0, 12) + '…' : leader.name} · {leaderPct}%
            </a>
            <a
              href={market.tradeUrl || 'https://polymarket.com'}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-3.5 rounded-xl text-center text-sm font-bold"
              style={{ background: 'rgba(96,165,250,0.13)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}
            >
              {second.name.length > 12 ? second.name.slice(0, 12) + '…' : second.name} · {Math.round(second.probability * 100)}%
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${spaceGrotesk.className} min-h-screen text-white`}
      style={{ background: '#050505' }}
    >
      <style>{pageStyles}</style>

      {/* Header */}
      <header
        className="fixed top-0 w-full z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b"
        style={{ background: 'rgba(5,5,5,0.90)', backdropFilter: 'blur(24px)', borderBottomColor: 'rgba(255,255,255,0.10)' }}
      >
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/')}>
            <img src="/crada-logo.png" alt="Crada" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
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
          <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{ color: '#4de082', border: '1px solid rgba(77,224,130,0.30)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4de082' }} />
            Live
          </div>
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
            {market.endDate && (
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Expires {new Date(market.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            <span
              className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.5)' }}
            >
              {market.category}
            </span>
          </div>

          {/* Title */}
          <h1
            className="font-bold text-white leading-tight text-2xl sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: '-0.02em' }}
          >
            {market.question}
          </h1>

          {/* YES/NO probability cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-6 rounded-xl flex flex-col items-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>YES</p>
              <p className="text-5xl font-bold" style={{ color: '#7C3AED' }}>{pct}%</p>
            </div>
            <div className="glass-card p-6 rounded-xl flex flex-col items-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>NO</p>
              <p className="text-5xl font-bold text-white">{noPct}%</p>
            </div>
          </div>

          {/* Full-width probability bar */}
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: '#7C3AED', boxShadow: '0 0 12px rgba(124,58,237,0.5)' }}
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-1 py-4">
            {[
              { label: '24h Volume', value: `$${(market.volume / 1000).toFixed(0)}K` },
              { label: 'Liquidity', value: `$${((market.liquidity || 0) / 1000).toFixed(0)}K` },
              { label: 'Category', value: market.category.charAt(0).toUpperCase() + market.category.slice(1) },
            ].map(({ label, value }) => (
              <div key={label} className="cyber-border pb-4">
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
                <p className="text-lg font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['overview', 'news'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                style={activeTab === tab
                  ? { background: '#7C3AED', color: 'white' }
                  : { color: 'rgba(255,255,255,0.4)' }}
              >
                {tab === 'overview' ? 'Overview' : 'News & Social'}
              </button>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <>
              {/* Historical Probability Chart */}
              <ProbabilityChart history={history} currentPct={pct} />

              {/* Risk Analysis */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Risk Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      label: 'Macro Lag',
                      dot: '#4de082',
                      text: pct > 60
                        ? `Likely resolves Yes. Strong consensus forming at ${pct}%.`
                        : `Possible Yes outcome. Market pricing ${pct}% probability.`,
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
                        ? `Likely resolves No. Bears in control at ${noPct}%.`
                        : `${noPct}% chance of No outcome. Still contested.`,
                    },
                  ].map(({ label, dot, text }) => (
                    <div key={label} className="glass-card p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
                        <p className="text-xs font-bold uppercase tracking-widest text-white">{label}</p>
                      </div>
                      <p className={`${inter.className} text-xs leading-relaxed`} style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* News & Social feed */
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Signal direction vs. market question
                </p>
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>

              {newsLoading ? (
                <div className="py-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Scanning news feeds...
                </div>
              ) : news.length === 0 ? (
                <div className="py-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  No recent news found for this market.
                </div>
              ) : news.map((item, i) => {
                const age = item.minsAgo < 60
                  ? `${item.minsAgo}m ago`
                  : item.minsAgo < 1440
                  ? `${Math.round(item.minsAgo / 60)}h ago`
                  : `${Math.round(item.minsAgo / 1440)}d ago`;
                return (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-card block rounded-xl p-4 transition-all hover:border-purple-500/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white leading-snug mb-2">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          <span className="font-bold">{item.source}</span>
                          <span>·</span>
                          <span>{age}</span>
                        </div>
                      </div>
                      <span
                        className="flex-shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest"
                        style={
                          item.sentiment === 'yes'
                            ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }
                            : item.sentiment === 'no'
                            ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
                            : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }
                        }
                      >
                        {item.sentiment === 'yes' ? '↑ YES' : item.sentiment === 'no' ? '↓ NO' : '— Neutral'}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT — col-span-4 (hidden on mobile, use sticky bar instead) */}
        <div className="hidden lg:block lg:col-span-4 lg:self-start">
          <div className="sticky top-24 space-y-6">

          {/* Trade Panel */}
          <div
            className="glass-card p-6 rounded-2xl space-y-6"
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
                  } : {
                    color: 'rgba(255,255,255,0.4)',
                  }}
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
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
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
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.5)',
                  }}
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
                  {tradeTab === 'yes' ? pct : noPct}%
                </span>
              </div>
            </div>

            {/* Trade on Polymarket */}
            <a
              href={market.tradeUrl || 'https://polymarket.com'}
              target="_blank"
              rel="noreferrer"
              className="block w-full py-4 rounded-xl text-center text-sm font-bold text-white transition-all hover:brightness-110"
              style={{ background: '#7C3AED', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
            >
              Trade on Polymarket
            </a>

            <p className={`${inter.className} text-[10px] text-center`} style={{ color: 'rgba(255,255,255,0.2)' }}>
              Powered by DFlow x Kalshi on Solana
            </p>
          </div>

          {/* Crada Signal Card */}
          <div
            className="p-6 rounded-2xl"
            style={{ border: '1px solid rgba(124,58,237,0.30)', background: 'rgba(124,58,237,0.05)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#7C3AED' }}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Crada Intelligence</p>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Live Edge Monitoring</p>
              </div>
            </div>

            {/* Inner black card */}
            <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(0,0,0,0.60)' }}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Calculated Edge</p>
                <span className="text-sm font-mono font-bold" style={{ color: pct >= 50 ? '#4de082' : '#f87171' }}>
                  {edgePct}%
                </span>
              </div>
              <p className={`${inter.className} text-xs leading-relaxed italic`} style={{ color: 'rgba(255,255,255,0.6)' }}>
                {signalText}
              </p>
            </div>

            <button
              onClick={() => setTerminalOpen(o => !o)}
              className={`${inter.className} text-xs flex items-center gap-1 transition-opacity hover:opacity-70`}
              style={{ color: '#7C3AED' }}
            >
              View Full Terminal Data
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>

            {terminalOpen && (
              <p className={`${inter.className} text-xs mt-3`} style={{ color: 'rgba(255,255,255,0.4)' }}>
                Coming Soon
              </p>
            )}
          </div>
          </div>
        </div>
      </main>

      {/* Mobile sticky trade bar */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-4"
        style={{ background: 'rgba(5,5,5,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div className="flex gap-3">
          <a
            href={market.tradeUrl || 'https://polymarket.com'}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-3.5 rounded-xl text-center text-sm font-bold"
            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.30)', color: '#4ade80' }}
          >
            Buy YES · {pct}%
          </a>
          <a
            href={market.tradeUrl || 'https://polymarket.com'}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-3.5 rounded-xl text-center text-sm font-bold"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.30)', color: '#f87171' }}
          >
            Buy NO · {noPct}%
          </a>
        </div>
      </div>
    </div>
  );
}
