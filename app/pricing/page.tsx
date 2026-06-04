'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

type Plan = 'free' | 'pro' | 'max' | 'enterprise';
type Billing = 'monthly' | 'annual';

const plans = [
  {
    key: 'free' as Plan,
    name: 'Free',
    monthly: { price: '$0', period: 'forever', planId: '' },
    annual: { price: '$0', period: 'forever', planId: '' },
    description: 'Get started with prediction market intelligence',
    features: ['5 signals per day', 'Full markets feed', 'Market detail pages', 'Basic search & filters'],
    excluded: ['AI explanations', 'Telegram alerts', 'Full signals feed', 'Whale alerts'],
    cta: 'Get started',
    badge: null,
  },
  {
    key: 'pro' as Plan,
    name: 'Pro',
    monthly: { price: '$9.99', period: '/month', planId: 'pro-monthly' },
    annual: { price: '$99.90', period: '/year', planId: 'pro-annual', perMonth: '$8.33/mo' },
    description: 'For serious traders who want the edge',
    features: ['Full signals feed', '30 AI explanations / month', 'Leaderboard + follow traders', 'In-app notifications', 'Full markets feed', 'Advanced search & filters'],
    excluded: ['Telegram alerts', 'Whale alerts', 'Copy trade'],
    cta: 'Upgrade to Pro',
    badge: 'Most popular',
  },
  {
    key: 'max' as Plan,
    name: 'Max',
    monthly: { price: '$24.99', period: '/month', planId: 'max-monthly' },
    annual: { price: '$249.90', period: '/year', planId: 'max-annual', perMonth: '$20.83/mo' },
    description: 'For power users who want every edge',
    features: ['Full signals feed', '150 AI explanations / month', 'Leaderboard + follow traders', 'Telegram trade alerts', 'Copy trade button', 'Whale wallet alerts', 'Priority support'],
    excluded: [],
    cta: 'Upgrade to Max',
    badge: 'Best value',
  },
  {
    key: 'enterprise' as Plan,
    name: 'Enterprise',
    monthly: { price: 'Custom', period: 'pricing', planId: '' },
    annual: { price: 'Custom', period: 'pricing', planId: '' },
    description: 'For institutions that need API access and dedicated infrastructure',
    features: ['Everything in Max', 'Full API access', 'Custom signal thresholds', 'Dedicated support', 'Custom data feeds', 'SLA guarantee'],
    excluded: [],
    cta: 'Contact us',
    badge: null,
  },
];

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, max: 2, enterprise: 3 };

export default function PricingPage() {
  const { login, authenticated, ready, user } = usePrivy();
  const router = useRouter();
  const [billing, setBilling] = useState<Billing>('monthly');
  const [currentPlan, setCurrentPlan] = useState<Plan>('free');
  const [currentBilling, setCurrentBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<{ plan: Plan } | null>(null);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    if (!ready || !authenticated || !user?.id) return;
    fetch(`/api/subscription/status?userId=${user.id}`)
      .then(r => r.json())
      .then(d => {
        setCurrentPlan(d.plan ?? 'free');
        // Derive billing cycle from the stored plan code if available
        const planCode = d.subscription?.planCode ?? '';
        if (planCode.includes('annual') || planCode.includes('wlbat') || planCode.includes('4xqiv')) {
          setCurrentBilling('annual');
        } else if (d.plan && d.plan !== 'free') {
          setCurrentBilling('monthly');
        }
      })
      .catch(() => {});
  }, [ready, authenticated, user]);

  const handleSubscribe = async (plan: Plan) => {
    if (plan === 'free') { router.push('/'); return; }
    if (plan === 'enterprise') { window.location.href = 'mailto:hello@crada.fun?subject=Enterprise%20Plan%20Enquiry'; return; }

    if (!authenticated) { login(); return; }

    const email =
      (user?.linkedAccounts?.find((a: any) => a.type === 'email') as any)?.address ??
      user?.email?.address;

    if (!email) {
      setEmailModal({ plan });
      return;
    }

    const planId = billing === 'monthly'
      ? `${plan}-monthly`
      : `${plan}-annual`;

    await checkout(plan, email, planId);
  };

  const checkout = async (plan: Plan, email: string, planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch('/api/subscription/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan: planId, userId: user?.id }),
      });
      const data = await res.json();
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        alert('Failed to start checkout. Please try again.');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleEmailSubmit = async () => {
    if (!emailModal || !emailInput.includes('@')) return;
    const planId = billing === 'monthly' ? `${emailModal.plan}-monthly` : `${emailModal.plan}-annual`;
    setEmailModal(null);
    await checkout(emailModal.plan, emailInput.trim(), planId);
  };

  return (
    <div className={`${spaceGrotesk.className} min-h-screen text-white`} style={{ background: '#050505' }}>
      {/* Header */}
      <header
        className="fixed top-0 w-full z-50 flex items-center justify-between px-6 h-16 border-b"
        style={{ background: 'rgba(5,5,5,0.90)', backdropFilter: 'blur(24px)', borderBottomColor: 'rgba(255,255,255,0.10)' }}
      >
        <button onClick={() => router.push('/')}>
          <img src="/crada-logo.png" alt="Crada" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
        </button>
        {!authenticated && (
          <button onClick={login} className="text-xs px-4 py-1.5 rounded-full font-bold text-white" style={{ background: '#7C3AED' }}>
            Sign in
          </button>
        )}
      </header>

      <main className="pt-32 pb-24 px-4 sm:px-6 max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: '#7C3AED' }}>Pricing</p>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.30)' }}>Beta</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4" style={{ letterSpacing: '-0.03em' }}>
            Unlock your edge
          </h1>
          <p className={`${inter.className} text-base max-w-md mx-auto mb-10`} style={{ color: 'rgba(255,255,255,0.5)' }}>
            Prediction market intelligence that pays for itself on the first trade.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
            {(['monthly', 'annual'] as Billing[]).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className="relative px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                style={billing === b
                  ? { background: '#7C3AED', color: 'white' }
                  : { color: 'rgba(255,255,255,0.4)' }
                }
              >
                {b === 'monthly' ? 'Monthly' : 'Annual'}
                {b === 'annual' && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: 'rgba(77,224,130,0.2)', color: '#4de082' }}
                  >
                    Save 17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map(plan => {
            const isMax = plan.key === 'max';
            const isPro = plan.key === 'pro';
            const isEnterprise = plan.key === 'enterprise';
            const billingInfo = billing === 'monthly' ? plan.monthly : plan.annual;
            const planId = billing === 'monthly' ? `${plan.key}-monthly` : `${plan.key}-annual`;

            const currentRank = PLAN_RANK[currentPlan];
            const thisRank = PLAN_RANK[plan.key];
            const isSameTier = currentPlan === plan.key;
            const billingKnown = currentBilling !== null;
            const isSameBilling = currentBilling === billing;
            // Exact match — same tier AND same billing (or free, or billing unknown)
            const isExactCurrent = isSameTier && (plan.key === 'free' || !billingKnown || isSameBilling);
            const isSwitchToAnnual = isSameTier && plan.key !== 'free' && billingKnown && currentBilling === 'monthly' && billing === 'annual';
            const isSwitchToMonthly = isSameTier && plan.key !== 'free' && billingKnown && currentBilling === 'annual' && billing === 'monthly';
            const isDowngrade = authenticated && thisRank < currentRank;

            let ctaLabel = plan.cta;
            if (isExactCurrent) ctaLabel = 'Current plan';
            else if (isSwitchToAnnual) ctaLabel = 'Switch to Annual — Save 17%';
            else if (isSwitchToMonthly) ctaLabel = 'Switch to Monthly';
            else if (isDowngrade) ctaLabel = 'Downgrade';
            else if (loading === planId) ctaLabel = 'Redirecting...';

            return (
              <div
                key={plan.key}
                className="relative rounded-2xl p-8 flex flex-col"
                style={
                  isMax
                    ? { background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.40)' }
                    : isEnterprise
                    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }
                    : isPro
                    ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }
                    : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }
                }
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                      style={
                        isMax
                          ? { background: '#7C3AED', color: 'white' }
                          : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }
                      }
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: isMax ? '#c4b5fd' : isEnterprise ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)' }}>
                  {plan.name}
                </p>

                {/* Price */}
                <div className="mb-1">
                  <span className="text-4xl font-bold text-white">{billingInfo.price}</span>
                </div>
                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{billingInfo.period}</p>

                {/* Annual per-month breakdown */}
                {'perMonth' in billingInfo && billing === 'annual' && (
                  <p className="text-xs font-bold mb-2" style={{ color: '#4de082' }}>
                    {(billingInfo as { perMonth: string }).perMonth} · 2 months free
                  </p>
                )}

                <p className={`${inter.className} text-sm mb-8 mt-3`} style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {plan.description}
                </p>

                {/* CTA */}
                {/* Current plan badge */}
                {isSameTier && plan.key !== 'free' && (
                  <div className="absolute top-4 right-4">
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: 'rgba(77,224,130,0.12)', color: '#4de082', border: '1px solid rgba(77,224,130,0.25)' }}>
                      Current
                    </span>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (isDowngrade) { window.location.href = 'mailto:hello@crada.fun?subject=Plan%20Downgrade%20Request'; return; }
                    if (isExactCurrent) return;
                    handleSubscribe(plan.key);
                  }}
                  disabled={isExactCurrent || loading !== null}
                  className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-widest mb-8 transition-all"
                  style={
                    isExactCurrent
                      ? { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', cursor: 'default' }
                      : isSwitchToAnnual
                      ? { background: 'rgba(77,224,130,0.15)', color: '#4de082', border: '1px solid rgba(77,224,130,0.30)', opacity: loading ? 0.6 : 1 }
                      : isSwitchToMonthly
                      ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.10)' }
                      : isDowngrade
                      ? { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }
                      : isMax
                      ? { background: '#7C3AED', color: 'white', opacity: loading ? 0.6 : 1 }
                      : plan.key === 'free'
                      ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.10)' }
                      : { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', opacity: loading ? 0.6 : 1 }
                  }
                >
                  {ctaLabel}
                </button>

                {/* Features */}
                <ul className="flex flex-col gap-3 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3">
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: isMax ? '#c4b5fd' : '#4de082' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`${inter.className} text-sm`} style={{ color: 'rgba(255,255,255,0.7)' }}>{f}</span>
                    </li>
                  ))}
                  {plan.excluded.map(f => (
                    <li key={f} className="flex items-center gap-3">
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.15)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className={`${inter.className} text-sm`} style={{ color: 'rgba(255,255,255,0.2)' }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className={`${inter.className} text-center text-xs mt-12`} style={{ color: 'rgba(255,255,255,0.25)' }}>
          All prices in USD. Cancel anytime. We're in beta — reach out to hello@crada.fun if you have any issues.
        </p>
      </main>

      {/* Email modal for wallet-only users */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.10)' }}>
            <h3 className="text-lg font-bold text-white mb-2">Enter your email</h3>
            <p className={`${inter.className} text-sm mb-6`} style={{ color: 'rgba(255,255,255,0.4)' }}>
              We need your email to process payment. It won&apos;t change how you log in.
            </p>
            <input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none mb-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setEmailModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleEmailSubmit}
                disabled={!emailInput.includes('@')}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: '#7C3AED', opacity: emailInput.includes('@') ? 1 : 0.4 }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
