'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { useRouter, useSearchParams } from 'next/navigation';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

interface Market {
  id: string;
  question: string;
  probability: number;
  volume: number;
  volume24h?: number;
  category: string;
  endDate: string;
  image?: string;
  tradeUrl?: string;
  priceChange?: number | null;
  outcomes?: { name: string; probability: number }[];
}

interface TickerItem {
  label: string;
  price: string;
  change: string;
  up: boolean;
}

const ITEMS_PER_PAGE = 20;
const SOL_MINT  = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

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

const lineClamp2: React.CSSProperties = {
  display: '-webkit-box' as React.CSSProperties['display'],
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

// ─── Shared Styles ────────────────────────────────────────────────────────────

const sharedStyles = `
  .terminal-glass {
    background: rgba(15,15,15,0.4);
    backdrop-filter: blur(40px);
    border: 1px solid rgba(255,255,255,0.05);
    transition: border-color 0.3s ease;
  }
  .terminal-glass:hover {
    border-color: rgba(124,58,237,0.3);
  }
  .glass-card {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .purple-glow {
    filter: drop-shadow(0 0 25px rgba(124,58,237,0.25));
  }
  .signal-line {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(124,58,237,0.5), transparent);
  }
  .hero-mesh {
    background-image: radial-gradient(circle at 50% 50%, rgba(124,58,237,0.08) 0%, transparent 50%),
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 100% 100%, 40px 40px, 40px 40px;
  }
  @keyframes float {
    0% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0); }
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  @keyframes eye-blink {
    0%, 90%, 100% { opacity: 0; }
    92%, 98% { opacity: 0.8; }
  }
  .eye-shutter {
    background: #050505;
    animation: eye-blink var(--blink-duration) infinite ease-in-out;
    animation-delay: var(--blink-delay);
  }
  @keyframes ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .ticker-content {
    display: inline-block;
    animation: ticker 30s linear infinite;
  }
  @keyframes ping-dot {
    75%, 100% { transform: scale(2); opacity: 0; }
  }
  .animate-ping-dot {
    animation: ping-dot 1.5s cubic-bezier(0,0,0.2,1) infinite;
  }
  .hero-h1 {
    font-size: 80px;
    letter-spacing: -0.04em;
    line-height: 0.95;
  }
  .vision-h2 {
    font-size: 80px;
    letter-spacing: -0.03em;
    line-height: 1.0;
  }
  @media (max-width: 640px) {
    .hero-h1 { font-size: 36px; letter-spacing: -0.02em; line-height: 1.05; }
    .vision-h2 { font-size: 32px; letter-spacing: -0.02em; line-height: 1.1; }
  }
  @media (min-width: 641px) and (max-width: 1023px) {
    .hero-h1 { font-size: 56px; }
    .vision-h2 { font-size: 52px; }
  }
  .stats-offset { margin-top: 0; }
  @media (min-width: 640px) {
    .stats-offset { margin-top: -80px; }
  }
`;

// ─── Landing Page ─────────────────────────────────────────────────────────────

function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div
      className={`${spaceGrotesk.className} text-[#e2e2e2] overflow-x-hidden min-h-screen`}
      style={{ background: '#050505' }}
    >
      <style>{sharedStyles}</style>

      {/* Fixed Header */}
      <header
        className="fixed top-0 w-full z-50 flex items-center justify-between px-5 sm:px-12 h-16 sm:h-20 border-b"
        style={{
          background: 'rgba(5,5,5,0.80)',
          backdropFilter: 'blur(24px)',
          borderBottomColor: 'rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-10">
          <img src="/crada-logo.png" alt="Crada" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
          <nav className="hidden md:flex items-center gap-8">
            {['Markets', 'Signals', 'Terminal', 'Docs'].map(item => (
              <button
                key={item}
                onClick={item === 'Markets' || item === 'Signals' ? onEnter : undefined}
                className="text-sm"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 rounded-full px-4 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <svg className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Search signals...</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>⌘K</span>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <svg className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button
            onClick={onEnter}
            className="purple-glow rounded-full px-7 text-sm font-bold text-white"
            style={{ background: '#7C3AED', paddingTop: '10px', paddingBottom: '10px' }}
          >
            Connect Wallet
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Eye background image */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXugnWTwJFtJ92AJbjEh0GqVN1wjOr3VF4yn9IppO-VGzEADbPCPyG9GrvW8w5HJ-JAwDOxZvLb3b-29CtIhmkot1UUd7fNxDLYiAYUHu1bmpAoMt3vwOwTlf5Ptx6nytcq7L--s2vQUQr1IV3jfz9JEtlsDToYjYIkientpgEeWBCu-CEHSzafaWnpfTOqW2iupbEUJ7HHwiiaPt6y4HIeZ_BbZDfISCWGv8YewLWaSx4kKe2ldEqBIa2_FvVBOjcdJPQycwN5Hh"
            alt=""
            className="w-full h-full object-cover scale-110"
            style={{
              mixBlendMode: 'lighten',
              opacity: 0.4,
              filter: 'grayscale(1) brightness(0.8) sepia(1) hue-rotate(240deg) saturate(3)',
            }}
          />
        </div>
        {/* Purple orb glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(124,58,237,0.15) 0%, transparent 70%)',
        }} />
        {/* Edge fades */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #050505 0%, transparent 20%, transparent 78%, #050505 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #050505 0%, transparent 15%, transparent 85%, #050505 100%)' }} />

        {/* Eye-blink grid overlay */}
        <div className="absolute inset-0 grid grid-cols-5 grid-rows-2 pointer-events-none" style={{ zIndex: 1 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="eye-shutter"
              style={
                {
                  '--blink-duration': `${8 + (i % 5) * 3}s`,
                  '--blink-delay': `${i * 1.7}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center px-5 sm:px-6 pb-20 sm:pb-40">
          {/* Floating badge */}
          <div
            className="animate-float inline-flex items-center gap-3 px-5 py-2 rounded-full mb-10"
            style={{ border: '1px solid rgba(124,58,237,0.20)', background: 'rgba(124,58,237,0.10)' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping-dot absolute inline-flex h-full w-full rounded-full" style={{ background: '#4de082', opacity: 0.75 }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#4de082' }} />
            </span>
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: '#4de082' }}>
              Intelligence Terminal v0.1.4
            </span>
          </div>

          {/* H1 */}
          <h1 className="hero-h1 font-bold mb-8">
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>THE MARKET MOVED.</span>
            <br />
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>YOU DIDN&apos;T SEE IT COMING.</span>
            <br />
            <span style={{ color: '#7C3AED', fontStyle: 'italic' }}>WE DID.</span>
          </h1>

          {/* Subtitle */}
          <p
            className={`${inter.className} mx-auto mb-10 rounded-xl px-4 sm:px-6 py-2 text-sm sm:text-xl`}
            style={{
              color: 'rgba(255,255,255,0.70)',
              maxWidth: '48rem',
              background: 'rgba(0,0,0,0.20)',
              backdropFilter: 'blur(8px)',
            }}
          >
            Stop guessing. Start knowing. The intelligence layer for prediction markets built on Solana.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <button
              onClick={onEnter}
              className="purple-glow w-full sm:w-auto flex items-center justify-center gap-2 font-bold text-white rounded-2xl px-10 sm:px-12 py-5 sm:py-6 text-base"
              style={{ background: '#7C3AED' }}
            >
              Enter the Terminal
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            <button
              onClick={onEnter}
              className="w-full sm:w-auto font-bold text-white rounded-2xl px-10 sm:px-12 py-5 sm:py-6 text-base"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              View Live Signals
            </button>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="stats-offset relative z-10 px-5 sm:px-8">
        <div className="terminal-glass rounded-3xl p-6 sm:p-12 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-12 max-w-[1280px] mx-auto">
          {[
            { label: 'Market Coverage', value: '840+', sub: 'Active' },
            { label: 'Signal Latency', value: '<120ms', sub: 'Avg' },
            { label: 'Network', value: 'Solana', sub: 'Mainnet' },
            { label: 'Infrastructure', value: 'Operational', sub: '', green: true },
          ].map(({ label, value, sub, green }) => (
            <div key={label} className="text-center lg:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                {green && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping-dot absolute inline-flex h-full w-full rounded-full" style={{ background: '#4de082', opacity: 0.75 }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#4de082' }} />
                  </span>
                )}
                <p className="text-2xl font-bold text-white">{value} {sub && <span className="text-base" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</span>}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Partner Ticker */}
      {(() => {
        type Partner = { name: string; svg?: string; invert?: boolean; icon?: string };
        const partners: Partner[] = [
          { name: 'Polymarket', svg: '/logos/polymarket.png', invert: true },
          { name: 'Kalshi',     svg: '/logos/kalshi.svg' },
          { name: 'Jupiter',    svg: '/logos/jupiter.svg' },
          { name: 'MoonPay',   svg: '/logos/moonpay.svg' },
          { name: 'Privy',      svg: '/logos/privy.svg',   invert: true },
          { name: 'Phantom',   svg: '/logos/phantom.svg',  invert: true },
          { name: 'Solflare',  svg: '/logos/solflare.svg', invert: true },
          { name: 'DFlow',     icon: '/logos/dflow.svg' },
          { name: 'SNS', icon: '/logos/sns.svg' },
          { name: 'AllDomains', svg: '/logos/alldomains.svg' },
          { name: 'Solana',    svg: '/logos/solana.svg' },
        ];
        const all = [...partners, ...partners];
        return (
          <section className="py-8 overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] mb-6" style={{ color: 'rgba(255,255,255,0.2)' }}>Powered by</p>
            <div className="overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
              <div className="ticker-content" style={{ whiteSpace: 'nowrap' }}>
                {all.map((p, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 40px' }}>
                    {p.svg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.svg} alt={p.name} style={{ height: 20, width: 'auto', opacity: 0.65, filter: p.invert ? 'brightness(0) invert(1)' : 'none', display: 'block' }} />
                    ) : p.icon ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.icon} alt="" style={{ height: 18, width: 'auto', opacity: 0.65, display: 'block' }} />
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '-0.01em' }}>{p.name}</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '-0.01em' }}>{p.name}</span>
                    )}
                    <span style={{ marginLeft: 40, color: 'rgba(255,255,255,0.1)', fontSize: 18 }}>·</span>
                  </span>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Features Section */}
      <section className="py-16 sm:py-32 px-5 sm:px-8 max-w-[1280px] mx-auto">
        <div className="mb-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] mb-4" style={{ color: '#7C3AED' }}>PLATFORM CAPABILITIES</p>
          <h2 className="text-4xl font-bold text-white mb-6">Institutional Grade Tools</h2>
          <div className="signal-line max-w-sm mx-auto mb-6" />
          <p className={`${inter.className} text-base max-w-xl mx-auto`} style={{ color: 'rgba(255,255,255,0.5)' }}>
            Precision engineered for those who demand an informational advantage in an uncertain world.
          </p>
        </div>

        <div className="grid md:grid-cols-12 gap-8">
          {/* Whale Signal — col-span-7 */}
          <div className="md:col-span-7 terminal-glass rounded-3xl p-6 sm:p-12">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.20)' }}
            >
              <svg className="w-8 h-8" style={{ color: '#7C3AED' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Whale Signal Intelligence</h3>
            <p className={`${inter.className} mb-8`} style={{ color: 'rgba(255,255,255,0.5)' }}>
              Detect unusual volume and smart money flows before they hit the mainstream. Our proprietary surveillance algorithms track whale wallets across the Solana ecosystem.
            </p>
            <div className="flex gap-3 flex-wrap">
              <span
                className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                style={{ background: 'rgba(77,224,130,0.10)', border: '1px solid rgba(77,224,130,0.20)', color: '#4de082' }}
              >
                Flow Detection
              </span>
              <span
                className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.20)', color: '#c4b5fd' }}
              >
                Pattern Matching
              </span>
            </div>
          </div>

          {/* Unified Aggregation — col-span-5 */}
          <div className="md:col-span-5 terminal-glass rounded-3xl p-6 sm:p-12 flex flex-col justify-between">
            <div>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.20)' }}
              >
                <svg className="w-8 h-8" style={{ color: '#7C3AED' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Unified Aggregation</h3>
              <p className={`${inter.className}`} style={{ color: 'rgba(255,255,255,0.5)' }}>
                500+ live markets from Polymarket, Kalshi, and leading Solana protocols — all in one terminal.
              </p>
            </div>
            <div className="mt-8 pt-8 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Connect API</span>
              <svg className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>

          {/* Zero-Latency — col-span-5 */}
          <div
            className="md:col-span-5 rounded-3xl p-6 sm:p-12 relative overflow-hidden"
            style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.10)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.20)' }}
            >
              <svg className="w-8 h-8" style={{ color: '#7C3AED' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Zero-Latency Execution</h3>
            <p className={`${inter.className}`} style={{ color: 'rgba(255,255,255,0.5)' }}>
              Trade directly via DFlow with AI-backed insights. Automated slippage protection and on-chain settlement.
            </p>
            {/* Purple blur */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                bottom: '-80px',
                right: '-80px',
                width: '200px',
                height: '200px',
                background: 'rgba(124,58,237,0.3)',
                filter: 'blur(60px)',
              }}
            />
          </div>

          {/* Quote — col-span-7 */}
          <div className="md:col-span-7 terminal-glass rounded-3xl p-6 sm:p-12 flex items-center relative overflow-hidden">
            <div className="relative z-10 max-w-lg">
              <p className="text-6xl font-bold mb-4" style={{ color: 'rgba(124,58,237,0.40)', fontFamily: 'serif', lineHeight: 1 }}>&ldquo;</p>
              <p className="text-2xl font-bold text-white mb-3 italic leading-snug">
                Information is the only true alpha.
              </p>
              <p className={`${inter.className} text-sm italic`} style={{ color: 'rgba(255,255,255,0.4)' }}>
                The difference between a trader and a quant is the speed of their information.
              </p>
            </div>
            {/* Watermark icon */}
            <div className="absolute right-12 top-0 bottom-0 flex items-center opacity-5 pointer-events-none">
              <svg className="w-40 h-40" style={{ color: '#7C3AED' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-16 sm:py-32 px-5 sm:px-8">
        <div className="max-w-[1280px] mx-auto">
          <p className="text-xs font-bold uppercase mb-6" style={{ color: '#7C3AED', letterSpacing: '0.25em' }}>OUR THESIS</p>
          <h2 className="vision-h2 font-bold text-white mb-10">
            MOST TRADERS{' '}
            <span style={{ color: 'rgba(255,255,255,0.20)' }}>OPERATE IN THE DARK.</span>
            <br />
            WE GIVE YOU{' '}
            <span style={{ color: '#7C3AED' }}>NIGHT VISION.</span>
          </h2>
          <div className="signal-line" />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 sm:py-24 px-5 sm:px-8 pb-28 sm:pb-12" style={{ background: 'rgba(5,5,5,1)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-[1280px] mx-auto grid grid-cols-12 gap-8">
          {/* Brand */}
          <div className="col-span-12 md:col-span-5">
            <img src="/crada-logo.png" alt="Crada" style={{ height: '48px', width: 'auto', objectFit: 'contain', marginBottom: '24px' }} />
            <p className={`${inter.className} text-sm mb-8`} style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '320px' }}>
              The premium intelligence layer for prediction markets. Know before the odds move.
            </p>
            <div className="flex gap-3">
              <a
                href="https://x.com/cradaHQ"
                target="_blank"
                rel="noreferrer"
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:border-[#7C3AED]"
                style={{ border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Ecosystem */}
          <div className="col-span-6 md:col-span-2">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white mb-6">ECOSYSTEM</h4>
            <ul className={`${inter.className} space-y-4`} style={{ color: 'rgba(255,255,255,0.4)' }}>
              {['Markets', 'Signals', 'Whale Watch', 'Terminal Access'].map(item => (
                <li key={item}>
                  <button onClick={onEnter} className="text-sm hover:text-white transition-colors">{item}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Developers */}
          <div className="col-span-6 md:col-span-2">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white mb-6">DEVELOPERS</h4>
            <ul className={`${inter.className} space-y-4`} style={{ color: 'rgba(255,255,255,0.4)' }}>
              {['API Reference', 'SDK Docs', 'System Status'].map(item => (
                <li key={item}>
                  <a href="#" className="text-sm hover:text-white transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-12 md:col-span-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white mb-6">NEWSLETTER</h4>
            <div className="relative">
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full rounded-xl px-4 py-3 text-sm text-white pr-20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg text-xs font-bold text-white"
                style={{ background: '#7C3AED' }}
              >
                JOIN
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>© 2026 CRADA INTELLIGENCE LABS</p>
          <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.4)' }}>&ldquo;Know before the odds move.&rdquo;</p>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-6 left-6 right-6 z-50 flex justify-around items-center py-4"
        style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(20px)', borderRadius: '16px' }}
      >
        {[
          { label: 'Markets',   active: true,  icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { label: 'Signals',   active: false, icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
          { label: 'Portfolio', active: false, icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
          { label: 'Activity',  active: false, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
        ].map(({ label, active, icon }) => (
          <button
            key={label}
            onClick={onEnter}
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

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface KalshiMarket {
  id: string;
  question: string;
  category: string;
  status: string;
  result: string | null;
  yesPct: number | null;
  noPct: number | null;
  volume: number;
  volume24h: number;
  closeTime: number;
  image: string;
  tradeUrl: string;
}

function Dashboard() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [trendingMarkets, setTrendingMarkets] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [kalshiMarkets, setKalshiMarkets] = useState<KalshiMarket[]>([]);
  const [trendingKalshi, setTrendingKalshi] = useState<KalshiMarket[]>([]);
  const [loadingKalshi, setLoadingKalshi] = useState(true);
  const [activeSource, setActiveSource] = useState<'all' | 'polymarket' | 'kalshi'>('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [visiblePolymarket, setVisiblePolymarket] = useState(ITEMS_PER_PAGE);
  const [visibleKalshi, setVisibleKalshi] = useState(ITEMS_PER_PAGE);
  const [activeSideNav, setActiveSideNav] = useState(() => {
    if (typeof window !== 'undefined') {
      const tab = sessionStorage.getItem('crada_tab');
      if (tab) { sessionStorage.removeItem('crada_tab'); return tab; }
    }
    return 'Markets';
  });
  const [copied, setCopied] = useState(false);
  const [solanaId, setSolanaId] = useState<string | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [showMoonPay, setShowMoonPay] = useState(false);
  const [showSwap, setShowSwap]       = useState(false);
  const [swapFromSol, setSwapFromSol] = useState(true);
  const [swapAmount, setSwapAmount]   = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [swapQuote, setSwapQuote]     = useState<any>(null);
  const [swapQuoting, setSwapQuoting] = useState(false);
  const [swapping, setSwapping]       = useState(false);
  const [swapSig, setSwapSig]         = useState<string | null>(null);
  const [swapError, setSwapError]     = useState<string | null>(null);

  // Use the same wallet the header shows — first linked Solana wallet from Privy's user object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primaryLinkedAddr = (user?.linkedAccounts?.find((a: any) => a.type === 'wallet' && a.chainType === 'solana') as any)?.address ?? null;
  // Find the matching wallet object so we have signing + name info
  const solWallet = wallets.find(w => w.address === primaryLinkedAddr)
    ?? wallets.find(w => {
      const n = (w.standardWallet?.name ?? '').toLowerCase();
      return !n.includes('privy') && !n.includes('embedded');
    })
    ?? wallets[0]
    ?? null;
  const address = primaryLinkedAddr ?? solWallet?.address ?? null;
  const shortAddr = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : '—';
  const walletName = solWallet?.standardWallet?.name ?? '';
  const isEmbedded = walletName.toLowerCase().includes('privy') || walletName.toLowerCase().includes('embedded');
  const walletLabel = isEmbedded ? 'Embedded Wallet' : (walletName || 'Wallet');
  const totalBalance = usdcBalance ?? 0;
  const displaySol = solBalance !== null ? solBalance.toFixed(4) : (address ? '…' : '—');
  const totalPnl = MOCK_POSITIONS.reduce((s, p) => s + p.pnl, 0);
  const handleCopy = () => {
    if (address) { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  };

  useEffect(() => {
    if (!address) { setSolBalance(null); setUsdcBalance(null); return; }
    let cancelled = false;

    (async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        // Route through /api/solana to avoid browser CORS restrictions on public RPC
        const [solRes, usdcRes] = await Promise.all([
          fetch('/api/solana', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
            signal: ctrl.signal,
          }),
          fetch('/api/solana', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: 2,
              method: 'getTokenAccountsByOwner',
              params: [
                address,
                { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                { encoding: 'jsonParsed' },
              ],
            }),
            signal: ctrl.signal,
          }),
        ]);
        clearTimeout(timer);
        if (cancelled) return;

        const [solData, usdcData] = await Promise.all([solRes.json(), usdcRes.json()]);
        if (cancelled) return;

        setSolBalance((solData.result?.value ?? 0) / 1e9);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const accounts: any[] = usdcData.result?.value ?? [];
        const total = accounts.reduce((sum, acc) =>
          sum + (acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0), 0);
        setUsdcBalance(total);
      } catch {
        clearTimeout(timer);
        if (!cancelled) { setSolBalance(0); setUsdcBalance(0); }
      }
    })();
    return () => { cancelled = true; };
  }, [address]);

  // Resolve .sol / .solana domain for connected wallet
  useEffect(() => {
    if (!address) { setSolanaId(null); return; }
    fetch(`/api/domain?address=${address}`)
      .then(r => r.json())
      .then(d => setSolanaId(d.domain ?? null))
      .catch(() => {});
  }, [address]);

  // Live quote whenever swap amount changes
  useEffect(() => {
    if (!showSwap || !swapAmount) { setSwapQuote(null); return; }
    const n = parseFloat(swapAmount);
    if (!n || n <= 0) { setSwapQuote(null); return; }
    const raw = swapFromSol ? Math.round(n * 1e9) : Math.round(n * 1e6);
    setSwapQuoting(true);
    setSwapQuote(null);
    setSwapError(null);
    let live = true;
    fetch(`https://api.jup.ag/swap/v1/quote?inputMint=${swapFromSol ? SOL_MINT : USDC_MINT}&outputMint=${swapFromSol ? USDC_MINT : SOL_MINT}&amount=${raw}&slippageBps=50`)
      .then(r => r.json())
      .then(d => {
        if (!live) return;
        if (d.error || d.errorCode) {
          setSwapError(d.error ?? d.errorCode ?? 'No route found.');
        } else if (d.outAmount) {
          setSwapQuote(d);
        } else {
          setSwapError('No route found for this amount.');
        }
        setSwapQuoting(false);
      })
      .catch(e => { if (live) { setSwapError(e.message ?? 'Failed to fetch quote.'); setSwapQuoting(false); } });
    return () => { live = false; };
  }, [swapAmount, swapFromSol, showSwap]);

  const executeSwap = useCallback(async () => {
    if (!swapQuote || !address) return;
    setSwapping(true);
    setSwapError(null);
    setSwapSig(null);
    try {
      const res = await fetch('https://api.jup.ag/swap/v1/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteResponse: swapQuote, userPublicKey: address, wrapAndUnwrapSol: true }),
      });
      const { swapTransaction, error } = await res.json();
      if (error) throw new Error(error);
      const { VersionedTransaction } = await import('@solana/web3.js');
      const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const phantom = (window as any).solana;
      if (!phantom) throw new Error('Phantom wallet not found. Make sure Phantom is connected.');
      const { signature } = await phantom.signAndSendTransaction(tx);
      setSwapSig(signature);
    } catch (e: unknown) {
      setSwapError(e instanceof Error ? e.message : 'Swap failed');
    }
    setSwapping(false);
  }, [swapQuote, address]);

  const openJupiter = useCallback(() => {
    setSwapSig(null); setSwapError(null); setSwapAmount(''); setSwapQuote(null);
    setShowSwap(true);
  }, []);

  const [tickerItems, setTickerItems] = useState<TickerItem[]>([
    { label: 'SOL',  price: '—', change: '...', up: true },
    { label: 'JUP',  price: '—', change: '...', up: true },
    { label: 'JTO',  price: '—', change: '...', up: true },
    { label: 'BONK', price: '—', change: '...', up: true },
    { label: 'WIF',  price: '—', change: '...', up: true },
    { label: 'PYTH', price: '—', change: '...', up: true },
  ]);

  useEffect(() => {
    const load = () =>
      fetch('/api/prices')
        .then(r => r.json())
        .then(d => { if (d.prices) setTickerItems(d.prices); })
        .catch(() => {});

    load();
    const interval = setInterval(load, 60 * 1000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const loadMarkets = () => {
    fetch('/api/markets')
      .then(res => res.json())
      .then(data => {
        setMarkets(data.markets || []);
        setTrendingMarkets(data.trending || []);
        setLoadingMarkets(false);
      })
      .catch(() => setLoadingMarkets(false));
  };

  const loadKalshi = () => {
    fetch('/api/dflow')
      .then(res => res.json())
      .then(data => {
        setKalshiMarkets(data.markets || []);
        setTrendingKalshi(data.trending || []);
        setLoadingKalshi(false);
      })
      .catch(() => setLoadingKalshi(false));
  };

  useEffect(() => {
    loadMarkets();
    loadKalshi();
    // Auto-refresh every 90 seconds
    const interval = setInterval(() => { loadMarkets(); loadKalshi(); }, 90_000);
    return () => clearInterval(interval);
  }, []);


  const filterMarkets = (list: Market[]) =>
    list.filter(m => {
      const matchCat = activeCategory === 'all' || m.category === activeCategory;
      const matchSearch = search === '' || m.question.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });

  const filterKalshi = (list: KalshiMarket[]) =>
    list.filter(m => {
      const matchCat = activeCategory === 'all' || m.category === activeCategory;
      const matchSearch = search === '' || m.question.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });

  const filteredPolymarket = filterMarkets(markets);
  const filteredKalshi = filterKalshi(kalshiMarkets);

  const sources = [
    { key: 'all', label: 'All Sources' },
    { key: 'polymarket', label: 'Polymarket' },
    { key: 'kalshi', label: 'Kalshi' },
  ] as const;

  const categoryFilters = [
    { key: 'all', label: 'All' },
    { key: 'politics', label: 'Politics' },
    { key: 'sports', label: 'Sports' },
    { key: 'crypto', label: 'Crypto' },
    { key: 'general', label: 'General' },
  ];

  const sideNavItems = [
    {
      label: 'Markets',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: 'Signals',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
    },
    {
      label: 'Portfolio',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
    },
  ];


  return (
    <div
      className={`${spaceGrotesk.className} min-h-screen text-white`}
      style={{ background: '#050505' }}
    >
      <style>{sharedStyles}</style>

      {/* Fixed Header */}
      <header
        className="fixed top-0 w-full z-50 flex items-center justify-between px-6 h-16 border-b"
        style={{ background: 'rgba(5,5,5,0.90)', backdropFilter: 'blur(24px)', borderBottomColor: 'rgba(255,255,255,0.10)', zIndex: 50 }}
      >
        <div className="flex items-center gap-6">
          <img src="/crada-logo.png" alt="Crada" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <svg className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search signals..."
              value={search}
              onChange={e => { setSearch(e.target.value); setVisiblePolymarket(ITEMS_PER_PAGE); setVisibleKalshi(ITEMS_PER_PAGE); }}
              className="bg-transparent text-sm focus:outline-none w-40"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{ color: '#4de082', border: '1px solid rgba(77,224,130,0.30)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4de082' }} />
            Live
          </div>
          {authenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-full" style={{ color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.20)', background: 'rgba(124,58,237,0.05)' }}>
                {solanaId ?? shortAddr}
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
        {/* Sidebar header */}
        <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-white">Intelligence</p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(124,58,237,0.6)' }}>V0.1-ALPHA</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4">
          {sideNavItems.map(({ label, icon }) => {
            const isActive = activeSideNav === label;
            return (
              <button
                key={label}
                onClick={() => {
                  setActiveSideNav(label);
                  if (label === 'Signals') router.push('/signals');
                }}
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

        {/* Upgrade */}
        <div className="p-6">
          <button
            onClick={() => router.push('/coming-soon')}
            className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:bg-[#7C3AED] hover:text-white"
            style={{ border: '1px solid rgba(124,58,237,0.40)', color: '#c4b5fd' }}
          >
            Upgrade to Pro
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="pt-24 pb-20 md:pb-8 px-4 sm:px-6 md:pl-72 md:pr-10 min-h-screen">

        {/* ── Portfolio View (Stitch: Crada | Portfolio Terminal) ────── */}
        {activeSideNav === 'Portfolio' && (
          <div>

            {/* Top bar */}
            <header className="flex items-center justify-between py-6 mb-8">
              <h2 className="text-white font-bold tracking-tight" style={{ fontSize: '32px', lineHeight: '1.2' }}>Terminal Dashboard</h2>
              <div className="hidden md:flex items-center gap-6">
                <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Search markets..." className="bg-transparent text-sm focus:outline-none w-40" style={{ color: 'rgba(255,255,255,0.7)' }} />
                </div>
              </div>
            </header>

            <div className="grid grid-cols-12 gap-6">

              {/* ── Wallet Card — col-span-8 ── */}
              <section className="col-span-12 lg:col-span-8">
                <div className="glass-card rounded-2xl p-8 flex flex-col h-full" style={{ boxShadow: '0 0 40px rgba(124,58,237,0.15)' }}>
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>MY WALLET</p>
                      {solanaId && (
                        <p className="text-xl font-bold mb-2" style={{ color: '#c4b5fd' }}>{solanaId}</p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-mono px-3 py-1.5 rounded-lg" style={{ color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', letterSpacing: '0.1em' }}>{shortAddr}</span>
                        {address && (
                          <button onClick={handleCopy} className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {copied ? <span className="text-[10px] text-green-400">Copied!</span> : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            )}
                          </button>
                        )}
                        <div className="px-3 py-1 rounded-full" style={{ border: '1px solid rgba(124,58,237,0.5)', background: 'rgba(124,58,237,0.1)' }}>
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#d2bbff' }}>{address ? walletLabel.toUpperCase() : 'NOT CONNECTED'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#7c3aed' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    </div>
                  </div>
                  <div className="mt-auto mb-8">
                    <h3 className="text-white font-bold leading-none mb-4" style={{ fontSize: '56px', letterSpacing: '-0.02em' }}>
                      {usdcBalance === null && address ? <span style={{ fontSize: '40px', opacity: 0.4 }}>Loading…</span> : `$${totalBalance.toFixed(2)}`}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px' }}>USDC · Solana</span>
                      <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>{displaySol} SOL</span>
                    </div>
                    {isEmbedded && (
                      <p className="mt-3 text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Your embedded wallet is secured and custodied by Privy. Export your key anytime in settings.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <button onClick={() => setShowMoonPay(true)} className="flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-95" style={{ background: '#7c3aed', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest">ADD FUNDS</span>
                    </button>
                    <button onClick={openJupiter} className="flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-white transition-all hover:bg-white/15 active:scale-95" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest">SWAP</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* ── Network Status Visual — col-span-4 ── */}
              <section className="col-span-12 lg:col-span-4">
                <div className="glass-card rounded-2xl overflow-hidden h-full relative" style={{ minHeight: '280px' }}>
                  <img
                    src="https://lh3.googleusercontent.com/aida/ADBb0uj5SDWj6k1XWBz6oP_sqQF4fel7I3xKIQmSp0P6rvYBnMF73ZxuA4RGJIVckWOxfWPQWZstgFzMnP93UhizFKbIIjWn6yTnVFk1GZ_h4SHny5TaZw1vZ_2HxQ3ynQ5_z8et8mQ22462Ywz1Uopmbys8uEdbhCo231s1JAPtwlY5qHye7PQMjpC-W8L2l3OqKypD354sTPrnRDecREQGRgLtZ55cJVcMJapbpBdbXCCWvRMLR_MwXZP4tks4MUm1k6-LFuhYrwt8"
                    alt="Market Density Map"
                    className="w-full h-full object-cover absolute inset-0"
                    style={{ opacity: 0.6, mixBlendMode: 'screen' }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, black 0%, transparent 60%)' }} />
                  <div className="absolute bottom-6 left-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>NETWORK STATUS</p>
                    <p className="text-lg font-bold" style={{ color: '#4de082' }}>Solana Mainnet: 2,492 TPS</p>
                  </div>
                </div>
              </section>

              {/* ── Quick Actions — full width ── */}
              <section className="col-span-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Buy Crypto', sub: 'Onramp via MoonPay', onClick: () => setShowMoonPay(true), icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
                    { label: 'Swap', sub: 'Jupiter Aggregator', onClick: openJupiter, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg> },
                    { label: 'Receive', sub: 'Copy wallet address', onClick: handleCopy, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg> },
                  ].map(action => (
                    <button key={action.label} onClick={action.onClick} className="glass-card p-6 rounded-xl flex items-center gap-4 cursor-pointer group hover:bg-white/10 transition-all active:scale-[0.98] text-left w-full" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors group-hover:text-white" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
                        {action.icon}
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg">{action.label}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{action.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Open Positions — col-span-7 ── */}
              <section className="col-span-12 lg:col-span-7">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-2xl">Open Positions</h3>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.4)' }}>1 ACTIVE</span>
                </div>
                <div className="space-y-4">
                  {/* Active position card */}
                  <div className="glass-card p-4 rounded-xl group hover:border-violet-500/50 transition-colors" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(77,224,130,0.10)', color: '#4de082', border: '1px solid rgba(77,224,130,0.20)' }}>YES</span>
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.4)' }}>PREDICTION MARKET</span>
                        </div>
                        <h4 className="text-white font-bold text-lg leading-tight">Will BTC reach $100k before May 2024?</h4>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-white font-bold text-xl">$8.75</p>
                        <p className="text-sm font-bold" style={{ color: '#4de082' }}>+ $1.25 (14.2%)</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>SIZE</p>
                        <p className="text-sm font-bold text-white" style={{ letterSpacing: '0.1em' }}>12.50 CONTRACTS</p>
                      </div>
                      <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>PROBABILITY</p>
                        <p className="text-sm font-bold text-white" style={{ letterSpacing: '0.1em' }}>64% MARKET ODDS</p>
                      </div>
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div className="h-full rounded-full" style={{ width: '64%', background: '#7c3aed', boxShadow: '0 0 10px #7c3aed' }} />
                    </div>
                  </div>

                  {/* Empty limit orders state */}
                  <div className="glass-card p-12 rounded-xl flex flex-col items-center justify-center text-center" style={{ border: '1px dashed rgba(255,255,255,0.1)', opacity: 0.6 }}>
                    <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>NO LIMIT ORDERS</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Your active limit orders will appear here.</p>
                  </div>
                </div>
              </section>

              {/* ── Recent Activity — col-span-5 ── */}
              <section className="col-span-12 lg:col-span-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-2xl">Recent Activity</h3>
                  <button className="text-[10px] font-bold uppercase tracking-[0.2em] hover:underline" style={{ color: '#d2bbff' }}>VIEW ALL</button>
                </div>
                <div className="glass-card rounded-xl overflow-hidden divide-y divide-white/5" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  {/* Item 1 — Buy */}
                  <div className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(77,224,130,0.10)', border: '1px solid rgba(77,224,130,0.10)', color: '#4de082' }}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Bought YES · Tech Layoffs 2026</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.4)' }}>2 HOURS AGO</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-white text-sm font-bold" style={{ letterSpacing: '0.1em' }}>-$10.00 USDC</p>
                        <p className="text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>CONFIRMED</p>
                      </div>
                      <button style={{ color: 'rgba(255,255,255,0.2)' }} className="hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </button>
                    </div>
                  </div>
                  {/* Item 2 — Deposit */}
                  <div className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.10)', color: '#c4b5fd' }}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Funds Added · Phantom</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.4)' }}>5 HOURS AGO</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#4de082', letterSpacing: '0.1em' }}>+$50.00 USDC</p>
                        <p className="text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>CONFIRMED</p>
                      </div>
                      <button style={{ color: 'rgba(255,255,255,0.2)' }} className="hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </button>
                    </div>
                  </div>
                  {/* Item 3 — Sell */}
                  <div className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.10)', color: '#f87171' }}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Sold NO · ETH $5k Q1</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.4)' }}>1 DAY AGO</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '0.1em' }}>+$24.50 USDC</p>
                        <p className="text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>CONFIRMED</p>
                      </div>
                      <button style={{ color: 'rgba(255,255,255,0.2)' }} className="hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </button>
                    </div>
                  </div>
                  {/* Governance Alert — inside activity card */}
                  <div className="p-4 relative overflow-hidden" style={{ background: 'rgba(124,58,237,0.05)' }}>
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold" style={{ color: '#c4b5fd' }}>GOVERNANCE ALERT</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Vote on Proposal #082: Fee Restructuring</p>
                      </div>
                      <button className="text-[10px] px-3 py-1 rounded font-bold text-white" style={{ background: '#7c3aed' }}>VOTE</button>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>
        )}

        {activeSideNav !== 'Portfolio' && <>

        {/* Ticker strip */}
        <div className="glass-card rounded-xl overflow-hidden mb-10" style={{ position: 'relative' }}>
          <div className="py-3 overflow-hidden">
            <div className="ticker-content whitespace-nowrap">
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <span key={i} className="inline-flex items-center gap-2 px-6 text-xs font-mono">
                  <span className="font-bold text-white">{item.label}</span>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{item.price}</span>
                  <span style={{ color: item.up ? '#4de082' : '#f87171' }}>{item.change}</span>
                  <span className="mx-2" style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                </span>
              ))}
            </div>
          </div>
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded"
            style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(77,224,130,0.15)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4de082' }} />
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Live
            </span>
          </div>
        </div>

        {/* ── Trending Section ─────────────────────────────────────── */}
        {(trendingMarkets.length > 0 || trendingKalshi.length > 0) && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: '#7C3AED' }}>🔥 Trending Now</span>
              <div className="h-px flex-1" style={{ background: 'rgba(124,58,237,0.15)' }} />
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>by 24h volume</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {/* Merge Polymarket + Kalshi trending, sort by 24h volume */}
              {[
                ...trendingMarkets.map(m => ({ type: 'poly' as const, id: m.id, question: m.question, pct: Math.round(m.probability * 100), vol24h: m.volume24h ?? 0, image: m.image, priceChange: m.priceChange ?? null, href: '/market/' + m.id, external: false })),
                ...trendingKalshi.map(m => ({ type: 'kalshi' as const, id: m.id, question: m.question, pct: m.yesPct ?? 50, vol24h: m.volume24h, image: m.image, priceChange: null, href: '/kalshi/' + m.id, external: false })),
              ]
                .sort((a, b) => b.vol24h - a.vol24h)
                .map(item => {
                  const volStr = item.vol24h >= 1_000_000 ? `$${(item.vol24h / 1_000_000).toFixed(1)}M` : item.vol24h >= 1_000 ? `$${(item.vol24h / 1_000).toFixed(0)}K` : `$${item.vol24h}`;
                  return (
                    <a
                      key={item.type + item.id}
                      href={item.external ? item.href : undefined}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noreferrer' : undefined}
                      onClick={!item.external ? (e) => { e.preventDefault(); router.push(item.href); } : undefined}
                      className="cursor-pointer flex-shrink-0 rounded-2xl overflow-hidden flex flex-col transition-all"
                      style={{ width: '220px', background: 'rgba(20,20,28,0.95)', border: '1px solid rgba(124,58,237,0.18)', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.18)')}
                    >
                      {item.image && (
                        <div className="h-20 overflow-hidden relative flex-shrink-0">
                          <img src={item.image} alt="" className="w-full h-full object-cover opacity-70" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,14,20,0.9), transparent 60%)' }} />
                          <span className="absolute top-2 right-2 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: item.type === 'poly' ? 'rgba(0,144,255,0.25)' : 'rgba(124,58,237,0.30)', color: item.type === 'poly' ? '#60a5fa' : '#c4b5fd', border: `1px solid ${item.type === 'poly' ? 'rgba(96,165,250,0.3)' : 'rgba(196,181,253,0.3)'}` }}>
                            {item.type === 'poly' ? 'Polymarket' : 'Kalshi'}
                          </span>
                        </div>
                      )}
                      {!item.image && (
                        <div className="h-6 flex items-center justify-end px-2 pt-2 flex-shrink-0">
                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: item.type === 'poly' ? 'rgba(0,144,255,0.15)' : 'rgba(124,58,237,0.20)', color: item.type === 'poly' ? '#60a5fa' : '#c4b5fd' }}>
                            {item.type === 'poly' ? 'Polymarket' : 'Kalshi'}
                          </span>
                        </div>
                      )}
                      <div className="p-3 flex flex-col gap-2 flex-1">
                        <p className="text-xs font-semibold leading-snug" style={{ color: 'rgba(255,255,255,0.9)', ...lineClamp2 }}>
                          {item.question}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-sm font-bold font-mono" style={{ color: item.pct >= 50 ? '#4ade80' : '#f87171' }}>{item.pct}{item.type === 'poly' ? '%' : '¢'}</span>
                          <div className="flex items-center gap-2">
                            {item.priceChange != null && (
                              <span className="text-[10px] font-bold" style={{ color: item.priceChange >= 0 ? '#4ade80' : '#f87171' }}>
                                {item.priceChange >= 0 ? '▲' : '▼'} {Math.abs(Math.round(item.priceChange * 100))}%
                              </span>
                            )}
                            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{volStr}</span>
                          </div>
                        </div>
                        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.pct >= 50 ? '#4ade80' : '#f87171' }} />
                        </div>
                      </div>
                    </a>
                  );
                })}
            </div>
          </section>
        )}

        {/* Source tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {sources.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setActiveSource(key); setVisiblePolymarket(ITEMS_PER_PAGE); setVisibleKalshi(ITEMS_PER_PAGE); }}
              className="px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
              style={activeSource === key ? {
                background: '#7C3AED', color: 'white',
              } : {
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.50)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Category sub-filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categoryFilters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setActiveCategory(key); setVisiblePolymarket(ITEMS_PER_PAGE); setVisibleKalshi(ITEMS_PER_PAGE); }}
              className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
              style={activeCategory === key ? {
                background: 'rgba(124,58,237,0.25)',
                border: '1px solid rgba(124,58,237,0.50)',
                color: '#c4b5fd',
              } : {
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Polymarket Section ───────────────────────────────────────── */}
        {(activeSource === 'all' || activeSource === 'polymarket') && (
          <section className={activeSource === 'all' ? 'mb-14' : ''}>
            {activeSource === 'all' && (
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-white">Polymarket</h2>
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>500+ markets</span>
              </div>
            )}
            {loadingMarkets ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading markets...</p>
            ) : filteredPolymarket.length === 0 ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No markets found.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {filteredPolymarket.slice(0, visiblePolymarket).map(market => {
                    const isMulti = market.outcomes && market.outcomes.length > 2;
                    const yesPct = Math.round(market.probability * 100);
                    const v = market.volume24h ?? market.volume;
                    const volStr = v >= 1_000_000
                      ? `$${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                      ? `$${(v / 1_000).toFixed(0)}K`
                      : `$${v}`;
                    return (
                      <a
                        key={market.id}
                        href={undefined}
                        onClick={(e) => { e.preventDefault(); router.push('/market/' + market.id); }}
                        className="group cursor-pointer flex flex-col rounded-2xl overflow-hidden transition-all"
                        style={{ background: 'rgba(20,20,28,0.9)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                      >
                        {/* Image */}
                        <div className="relative overflow-hidden" style={{ height: '120px', background: '#111' }}>
                          {market.image ? (
                            <img
                              src={market.image}
                              alt={market.question}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                              <span className="text-2xl opacity-20">◈</span>
                            </div>
                          )}
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,14,20,0.85) 0%, transparent 60%)' }} />
                          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                            <span className="text-[9px] font-semibold capitalize px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {market.category}
                            </span>
                            {isMulti && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.4)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.4)' }}>
                                {market.outcomes!.length} outcomes
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col gap-3">
                          {/* Title */}
                          <p className="text-sm font-semibold leading-snug" style={{ color: 'rgba(255,255,255,0.92)', ...lineClamp2 }}>
                            {market.question}
                          </p>

                          {isMulti ? (
                            /* Multi-outcome: ranked list of top outcomes */
                            <div className="flex flex-col gap-1.5">
                              {market.outcomes!.slice(0, 4).map((o, i) => {
                                const pct = Math.round(o.probability * 100);
                                const colors = ['#a78bfa', '#60a5fa', '#34d399', '#fb923c'];
                                const bgColors = ['rgba(167,139,250,0.12)', 'rgba(96,165,250,0.10)', 'rgba(52,211,153,0.10)', 'rgba(251,146,60,0.10)'];
                                return (
                                  <div key={i} className="flex items-center gap-2">
                                    <div className="flex-1 relative rounded-md overflow-hidden" style={{ height: 22, background: 'rgba(255,255,255,0.04)' }}>
                                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: bgColors[i], transition: 'width 0.6s ease' }} />
                                      <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                        {o.name}
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-bold font-mono w-8 text-right" style={{ color: colors[i] }}>{pct}%</span>
                                  </div>
                                );
                              })}
                              {market.outcomes!.length > 4 && (
                                <p className="text-[9px] text-right" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                  +{market.outcomes!.length - 4} more
                                </p>
                              )}
                            </div>
                          ) : (
                            /* Binary: YES / NO panels */
                            <div className="grid grid-cols-2 gap-1.5">
                              <a
                                href={market.tradeUrl || 'https://polymarket.com'}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="rounded-xl p-2.5 text-center transition-all hover:brightness-110"
                                style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.20)' }}
                              >
                                <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(74,222,128,0.6)' }}>Yes</p>
                                <p className="text-base font-bold font-mono" style={{ color: '#4ade80' }}>{yesPct}¢</p>
                              </a>
                              <a
                                href={market.tradeUrl || 'https://polymarket.com'}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="rounded-xl p-2.5 text-center transition-all hover:brightness-110"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
                              >
                                <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(248,113,113,0.6)' }}>No</p>
                                <p className="text-base font-bold font-mono" style={{ color: '#f87171' }}>{100 - yesPct}¢</p>
                              </a>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between text-[10px] pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
                            <span>{volStr} 24h</span>
                            {market.priceChange != null && (
                              <span style={{ color: market.priceChange >= 0 ? '#4ade80' : '#f87171' }}>
                                {market.priceChange >= 0 ? '▲' : '▼'} {Math.abs(Math.round(market.priceChange * 100))}%
                              </span>
                            )}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
                {visiblePolymarket < filteredPolymarket.length && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setVisiblePolymarket(v => v + ITEMS_PER_PAGE)}
                      className="px-10 py-3 glass-card rounded-lg text-xs font-bold uppercase tracking-[0.25em] text-white transition-all hover:bg-white/10"
                    >
                      Show More · {filteredPolymarket.length - visiblePolymarket} remaining
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ── Kalshi Section (via DFlow) ───────────────────────────────── */}
        {(activeSource === 'all' || activeSource === 'kalshi') && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-white">Kalshi</h2>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(124,58,237,0.7)' }}>◎ via DFlow</span>
              </div>
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>on-chain · Solana</span>
            </div>
            {loadingKalshi ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading Kalshi markets...</p>
            ) : filteredKalshi.length === 0 ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No active Kalshi markets right now.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {filteredKalshi.slice(0, visibleKalshi).map(market => {
                    const closeDate = new Date(market.closeTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const isFinalized = market.status === 'finalized';
                    const yesPrice = isFinalized ? (market.result === 'yes' ? 100 : 0) : (market.yesPct ?? null);
                    const noPrice = isFinalized ? (market.result === 'no' ? 100 : 0) : (market.noPct ?? null);
                    const volStr = market.volume >= 1_000_000
                      ? `$${(market.volume / 1_000_000).toFixed(1)}M`
                      : market.volume >= 1_000
                      ? `$${(market.volume / 1_000).toFixed(0)}K`
                      : `$${market.volume}`;
                    return (
                      <div
                        key={market.id}
                        onClick={() => router.push('/kalshi/' + market.id)}
                        className="group cursor-pointer flex flex-col rounded-2xl overflow-hidden transition-all"
                        style={{ background: 'rgba(20,20,28,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                      >
                        {/* Image */}
                        <div className="relative overflow-hidden" style={{ height: '120px', background: '#111' }}>
                          {market.image ? (
                            <img
                              src={market.image}
                              alt={market.question}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                              <span className="text-2xl opacity-20">◈</span>
                            </div>
                          )}
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,14,20,0.85) 0%, transparent 60%)' }} />
                          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                            <span className="text-[9px] font-semibold capitalize px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {market.category}
                            </span>
                          </div>
                          <div className="absolute top-2 right-2">
                            {isFinalized ? (
                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: market.result === 'yes' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: market.result === 'yes' ? '#4ade80' : '#f87171', border: `1px solid ${market.result === 'yes' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                                {market.result ? `${market.result.toUpperCase()} ✓` : 'Resolved'}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
                                <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#4ade80' }} /> Live
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col gap-3">
                          {/* Title */}
                          <p className="text-sm font-semibold leading-snug" style={{ color: 'rgba(255,255,255,0.92)', ...lineClamp2 }}>
                            {market.question}
                          </p>

                          {/* YES / NO price panels */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <a
                              href={market.tradeUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="rounded-xl p-2.5 text-center transition-all hover:brightness-110"
                              style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.20)' }}
                            >
                              <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(74,222,128,0.6)' }}>Yes</p>
                              <p className="text-base font-bold font-mono" style={{ color: '#4ade80' }}>
                                {yesPrice != null ? `${yesPrice}¢` : '—'}
                              </p>
                            </a>
                            <a
                              href={market.tradeUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="rounded-xl p-2.5 text-center transition-all hover:brightness-110"
                              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
                            >
                              <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(248,113,113,0.6)' }}>No</p>
                              <p className="text-base font-bold font-mono" style={{ color: '#f87171' }}>
                                {noPrice != null ? `${noPrice}¢` : '—'}
                              </p>
                            </a>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-[10px] pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
                            <span>{volStr} Vol.</span>
                            <span>{isFinalized ? 'Closed' : `Ends ${closeDate}`}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {visibleKalshi < filteredKalshi.length && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setVisibleKalshi(v => v + ITEMS_PER_PAGE)}
                      className="px-10 py-3 glass-card rounded-lg text-xs font-bold uppercase tracking-[0.25em] text-white transition-all hover:bg-white/10"
                    >
                      Show More · {filteredKalshi.length - visibleKalshi} remaining
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
        </>}
      </main>


      {/* MoonPay modal */}
      {showMoonPay && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowMoonPay(false); }}
        >
          <div className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden" style={{ background: '#0a0a0f', border: '1px solid rgba(124,58,237,0.3)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div>
                <h3 className="text-white font-bold text-lg">Buy Crypto</h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Powered by MoonPay</p>
              </div>
              <button onClick={() => setShowMoonPay(false)} style={{ color: 'rgba(255,255,255,0.4)' }} className="hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <iframe
              src={`https://buy-sandbox.moonpay.com?apiKey=${process.env.NEXT_PUBLIC_MOONPAY_API_KEY}&currencyCode=usdc_sol&walletAddress=${address ?? ''}&colorCode=%237c3aed&theme=dark`}
              className="w-full"
              style={{ height: '560px', border: 'none' }}
              allow="accelerometer; autoplay; camera; gyroscope; payment"
            />
          </div>
        </div>
      )}

      {/* ── In-app Swap Modal ── */}
      {showSwap && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowSwap(false); }}
        >
          <div className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden" style={{ background: '#0d0d14', border: '1px solid rgba(124,58,237,0.3)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div>
                <h3 className="text-white font-bold text-lg">Swap</h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Powered by Jupiter</p>
              </div>
              <button onClick={() => setShowSwap(false)} style={{ color: 'rgba(255,255,255,0.4)' }} className="hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              {/* From */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>You pay</p>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <span className="text-sm font-bold text-white">{swapFromSol ? 'SOL' : 'USDC'}</span>
                  </div>
                  <input
                    type="number" min="0" placeholder="0.00" value={swapAmount}
                    onChange={e => setSwapAmount(e.target.value)}
                    className="flex-1 bg-transparent text-white text-xl font-bold focus:outline-none text-right"
                  />
                </div>
                <p className="text-[10px] mt-2 text-right" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Balance: {swapFromSol ? `${displaySol} SOL` : `$${totalBalance.toFixed(2)} USDC`}
                </p>
              </div>
              {/* Flip */}
              <div className="flex justify-center">
                <button
                  onClick={() => { setSwapFromSol(s => !s); setSwapAmount(''); setSwapQuote(null); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' }}
                >
                  <svg className="w-4 h-4" style={{ color: '#c4b5fd' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                </button>
              </div>
              {/* To */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>You receive</p>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <span className="text-sm font-bold text-white">{swapFromSol ? 'USDC' : 'SOL'}</span>
                  </div>
                  <div className="flex-1 text-right">
                    {swapQuoting
                      ? <span className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>…</span>
                      : swapQuote
                        ? <span className="text-xl font-bold text-white">{swapFromSol ? (swapQuote.outAmount / 1e6).toFixed(4) : (swapQuote.outAmount / 1e9).toFixed(6)}</span>
                        : <span className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>0.00</span>
                    }
                  </div>
                </div>
                {swapQuote && (
                  <p className="text-[10px] mt-2 text-right" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Price impact: {(parseFloat(swapQuote.priceImpactPct) * 100).toFixed(3)}% · Slippage 0.5%
                  </p>
                )}
              </div>
              {swapError && <p className="text-xs text-center" style={{ color: '#f87171' }}>{swapError}</p>}
              {swapSig && (
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(77,224,130,0.08)', border: '1px solid rgba(77,224,130,0.2)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#4de082' }}>Swap confirmed!</p>
                  <a href={`https://solscan.io/tx/${swapSig}`} target="_blank" rel="noopener noreferrer" className="text-[10px] underline" style={{ color: 'rgba(255,255,255,0.4)' }}>View on Solscan →</a>
                </div>
              )}
              {(() => {
                const n = parseFloat(swapAmount) || 0;
                const hasFunds = swapFromSol ? (solBalance ?? 0) >= n : (usdcBalance ?? 0) >= n;
                const canSwap = !!swapQuote && hasFunds && !swapping && !swapSig;
                const label = swapping ? 'Confirm in Phantom…'
                  : swapSig ? 'Done'
                  : !swapAmount ? 'Enter an amount'
                  : swapQuoting ? 'Getting quote…'
                  : !swapQuote ? 'Swap'
                  : !hasFunds ? `Insufficient ${swapFromSol ? 'SOL' : 'USDC'} balance`
                  : 'Swap';
                return (
                  <button
                    onClick={executeSwap}
                    disabled={!canSwap}
                    className="w-full py-4 rounded-xl font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                    style={{
                      background: canSwap ? '#7c3aed' : 'rgba(124,58,237,0.3)',
                      boxShadow: canSwap ? '0 0 24px rgba(124,58,237,0.5)' : 'none',
                      opacity: swapping ? 0.7 : 1,
                    }}
                  >
                    {label}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-6 left-6 right-6 z-50 flex justify-around items-center py-4"
        style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(20px)', borderRadius: '16px' }}
      >
        {[
          { label: 'Markets',   active: activeSideNav === 'Markets',   onClick: () => setActiveSideNav('Markets'),           icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { label: 'Signals',   active: false,                          onClick: () => router.push('/signals'),                icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
          { label: 'Portfolio', active: activeSideNav === 'Portfolio',  onClick: () => setActiveSideNav('Portfolio'),          icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { login, authenticated, ready } = usePrivy();

  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!authenticated) {
    return <LandingPage onEnter={login} />;
  }

  return <Dashboard />;
}
