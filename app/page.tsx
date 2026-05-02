'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
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
}

interface TickerItem {
  label: string;
  price: string;
  change: string;
  up: boolean;
}

const ITEMS_PER_PAGE = 20;

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
        className="fixed top-0 w-full z-50 flex items-center justify-between px-12 h-20 border-b"
        style={{
          background: 'rgba(5,5,5,0.80)',
          backdropFilter: 'blur(24px)',
          borderBottomColor: 'rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-10">
          <img src="/crada-logo.png" alt="Crada" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
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

        <div className="relative z-10 max-w-5xl mx-auto text-center px-6 pb-40">
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
          <h1
            className="font-bold mb-8"
            style={{ fontSize: '80px', letterSpacing: '-0.04em', lineHeight: '0.95' }}
          >
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>THE MARKET MOVED.</span>
            <br />
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>YOU DIDN&apos;T SEE IT COMING.</span>
            <br />
            <span style={{ color: '#7C3AED', fontStyle: 'italic' }}>WE DID.</span>
          </h1>

          {/* Subtitle */}
          <p
            className={`${inter.className} mx-auto mb-10 rounded-xl px-6 py-2`}
            style={{
              fontSize: '20px',
              color: 'rgba(255,255,255,0.70)',
              maxWidth: '48rem',
              background: 'rgba(0,0,0,0.20)',
              backdropFilter: 'blur(8px)',
            }}
          >
            Stop guessing. Start knowing. The intelligence layer for prediction markets built on Solana.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnter}
              className="purple-glow flex items-center gap-2 font-bold text-white rounded-2xl"
              style={{ background: '#7C3AED', paddingLeft: '48px', paddingRight: '48px', paddingTop: '24px', paddingBottom: '24px', fontSize: '16px' }}
            >
              Enter the Terminal
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            <button
              onClick={onEnter}
              className="font-bold text-white rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                paddingLeft: '48px',
                paddingRight: '48px',
                paddingTop: '24px',
                paddingBottom: '24px',
                fontSize: '16px',
              }}
            >
              View Live Signals
            </button>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="relative z-10 px-8" style={{ marginTop: '-80px' }}>
        <div className="terminal-glass rounded-3xl p-12 grid grid-cols-2 lg:grid-cols-4 gap-12 max-w-[1280px] mx-auto">
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

      {/* Features Section */}
      <section className="py-32 px-8 max-w-[1280px] mx-auto">
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
          <div className="md:col-span-7 terminal-glass rounded-3xl p-12">
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
          <div className="md:col-span-5 terminal-glass rounded-3xl p-12 flex flex-col justify-between">
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
            className="md:col-span-5 rounded-3xl p-12 relative overflow-hidden"
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
          <div className="md:col-span-7 terminal-glass rounded-3xl p-12 flex items-center relative overflow-hidden">
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
      <section className="py-32 px-8">
        <div className="max-w-[1280px] mx-auto">
          <p className="text-xs font-bold uppercase mb-6" style={{ color: '#7C3AED', letterSpacing: '0.25em' }}>OUR THESIS</p>
          <h2
            className="font-bold text-white mb-10"
            style={{ fontSize: '80px', letterSpacing: '-0.03em', lineHeight: 1.0 }}
          >
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
      <footer className="py-24 px-8" style={{ background: 'rgba(5,5,5,1)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
          { label: 'Markets', icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          ), active: true },
          { label: 'Signals', icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
          ), active: false },
          { label: 'Wallet', icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          ), active: false },
        ].map(({ label, icon, active }) => (
          <button
            key={label}
            onClick={onEnter}
            className="flex flex-col items-center gap-1"
            style={{ color: active ? '#7C3AED' : 'rgba(255,255,255,0.4)' }}
          >
            {icon}
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
  const router = useRouter();
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
  const [activeSideNav, setActiveSideNav] = useState('Markets');
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
    {
      label: 'Activity',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
          <img src="/crada-logo.png" alt="Crada" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => router.push('/')} className="text-sm font-medium" style={{ color: '#7C3AED' }}>Markets</button>
            <button onClick={() => router.push('/signals')} className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Signals</button>
          </nav>
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
                  if (label === 'Portfolio' || label === 'Activity') router.push('/coming-soon');
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
      <main className="pt-24 pb-20 md:pb-8 md:pl-72 pr-6 md:pr-10 min-h-screen">

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
                ...trendingMarkets.map(m => ({ type: 'poly' as const, id: m.id, question: m.question, pct: Math.round(m.probability * 100), vol24h: m.volume24h ?? 0, image: m.image, priceChange: m.priceChange ?? null, href: '/market/' + m.id })),
                ...trendingKalshi.map(m => ({ type: 'kalshi' as const, id: m.id, question: m.question, pct: m.yesPct ?? 50, vol24h: m.volume24h, image: m.image, priceChange: null, href: '/kalshi/' + m.id })),
              ]
                .sort((a, b) => b.vol24h - a.vol24h)
                .map(item => {
                  const volStr = item.vol24h >= 1_000_000 ? `$${(item.vol24h / 1_000_000).toFixed(1)}M` : item.vol24h >= 1_000 ? `$${(item.vol24h / 1_000).toFixed(0)}K` : `$${item.vol24h}`;
                  return (
                    <div
                      key={item.type + item.id}
                      onClick={() => router.push(item.href)}
                      className="cursor-pointer flex-shrink-0 rounded-2xl overflow-hidden flex flex-col transition-all"
                      style={{ width: '220px', background: 'rgba(20,20,28,0.95)', border: '1px solid rgba(124,58,237,0.18)' }}
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
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* Source tabs */}
        <div className="flex items-center gap-2 mb-5">
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
                    const yesPct = Math.round(market.probability * 100);
                    const v = market.volume24h ?? market.volume;
                    const volStr = v >= 1_000_000
                      ? `$${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                      ? `$${(v / 1_000).toFixed(0)}K`
                      : `$${v}`;
                    return (
                      <div
                        key={market.id}
                        onClick={() => router.push('/market/' + market.id)}
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
                          <span className="absolute bottom-2 left-3 text-[9px] font-semibold capitalize px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {market.category}
                          </span>
                        </div>

                        <div className="p-3 flex-1 flex flex-col gap-3">
                          {/* Title */}
                          <p className="text-sm font-semibold leading-snug" style={{ color: 'rgba(255,255,255,0.92)', ...lineClamp2 }}>
                            {market.question}
                          </p>

                          {/* YES / NO price panels */}
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
                      </div>
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
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-6 left-6 right-6 z-50 flex justify-around items-center py-4"
        style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(20px)', borderRadius: '16px' }}
      >
        {[
          { label: 'Markets', active: true, onClick: () => {} },
          { label: 'Signals', active: false, onClick: () => router.push('/signals') },
          { label: 'Wallet', active: false, onClick: login },
        ].map(({ label, active, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="flex flex-col items-center gap-1"
            style={{ color: active ? '#7C3AED' : 'rgba(255,255,255,0.4)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                label === 'Markets'
                  ? 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                  : label === 'Signals'
                  ? 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z'
                  : 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
              } />
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
