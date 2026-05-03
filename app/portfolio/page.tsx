'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

const MOCK_POSITIONS = [
  { id: 1, question: 'Will BTC reach $100k before May 2024?', side: 'YES', stake: 45.00, pnl: +12.40, contracts: 12.50, probability: 64 },
  { id: 2, question: 'Fed Rate Cut in June?', side: 'NO', stake: 20.00, pnl: -3.15, contracts: 8.20, probability: 38 },
  { id: 3, question: 'SOL ATH in 2026?', side: 'YES', stake: 10.00, pnl: +5.80, contracts: 5.00, probability: 71 },
];

const MOCK_ACTIVITY = [
  { id: 1, type: 'buy', label: 'Bought YES · Tech Layoffs 2026', time: '2 hours ago', amount: -10.00, status: 'CONFIRMED', txUrl: '#' },
  { id: 2, type: 'deposit', label: 'Funds Added · Phantom', time: '5 hours ago', amount: +50.00, status: 'CONFIRMED', txUrl: '#' },
  { id: 3, type: 'sell', label: 'Sold NO · ETH $5k Q1', time: '1 day ago', amount: +24.50, status: 'CONFIRMED', txUrl: '#' },
];

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export default function PortfolioPage() {
  const router = useRouter();
  const { login, logout, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const solWallet = wallets[0] ?? null;
  const [copied, setCopied] = useState(false);

  const address = solWallet?.address ?? null;
  const shortAddr = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : '—';
  const walletName = solWallet?.standardWallet?.name ?? '';
  const isEmbedded = walletName.toLowerCase().includes('privy') || walletName.toLowerCase().includes('embedded');
  const walletLabel = isEmbedded ? 'Embedded Wallet' : (walletName || 'Wallet');

  const totalBalance = 124.50;
  const solBalance = 0.42;
  const totalPnl = MOCK_POSITIONS.reduce((s, p) => s + p.pnl, 0);

  const handleCopy = () => {
    if (address) { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  };

  return (
    <div className={`${spaceGrotesk.className} min-h-screen text-white`} style={{ background: '#050505' }}>

      {/* Desktop sidebar spacer + header */}
      <header
        className="fixed top-0 w-full z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b"
        style={{ background: 'rgba(5,5,5,0.90)', backdropFilter: 'blur(24px)', borderBottomColor: 'rgba(255,255,255,0.08)' }}
      >
        <button onClick={() => router.push('/')}>
          <img src="/crada-logo.png" alt="Crada" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
        </button>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <button onClick={() => router.push('/')} className="hover:text-white transition-colors">Markets</button>
          <button onClick={() => router.push('/signals')} className="hover:text-white transition-colors">Signals</button>
          <span className="text-white">Portfolio</span>
          <button onClick={() => router.push('/coming-soon')} className="hover:text-white transition-colors">Activity</button>
        </div>
        <div className="flex items-center gap-3">
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

      <main className="pt-20 pb-32 px-4 sm:px-6 md:pl-72 md:pr-10 max-w-[1440px] mx-auto space-y-5">

        {/* Profile card — top of page */}
        <div
          className="rounded-2xl p-5 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar — generated from wallet address initials or default */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
            >
              {address ? address.slice(0, 2).toUpperCase() : 'CR'}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-white">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Terminal User'}
                </p>
                <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(77,224,130,0.10)', border: '1px solid rgba(77,224,130,0.25)', color: '#4de082' }}>
                  <div className="w-1 h-1 rounded-full" style={{ background: '#4de082' }} />
                  Live
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', color: '#c4b5fd' }}>
                Verified Quant
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full" style={{ color: '#4de082', border: '1px solid rgba(77,224,130,0.20)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4de082' }} />
              Solana Mainnet
            </div>
            {!authenticated && (
              <button onClick={login} className="text-xs px-3 py-1.5 rounded-full font-bold text-white" style={{ background: '#7C3AED' }}>Connect</button>
            )}
          </div>
        </div>

        {/* Wallet Card */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', boxShadow: '0 0 40px rgba(124,58,237,0.10)' }}
        >
          {/* Glow blob */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: '#7c3aed', filter: 'blur(60px)' }} />

          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>My Wallet</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.7)' }}>{shortAddr}</span>
                {address && (
                  <button onClick={handleCopy} className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {copied ? <span className="text-[10px] text-green-400">Copied!</span> : <CopyIcon />}
                  </button>
                )}
              </div>
            </div>
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.30)', color: '#c4b5fd' }}
            >
              {address ? walletLabel : 'Not Connected'}
            </span>
          </div>

          {/* Balance */}
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Available Liquidity</p>
            <p className="text-4xl sm:text-5xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
              ${totalBalance.toFixed(2)}
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              USDC · Solana &nbsp;·&nbsp; {solBalance} SOL
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
              style={{ background: '#7C3AED', boxShadow: '0 0 16px rgba(124,58,237,0.30)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Funds
            </button>
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              Send
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Buy Crypto',
              sub: 'via MoonPay',
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              ),
              onClick: () => {},
            },
            {
              label: 'Swap',
              sub: 'Jupiter',
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              ),
              onClick: () => {},
            },
            {
              label: 'Receive',
              sub: 'QR Code',
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              ),
              onClick: () => {},
            },
          ].map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:border-white/20"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)', color: '#c4b5fd' }}>
                {action.icon}
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-white">{action.label}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{action.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Open Positions */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-white">Open Positions</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', color: '#c4b5fd' }}>
                {MOCK_POSITIONS.length} Active
              </span>
            </div>
            <button onClick={() => router.push('/')} className="text-[10px] font-bold uppercase tracking-widest transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Browse Markets
            </button>
          </div>

          <div className="divide-y" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
            {MOCK_POSITIONS.map(pos => (
              <div key={pos.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                    style={pos.side === 'YES'
                      ? { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }
                      : { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
                    }
                  >
                    {pos.side}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{pos.question}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {pos.contracts} contracts · {pos.probability}% odds
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color: pos.pnl >= 0 ? '#4ade80' : '#f87171' }}>
                    {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                  </p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Stake ${pos.stake.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Total P&L footer */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Total Unrealized P&L</span>
            <span className="text-sm font-bold font-mono" style={{ color: totalPnl >= 0 ? '#4ade80' : '#f87171' }}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-bold text-white">Recent Activity</h2>
            <button className="text-[10px] font-bold uppercase tracking-widest transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.35)' }}>
              View All
            </button>
          </div>

          <div className="divide-y" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
            {MOCK_ACTIVITY.map(tx => (
              <div key={tx.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: tx.amount > 0 ? 'rgba(34,197,94,0.10)' : 'rgba(124,58,237,0.10)' }}
                  >
                    {tx.type === 'buy' && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#c4b5fd' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    )}
                    {tx.type === 'deposit' && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#4ade80' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    )}
                    {tx.type === 'sell' && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#4ade80' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{tx.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{tx.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono" style={{ color: tx.amount > 0 ? '#4ade80' : 'rgba(255,255,255,0.7)' }}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{tx.status}</p>
                  </div>
                  <a href={tx.txUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    <ExternalIcon />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Crada signal footer nudge */}
        <div
          className={`${inter.className} flex items-center justify-between p-4 rounded-xl`}
          style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#7c3aed' }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-white">Crada Intelligence</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>3 new signals on your open positions</p>
            </div>
          </div>
          <button onClick={() => router.push('/signals')} className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:brightness-110" style={{ background: '#7c3aed', color: 'white' }}>
            View
          </button>
        </div>

      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-3"
        style={{ background: 'rgba(5,5,5,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        {[
          { label: 'Markets', path: '/', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
          { label: 'Signals', path: '/signals', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
          { label: 'Portfolio', path: '/portfolio', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
          { label: 'Activity', path: '/coming-soon', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        ].map(tab => {
          const active = tab.path === '/portfolio';
          return (
            <button key={tab.label} onClick={() => router.push(tab.path)} className="flex flex-col items-center gap-1 px-4 py-1 transition-all">
              <span style={{ color: active ? '#7c3aed' : 'rgba(255,255,255,0.35)' }}>{tab.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: active ? '#7c3aed' : 'rgba(255,255,255,0.35)' }}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
