'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });


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

  const positions: never[] = [];
  const activity: never[] = [];

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
          <img src="/crada-logo.png" alt="Crada" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
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
              {address ? '—' : '$0.00'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              USDC · Solana
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
                {positions.length} Active
              </span>
            </div>
            <button onClick={() => router.push('/')} className="text-[10px] font-bold uppercase tracking-widest transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Browse Markets
            </button>
          </div>

          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(255,255,255,0.12)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>No open positions yet</p>
              <button
                onClick={() => router.push('/')}
                className="text-xs font-bold px-4 py-2 rounded-lg transition-all hover:brightness-110"
                style={{ background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.3)' }}
              >
                Browse Markets →
              </button>
            </div>
          ) : null}
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-bold text-white">Recent Activity</h2>
            <button
              onClick={() => router.push('/coming-soon')}
              className="text-[10px] font-bold uppercase tracking-widest transition-colors hover:text-white"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              View All
            </button>
          </div>

          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(255,255,255,0.12)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>No recent activity</p>
              <p className={`${inter.className} text-[11px] text-center px-6`} style={{ color: 'rgba(255,255,255,0.2)' }}>
                Your trades and transactions will appear here
              </p>
            </div>
          ) : null}
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
