'use client';

import { useEffect, useState, Suspense } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

function PricingCallbackInner() {
  const { user, ready, authenticated } = usePrivy();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [plan, setPlan] = useState<string>('');

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user?.id) {
      router.push('/');
      return;
    }

    // Poll subscription status — webhook will update Redis within a few seconds
    let attempts = 0;
    const maxAttempts = 20;

    const poll = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/subscription/status?userId=${user.id}`);
        const data = await res.json();
        if (data.plan && data.plan !== 'free') {
          setPlan(data.plan);
          setStatus('success');
          setTimeout(() => router.push('/signals'), 3000);
          return;
        }
      } catch {}

      if (attempts >= maxAttempts) {
        setStatus('error');
      } else {
        setTimeout(poll, 2000);
      }
    };

    // Give Lemon Squeezy a moment to fire the webhook before first poll
    setTimeout(poll, 2000);
  }, [ready, authenticated, user, router]);

  return (
    <div className={`${spaceGrotesk.className} min-h-screen bg-black flex items-center justify-center`}>
      <div className="text-center max-w-md px-6">
        {status === 'verifying' && (
          <>
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-6" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
            <p className="text-white font-bold text-lg mb-2">Activating your plan...</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Just a moment</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(77,224,130,0.15)', border: '1px solid rgba(77,224,130,0.3)' }}>
              <svg className="w-8 h-8" style={{ color: '#4de082' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-bold text-2xl mb-2 capitalize">Welcome to Crada {plan}.</p>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Your subscription is active. Redirecting you now...</p>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: '#7C3AED' }} />
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)' }}>
              <svg className="w-8 h-8" style={{ color: '#fb923c' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white font-bold text-xl mb-2">Payment received</p>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Your payment went through but plan activation is taking longer than usual. It will reflect shortly — if not, email us at hello@crada.fun.
            </p>
            <button onClick={() => router.push('/')} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#7C3AED' }}>
              Go to Crada
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PricingCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
      </div>
    }>
      <PricingCallbackInner />
    </Suspense>
  );
}
