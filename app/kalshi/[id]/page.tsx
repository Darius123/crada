'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

const DFLOW_PROXY = 'https://api.eitherway.ai/api/dflow';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const STATUS_MSGS: Record<string, string> = {
  pending: 'Order submitted — waiting for confirmation...',
  open: 'Order live on-chain, awaiting fill...',
  pendingClose: 'Filled! Awaiting settlement...',
  closed: 'Order filled and settled!',
  expired: 'Order expired. Try again.',
  failed: 'Order failed. Please retry.',
  timeout: 'Status check timed out. Check your wallet.',
};

async function pollOrderStatus(signature: string, maxTries = 60): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const res = await fetch(`${DFLOW_PROXY}/e.quote-api.dflow.net/order-status?signature=${signature}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (['closed', 'expired', 'failed', 'pendingClose'].includes(data.status)) return data.status;
    } catch { continue; }
  }
  return 'timeout';
}

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
  accounts?: Record<string, { yesMint?: string; noMint?: string }>;
  error?: string;
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

function ProbabilityChart({ history, currentPct, estimated }: { history: HistoryPoint[]; currentPct: number; estimated?: boolean }) {
  const W = 600, H = 180;
  const PAD = { top: 16, right: 16, bottom: 28, left: 42 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  if (history.length < 2) {
    return (
      <div className="glass-card w-full rounded-xl flex items-center justify-center" style={{ height: '180px' }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Loading chart…
        </p>
      </div>
    );
  }

  const minT = history[0].t;
  const maxT = history[history.length - 1].t;
  const tRange = maxT - minT || 1;
  const toX = (t: number) => PAD.left + ((t - minT) / tRange) * cw;
  const toY = (p: number) => PAD.top + (1 - p) * ch;

  const pts = history.map(d => `${toX(d.t).toFixed(1)},${toY(d.p).toFixed(1)}`).join(' ');
  const firstX = toX(history[0].t).toFixed(1);
  const lastX = toX(history[history.length - 1].t).toFixed(1);
  const bottomY = (PAD.top + ch).toFixed(1);
  const areaPath = `M${firstX},${bottomY} L${pts.replace(/(\d+\.?\d*),(\d+\.?\d*)/g, 'L$1,$2').slice(1)} L${lastX},${bottomY} Z`;

  const labelIndices = Array.from({ length: 4 }, (_, i) => Math.round((i / 3) * (history.length - 1)));
  const xLabels = labelIndices.map(i => ({
    x: toX(history[i].t),
    label: new Date(history[i].t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const lineColor = currentPct >= 50 ? '#7c3aed' : '#f87171';

  return (
    <div className="glass-card rounded-xl overflow-hidden" style={{ padding: '4px 0 0' }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Historical Probability — YES
        </p>
        {estimated && (
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Estimated
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: '180px' }}>
        <defs>
          <linearGradient id="kalshiAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map(p => (
          <g key={p}>
            <line x1={PAD.left} y1={toY(p)} x2={PAD.left + cw} y2={toY(p)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD.left - 6} y={toY(p) + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.3)">{Math.round(p * 100)}%</text>
          </g>
        ))}
        <path d={areaPath} fill="url(#kalshiAreaGrad)" />
        <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={toX(history[history.length - 1].t)} cy={toY(history[history.length - 1].p)} r="3" fill={lineColor} />
        {xLabels.map(({ x, label }) => (
          <text key={label} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)">{label}</text>
        ))}
      </svg>
    </div>
  );
}

export default function KalshiMarketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { login, logout, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const solWallet = wallets[0] ?? null;
  const publicKey = solWallet ? new PublicKey(solWallet.address) : null;
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const [market, setMarket] = useState<KalshiMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [tradeTab, setTradeTab] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'news'>('overview');
  const [news, setNews] = useState<{ title: string; link: string; source: string; minsAgo: number; sentiment: 'yes' | 'no' | 'neutral' }[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsFetched, setNewsFetched] = useState(false);

  // On-chain trade state
  const [quote, setQuote] = useState<{ outAmount?: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);

  useEffect(() => {
    if (activeTab !== 'news' || newsFetched) return;
    setNewsLoading(true);
    fetch(`/api/kalshi/${id}/news`)
      .then(r => r.json())
      .then(d => { setNews(d.news || []); setNewsFetched(true); })
      .catch(() => setNewsFetched(true))
      .finally(() => setNewsLoading(false));
  }, [activeTab, id, newsFetched]);

  useEffect(() => {
    fetch(`/api/kalshi/${id}`)
      .then(r => r.json())
      .then(d => { setMarket(d); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`/api/kalshi/${id}/history`)
      .then(r => r.json())
      .then(d => setHistory(d.history ?? []))
      .catch(() => {});
  }, [id]);

  const usdcAcct = market?.accounts?.[USDC_MINT];
  const yesMint = usdcAcct?.yesMint;
  const noMint = usdcAcct?.noMint;
  const outputMint = tradeTab === 'yes' ? yesMint : noMint;
  const canTradeOnChain = !!(outputMint && market?.status && ['active', 'open'].includes(market.status));

  const fetchQuote = useCallback(async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !outputMint) { setQuote(null); return; }
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const amtScaled = Math.round(amt * 1_000_000).toString();
      const params = new URLSearchParams({ inputMint: USDC_MINT, outputMint, amount: amtScaled, slippageBps: 'auto', prioritizationFeeLamports: 'auto', predictionMarketSlippageBps: '100' });
      const res = await fetch(`${DFLOW_PROXY}/e.quote-api.dflow.net/order?${params}`);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let msg = `HTTP ${res.status}`;
        try {
          const body = JSON.parse(text);
          msg = body?.error || body?.message || body?.detail || msg;
        } catch { if (text) msg = text; }
        if (res.status === 400) msg = 'Amount unavailable — try a smaller size or switch sides';
        throw new Error(msg);
      }
      setQuote(await res.json());
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : String(err));
      setQuote(null);
    } finally { setQuoteLoading(false); }
  }, [amount, outputMint]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 500);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  const handleTrade = async () => {
    if (!publicKey || !outputMint || !solWallet) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setTxStatus('submitting'); setTxError(null); setOrderStatus(null); setTxSig(null);
    try {
      const amtScaled = Math.round(amt * 1_000_000).toString();
      const params = new URLSearchParams({ inputMint: USDC_MINT, outputMint, amount: amtScaled, userPublicKey: publicKey.toBase58(), slippageBps: 'auto', prioritizationFeeLamports: 'auto', predictionMarketSlippageBps: '100' });
      const res = await fetch(`${DFLOW_PROXY}/e.quote-api.dflow.net/order?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const orderData = await res.json();
      if (!orderData.transaction) throw new Error('No transaction returned');
      const txBytes = Uint8Array.from(atob(orderData.transaction), c => c.charCodeAt(0));
      const { signature } = await signAndSendTransaction({ transaction: txBytes, wallet: solWallet });
      const sig = bs58.encode(signature);
      setTxSig(sig); setTxStatus('polling'); setOrderStatus('pending');
      const finalStatus = await pollOrderStatus(sig);
      setOrderStatus(finalStatus); setTxStatus('done');
    } catch (err) {
      setTxError(err instanceof Error ? err.message : String(err));
      setTxStatus(null);
    }
  };

  const resetTrade = () => { setTxStatus(null); setOrderStatus(null); setTxSig(null); setTxError(null); setAmount(''); setQuote(null); };

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
          <h1 className="font-bold text-white leading-tight text-2xl sm:text-4xl lg:text-5xl" style={{ letterSpacing: '-0.02em' }}>
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
              <ProbabilityChart history={history} currentPct={yesPct} estimated />

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

            {/* Quote / payout */}
            <div className="space-y-2 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {canTradeOnChain ? (
                <>
                  {quoteLoading && <div className="text-[10px] text-white/30">Fetching quote...</div>}
                  {quoteError && <div className="text-[10px] text-red-400">{quoteError}</div>}
                  {quote && !quoteLoading && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Est. Contracts</span>
                      <span className="text-sm font-mono font-bold text-white">{((quote.outAmount ?? 0) / 1e6).toFixed(2)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Est. Payout</span>
                  <span className="text-sm font-mono font-bold text-white">${tradeTab === 'yes' ? payoutYes : payoutNo}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Implied Prob.</span>
                <span className="text-sm font-mono font-bold" style={{ color: '#7C3AED' }}>{tradeTab === 'yes' ? yesPct : noPct}¢</span>
              </div>
            </div>

            {/* TX error */}
            {txError && (
              <div className="rounded-xl p-3 text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
                {txError}
              </div>
            )}

            {/* TX success */}
            {txStatus === 'done' && (
              <div className="space-y-3">
                <div className="text-xs text-white/60">{STATUS_MSGS[orderStatus || ''] || ''}</div>
                {txSig && (
                  <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:underline block">
                    View on Solscan →
                  </a>
                )}
                <button onClick={resetTrade} className="w-full py-2 rounded-xl text-sm font-medium border border-white/10 text-white/60 hover:text-white transition-all">
                  New Trade
                </button>
              </div>
            )}

            {/* CTA */}
            {txStatus !== 'done' && (
              isActive ? (
                canTradeOnChain ? (
                  !publicKey ? (
                    <button
                      onClick={login}
                      className="block w-full py-4 rounded-xl text-center text-sm font-bold text-white transition-all hover:brightness-110"
                      style={{ background: '#7C3AED', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
                    >
                      Sign in to Trade
                    </button>
                  ) : txStatus ? (
                    <div className="text-center text-xs py-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {STATUS_MSGS[orderStatus || ''] || 'Processing...'}
                    </div>
                  ) : (
                    <button
                      onClick={handleTrade}
                      disabled={!amount || parseFloat(amount) <= 0}
                      className="block w-full py-4 rounded-xl text-center text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ background: '#7C3AED', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
                    >
                      {amount && parseFloat(amount) > 0 ? `Buy ${tradeTab.toUpperCase()} — $${amount}` : 'Enter amount'}
                    </button>
                  )
                ) : (
                  <a
                    href={market.tradeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full py-4 rounded-xl text-center text-sm font-bold text-white transition-all hover:brightness-110"
                    style={{ background: '#7C3AED', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
                  >
                    Trade on DFlow →
                  </a>
                )
              ) : (
                <div className="w-full py-4 rounded-xl text-center text-sm font-bold uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
                  Market Closed
                </div>
              )
            )}

            <p className={`${inter.className} text-[10px] text-center`} style={{ color: 'rgba(255,255,255,0.2)' }}>
              {canTradeOnChain ? 'Trades execute on-chain via Solana · Powered by DFlow × Kalshi' : 'Settled on Solana · Powered by DFlow x Kalshi'}
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
      {isActive && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-4"
          style={{ background: 'rgba(5,5,5,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div className="flex gap-3">
            {canTradeOnChain ? (
              <>
                <button
                  onClick={() => { setTradeTab('yes'); setTradeModalOpen(true); }}
                  className="flex-1 py-3.5 rounded-xl text-center text-sm font-bold"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.30)', color: '#4ade80' }}
                >
                  Buy YES · {yesPct}¢
                </button>
                <button
                  onClick={() => { setTradeTab('no'); setTradeModalOpen(true); }}
                  className="flex-1 py-3.5 rounded-xl text-center text-sm font-bold"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.30)', color: '#f87171' }}
                >
                  Buy NO · {noPct}¢
                </button>
              </>
            ) : (
              <>
                <a href={market.tradeUrl} target="_blank" rel="noreferrer" className="flex-1 py-3.5 rounded-xl text-center text-sm font-bold" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.30)', color: '#4ade80' }}>
                  Buy YES · {yesPct}¢
                </a>
                <a href={market.tradeUrl} target="_blank" rel="noreferrer" className="flex-1 py-3.5 rounded-xl text-center text-sm font-bold" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.30)', color: '#f87171' }}>
                  Buy NO · {noPct}¢
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile trade bottom sheet */}
      {tradeModalOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setTradeModalOpen(false)} />
          <div className="relative rounded-t-2xl p-6 space-y-5" style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.10)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Trade This Market</h3>
              <button onClick={() => setTradeModalOpen(false)} className="text-white/40 hover:text-white text-xl leading-none">×</button>
            </div>

            {/* YES/NO toggle */}
            <div className="flex p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.40)' }}>
              {(['yes', 'no'] as const).map(tab => (
                <button key={tab} onClick={() => setTradeTab(tab)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                  style={tradeTab === tab ? { background: tab === 'yes' ? '#22c55e' : '#ef4444', color: 'white' } : { color: 'rgba(255,255,255,0.4)' }}>
                  Buy {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Amount</label>
              <div className="relative">
                <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                  className="w-full rounded-xl px-4 py-3 text-sm font-mono font-bold text-white pr-16 focus:outline-none"
                  style={{ background: 'rgba(0,0,0,0.60)', border: '1px solid rgba(255,255,255,0.10)' }} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>USDC</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[1, 5, 10, 50].map(v => (
                  <button key={v} onClick={() => setAmount(String(v))}
                    className="py-2 rounded-lg text-xs font-bold transition-all hover:text-white"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.5)' }}>
                    ${v}
                  </button>
                ))}
              </div>
            </div>

            {/* Quote */}
            {(quoteLoading || quote || quoteError) && (
              <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {quoteLoading && <div className="text-white/30">Fetching quote...</div>}
                {quoteError && <div className="text-red-400">{quoteError}</div>}
                {quote && !quoteLoading && (
                  <div className="flex justify-between"><span className="text-white/40">Est. contracts</span><span className="text-white font-mono">{((quote.outAmount ?? 0) / 1e6).toFixed(2)}</span></div>
                )}
              </div>
            )}

            {/* Error */}
            {txError && <div className="rounded-xl p-3 text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>{txError}</div>}

            {/* Status / CTA */}
            {txStatus === 'done' ? (
              <div className="space-y-3">
                <div className="text-xs text-white/60">{STATUS_MSGS[orderStatus || ''] || ''}</div>
                {txSig && <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:underline block">View on Solscan →</a>}
                <button onClick={resetTrade} className="w-full py-3 rounded-xl text-sm font-medium border border-white/10 text-white/60 hover:text-white">New Trade</button>
              </div>
            ) : !publicKey ? (
              <button onClick={login} className="w-full py-4 rounded-xl text-sm font-bold text-white" style={{ background: '#7C3AED' }}>Sign in to Trade</button>
            ) : txStatus ? (
              <div className="text-center text-xs py-3 text-white/40">{STATUS_MSGS[orderStatus || ''] || 'Processing...'}</div>
            ) : (
              <button onClick={handleTrade} disabled={!amount || parseFloat(amount) <= 0}
                className="w-full py-4 rounded-xl text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: tradeTab === 'yes' ? '#22c55e' : '#ef4444' }}>
                {amount && parseFloat(amount) > 0 ? `Buy ${tradeTab.toUpperCase()} — $${amount}` : 'Enter amount'}
              </button>
            )}

            <p className="text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>Trades execute on-chain via Solana · Powered by DFlow × Kalshi</p>
          </div>
        </div>
      )}
    </div>
  );
}
