'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Space_Grotesk, Inter } from 'next/font/google';

const sg = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

const STORAGE_KEY = 'crada_access';

export default function ComingSoonPage() {
  const router = useRouter();
  const [stage, setStage] = useState<'gate' | 'enter'>('gate');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  // If already unlocked, send straight through
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'true') router.replace('/');
  }, [router]);

  // Blinking cursor effect
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: input.trim() }),
      });
      if (res.ok) {
        localStorage.setItem(STORAGE_KEY, 'true');
        router.replace('/');
      } else if (res.status === 503) {
        setError('Access system offline.');
      } else {
        setError('Invalid code. Try again.');
      }
    } catch {
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  }

  const cursor = tick % 2 === 0 ? '▌' : ' ';

  return (
    <div
      className={`${sg.className} min-h-screen flex flex-col items-center justify-center relative overflow-hidden`}
      style={{ background: '#050505', color: 'white' }}
    >
      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Purple glow orb */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: '600px', height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center text-center">

        {/* Back to site */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-10 text-xs transition-opacity hover:opacity-70 self-start"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to site
        </button>

        {/* Logo */}
        <img
          src="/crada-logo.png"
          alt="Crada"
          className="mb-10"
          style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
        />

        {stage === 'gate' ? (
          <>
            {/* Status badge */}
            <div
              className="flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ border: '1px solid rgba(124,58,237,0.30)', background: 'rgba(124,58,237,0.08)', color: '#c4b5fd' }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#7C3AED' }} />
              System Initializing
            </div>

            {/* Headline */}
            <h1
              className="font-bold text-white mb-4 leading-tight"
              style={{ fontSize: '52px', letterSpacing: '-0.02em' }}
            >
              Coming Soon
            </h1>
            <p className={`${inter.className} mb-10`} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '17px', lineHeight: '1.6' }}>
              The intelligence layer for prediction markets.<br />
              Know before the market does.
            </p>

            {/* Terminal readouts */}
            <div
              className={`${inter.className} w-full rounded-xl p-5 mb-10 space-y-2 text-left`}
              style={{ background: 'rgba(0,0,0,0.60)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'monospace', fontSize: '11px' }}
            >
              {[
                ['STATUS', 'CALIBRATING_MARKET_SIGNALS'],
                ['NEURAL_LINK', 'CrAdA…7c3a'],
                ['ENCRYPTION', 'AES-256-GCM'],
                ['SECURE_CHANNEL', 'INITIATED'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>{k}</span>
                  <span style={{ color: '#7C3AED' }}>{v}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>TERMINAL</span>
                <span style={{ color: '#4de082' }}>READY{cursor}</span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => setStage('enter')}
              className="w-full py-4 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 mb-4"
              style={{ background: '#7C3AED', boxShadow: '0 0 24px rgba(124,58,237,0.35)' }}
            >
              Request Access
            </button>
            <p className={`${inter.className} text-xs`} style={{ color: 'rgba(255,255,255,0.2)' }}>
              Have a code? Click above to enter it.
            </p>
          </>
        ) : (
          <>
            {/* Back arrow */}
            <button
              onClick={() => { setStage('gate'); setError(''); setInput(''); }}
              className="flex items-center gap-2 mb-8 text-xs transition-opacity hover:opacity-70"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div
              className="flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ border: '1px solid rgba(124,58,237,0.30)', background: 'rgba(124,58,237,0.08)', color: '#c4b5fd' }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure Access
            </div>

            <h2 className="font-bold text-white mb-2" style={{ fontSize: '36px', letterSpacing: '-0.02em' }}>
              Enter Access Code
            </h2>
            <p className={`${inter.className} mb-10`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>
              Stop guessing. Start knowing.
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Access code or email"
                  value={input}
                  onChange={e => { setInput(e.target.value); setError(''); }}
                  autoFocus
                  className="w-full rounded-xl px-4 py-4 text-sm text-white focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${error ? 'rgba(248,113,113,0.50)' : 'rgba(255,255,255,0.10)'}`,
                    letterSpacing: '0.05em',
                  }}
                />
              </div>

              {error && (
                <p className={`${inter.className} text-xs`} style={{ color: '#f87171' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-full py-4 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#7C3AED', boxShadow: '0 0 24px rgba(124,58,237,0.35)' }}
              >
                {loading ? 'Verifying…' : 'Unlock Access'}
              </button>
            </form>

            <p className={`${inter.className} text-xs mt-8`} style={{ color: 'rgba(255,255,255,0.15)' }}>
              Authorised personnel only · Crada Intelligence Terminal
            </p>
          </>
        )}
      </div>

      {/* Footer */}
      <div
        className={`${inter.className} absolute bottom-6 text-[10px] tracking-widest uppercase`}
        style={{ color: 'rgba(255,255,255,0.12)', fontFamily: 'monospace' }}
      >
        CRADA // PREDICTION_INTELLIGENCE // {new Date().getFullYear()}
      </div>
    </div>
  );
}
