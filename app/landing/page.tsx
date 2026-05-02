'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

export default function LandingPage() {
  const { login, authenticated } = usePrivy();
  const router = useRouter();

  function handleEnterTerminal() {
    if (authenticated) {
      router.push('/');
    } else {
      login();
    }
  }

  return (
    <div className={`${spaceGrotesk.className} bg-black text-[#e2e2e2] overflow-x-hidden min-h-screen`}>
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .glow-purple {
          filter: drop-shadow(0 0 15px rgba(124, 58, 237, 0.3));
        }
        .hero-gradient {
          background: radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.2) 0%, rgba(0, 0, 0, 0) 80%);
        }
        .live-pulse {
          box-shadow: 0 0 8px #4ade80;
        }
        .warp-speed {
          background:
            radial-gradient(1px 1px at 20% 30%, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 40% 70%, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 50% 80%, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 80% 40%, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 90% 10%, #fff, rgba(0,0,0,0));
          background-size: 200% 200%;
          animation: warp 60s linear infinite;
        }
        @keyframes warp {
          from { transform: scale(1); }
          to { transform: scale(1.5); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .animate-ping {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-10 h-16 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-black tracking-tighter text-white uppercase">CRADA</span>
          <nav className="hidden md:flex items-center gap-6">
            <a href="/" className="text-[#7C3AED] font-bold tracking-tight hover:bg-white/5 transition-all px-3 py-1 rounded">
              Markets
            </a>
            <a href="/#signals" className="text-white/60 tracking-tight hover:text-white transition-all">
              Signals
            </a>
            <a href="/#activity" className="text-white/60 tracking-tight hover:text-white transition-all">
              Activity
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-1.5 gap-2">
            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="bg-transparent border-none outline-none text-sm w-48 text-white placeholder-white/20"
              placeholder="Search markets..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleEnterTerminal}
              className="bg-[#7C3AED] text-white px-5 py-2 rounded-full font-bold text-sm transition-all duration-200 hover:brightness-110 active:scale-95"
            >
              {authenticated ? 'Open Terminal' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </header>

      <main className="pt-16">

        {/* Hero */}
        <section className="relative min-h-[921px] flex items-center justify-center overflow-hidden px-10">
          <div className="absolute inset-0 hero-gradient -z-20" />
          <div className="absolute inset-0 warp-speed opacity-30 -z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] opacity-40 pointer-events-none">
            <div
              className="w-full h-full bg-no-repeat bg-cover bg-center mix-blend-screen"
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDt9s9Vv2G62y8uIcanvMCPm0DYzLpve0rQDUdtgT2nIgGDNicUwSciH5ankq9AmJHkKEV3_0ChSY5KxH6iNPxbg0ucBgi1ESYZPO-lvETKY1BgWih7MUPFl1rWt3ogIqGGHH7vsiCXmlKyc1BwfscaW1eVT5QJpqobVGoeoDKvAvV0ejMZCdYwPdLKzfqMwKMMkPJ-uHbyXLGa5zkJohzwGjrKn14qxi_wcLdUjSGGlfbOMd9axZatidNjmmbN8YgPFHyVh9eXeok')" }}
            />
          </div>

          <div className="relative z-10 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold uppercase tracking-widest mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4de082] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4de082] live-pulse" />
              </span>
              Intelligence Terminal v0.1-Alpha
            </div>

            <h1 className="text-[48px] leading-[1.05] tracking-[-0.02em] font-bold text-white mb-6">
              The market moved. <br />
              You didn&apos;t see it coming. <br />
              <span className="text-[#7C3AED]">We did. 👁</span>
            </h1>

            <p className={`${inter.className} text-[18px] leading-[1.6] text-white/60 max-w-2xl mx-auto mb-10`}>
              Stop guessing. Start knowing. The intelligence layer for prediction markets built on Solana.
              Access asymmetric information before the odds shift.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleEnterTerminal}
                className="px-10 py-5 bg-[#7C3AED] text-white font-bold rounded-xl text-lg hover:brightness-110 glow-purple transition-all active:scale-95"
              >
                Enter the Terminal
              </button>
              <a
                href="/"
                className="px-10 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-xl text-lg hover:bg-white/10 transition-all active:scale-95"
              >
                View Live Signals
              </a>
            </div>
          </div>
        </section>

        {/* Stats Banner */}
        <section className="border-y border-white/5 bg-white/[0.02] py-12 px-10 relative z-10">
          <div className="max-w-[1440px] mx-auto flex flex-wrap justify-center md:justify-between gap-12 items-center">
            <div className="text-center md:text-left">
              <p className="text-[12px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2">Market Reach</p>
              <p className="text-[20px] tracking-[0.05em] font-bold text-white text-3xl">500+ Markets</p>
            </div>
            <div className="h-12 w-px bg-white/10 hidden md:block" />
            <div className="text-center md:text-left">
              <p className="text-[12px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2">Processing</p>
              <p className="text-[20px] tracking-[0.05em] font-bold text-white text-3xl">Real-time Signals</p>
            </div>
            <div className="h-12 w-px bg-white/10 hidden md:block" />
            <div className="text-center md:text-left">
              <p className="text-[12px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2">Infrastructure</p>
              <p className="text-[2he 0px] tracking-[0.05em] font-bold text-white text-3xl">Built on Solana</p>
            </div>
            <div className="h-12 w-px bg-white/10 hidden md:block" />
            <div className="text-center md:text-left">
              <p className="text-[12px] font-bold tracking-[0.2em] uppercase text-[#7C3AED] mb-2">Status</p>
              <p className="text-[20px] tracking-[0.05em] font-bold text-white text-3xl flex items-center gap-2">
                System Online
                <svg className="w-4 h-4 text-[#4de082]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </p>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="py-32 px-10 max-w-[1440px] mx-auto relative z-10">
          <div className="mb-16">
            <h2 className="text-[32px] leading-[1.2] font-semibold text-white mb-4 uppercase tracking-tight">
              Terminal Features
            </h2>
            <div className="h-1 w-24 bg-[#7C3AED]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Whale Signal Intelligence — large */}
            <div className="md:col-span-8 glass-card rounded-3xl p-10 overflow-hidden relative group">
              <div className="relative z-10">
                <div className="text-[#7C3AED] text-5xl mb-6">👁</div>
                <h3 className="text-[24px] leading-[1.3] font-semibold text-white mb-4">
                  Whale Signal Intelligence
                </h3>
                <p className={`${inter.className} text-[16px] leading-[1.5] text-white/60 max-w-md mb-8`}>
                  Detect unusual volume and smart money flows before they hit the mainstream. Our proprietary
                  surveillance algorithms track whale wallets and sharp money movers across the Solana ecosystem.
                </p>
                <div className="flex gap-4 flex-wrap">
                  <span className="px-3 py-1 bg-[#4de082]/10 border border-[#4de082]/20 text-[#4de082] text-[10px] font-bold uppercase rounded">
                    Whale Tracking
                  </span>
                  <span className="px-3 py-1 bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-[#d2bbff] text-[10px] font-bold uppercase rounded">
                    Smart Money Flow
                  </span>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-1/2 h-full opacity-30 group-hover:opacity-50 transition-all duration-700 pointer-events-none">
                <div
                  className="w-full h-full bg-no-repeat bg-contain bg-center mix-blend-lighten scale-110 group-hover:scale-100 transition-transform duration-[2000ms]"
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBt9s9Vv2G62y8uIcanvMCPm0DYzLpve0rQDUdtgT2nIgGDNicUwSciH5ankq9AmJHkKEV3_0ChSY5KxH6iNPxbg0ucBgi1ESYZPO-lvETKY1BgWih7MUPFl1rWt3ogIqGGHH7vsiCXmlKyc1BwfscaW1eVT5QJpqobVGoeoDKvAvV0ejMZCdYwPdLKzfqMwKMMkPJ-uHbyXLGa5zkJohzwGjrKn14qxi_wcLdUjSGGlfbOMd9axZatidNjmmbN8YgPFHyVh9eXeok')", filter: 'hue-rotate(280deg) brightness(1.2)' }}
                />
              </div>
            </div>

            {/* Market Aggregation — small */}
            <div className="md:col-span-4 glass-card rounded-3xl p-10 flex flex-col justify-between group overflow-hidden relative">
              <div className="relative z-10">
                <div className="text-[#7C3AED] text-5xl mb-6">⬛⬜</div>
                <h3 className="text-[24px] leading-[1.3] font-semibold text-white mb-4">
                  Market Aggregation
                </h3>
                <p className={`${inter.className} text-[16px] leading-[1.5] text-white/60`}>
                  The unified dashboard for every bet. 500+ live markets from Polymarket, Kalshi, and leading
                  Solana protocols.
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Unified API</span>
                <svg className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>

            {/* Execution Edge — medium */}
            <div className="md:col-span-4 glass-card rounded-3xl p-10 flex flex-col group relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-[#7C3AED] text-5xl mb-6">⚡</div>
                <h3 className="text-[24px] leading-[1.3] font-semibold text-white mb-4">
                  Execution Edge
                </h3>
                <p className={`${inter.className} text-[16px] leading-[1.5] text-white/60 mb-6`}>
                  Trade directly via DFlow with AI-backed insights. Zero-latency execution on prediction
                  outcomes with automated tactile precision.
                </p>
              </div>
              <div className="mt-auto overflow-hidden rounded-xl border border-white/10 h-40 relative group-hover:border-[#7C3AED]/50 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10" />
                <div
                  className="w-full h-full bg-cover bg-center opacity-40 group-hover:opacity-60 transition-all duration-500 scale-110 group-hover:scale-100"
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDhx5EkhmEAgDWQLHy2J4JzI01ezRBVceHScpadaXzRbABvdKGnHgfjI1wxjfm4XbxZkxK-RNMcJFXxAcsqZBSW3GINhYxa1Ugaab8NegqwIYpLhuU3crPEuWvN6na0ki836e5ByYRFtLgUqQQCZ9eZHYqarFVaS_P6y5kMXVwSs-szaPSwx9psGqtsEDefy9cDsTvJNZnN1iMIoLbUzh53aOr0RSZn4Dq1JbxwcvsgS4FzgdDTSME6YlSAcosNazS3KqUPaafX27w')", filter: 'hue-rotate(20deg)' }}
                />
              </div>
            </div>

            {/* Quote card — large purple */}
            <div className="md:col-span-8 bg-[#7C3AED] rounded-3xl p-10 flex items-center relative overflow-hidden group">
              <div className="absolute inset-0 opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity">
                <div
                  className="w-full h-full bg-cover bg-center mix-blend-overlay"
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDt9s9Vv2G62y8uIcanvMCPm0DYzLpve0rQDUdtgT2nIgGDNicUwSciH5ankq9AmJHkKEV3_0ChSY5KxH6iNPxbg0ucBgi1ESYZPO-lvETKY1BgWih7MUPFl1rWt3ogIqGGHH7vsiCXmlKyc1BwfscaW1eVT5QJpqobVGoeoDKvAvV0ejMZCdYwPdLKzfqMwKMMkPJ-uHbyXLGa5zkJohzwGjrKn14qxi_wcLdUjSGGlfbOMd9axZatidNjmmbN8YgPFHyVh9eXeok')" }}
                />
              </div>
              <div className="relative z-10 max-w-lg">
                <h3 className="text-[32px] leading-[1.2] font-semibold text-white mb-2 leading-none">
                  Know before the odds move.
                </h3>
                <p className={`${inter.className} text-white/80 text-[18px] leading-[1.6]`}>
                  &ldquo;The difference between a trader and a quant is the speed of their information.
                  CRADA gives you the quant edge without the PhD.&rdquo;
                </p>
              </div>
              <div className="absolute right-10 bottom-0 top-0 flex items-center opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-1000 text-[200px] text-white select-none">
                🧠
              </div>
            </div>

          </div>
        </section>

        {/* Vision */}
        <section className="py-32 px-10 bg-white/[0.01] relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-[12px] font-bold tracking-[0.2em] uppercase text-[#7C3AED] mb-6 block">
              Our Mission
            </p>
            <p className="text-[48px] leading-[1.1] tracking-[-0.02em] font-bold text-white mb-8">
              Most people trade blind. <br />
              <span className="text-white/40">Crada changes that.</span> <br />
              Edge, delivered.
            </p>
            <div className="flex justify-center">
              <div className="w-16 h-px bg-white/10" />
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-black py-20 px-10 border-t border-white/5 relative z-10">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <span className="text-3xl font-black tracking-tighter text-white uppercase mb-6 block">CRADA</span>
            <p className={`${inter.className} text-[16px] leading-[1.5] text-white/40 max-w-sm mb-8`}>
              The premium intelligence layer for prediction markets. Built for those who demand an
              informational advantage in an uncertain world.
            </p>
            <div className="flex gap-4">
              <a
                href="https://x.com/cradaHQ"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-[#7C3AED] hover:border-[#7C3AED] transition-all"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[12px] font-bold tracking-[0.2em] uppercase text-white mb-6">Terminal</h4>
            <ul className={`${inter.className} space-y-4 text-white/40 text-[16px]`}>
              <li><a href="/" className="hover:text-white transition-colors">Markets Explorer</a></li>
              <li><a href="/" className="hover:text-white transition-colors">Signals Hub</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[12px] font-bold tracking-[0.2em] uppercase text-white mb-6">Legal</h4>
            <ul className={`${inter.className} space-y-4 text-white/40 text-[16px]`}>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Risk Disclaimer</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/20 text-xs font-bold uppercase tracking-widest">
            © 2026 CRADA INTELLIGENCE LABS
          </p>
          <p className="text-white/40 text-xs italic">&ldquo;Know before the odds move.&rdquo;</p>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center h-20 px-6 bg-black/90 backdrop-blur-lg border-t border-white/10 rounded-t-3xl">
        <a href="/" className="flex flex-col items-center justify-center text-[#7C3AED]">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3h7v7H3zm0 11h7v7H3zm11-11h7v7h-7zm0 11h7v7h-7z" />
          </svg>
          <span className="text-[10px] font-bold uppercase mt-1">Markets</span>
        </a>
        <a href="/" className="flex flex-col items-center justify-center text-white/30 hover:text-white/60">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-[10px] font-bold uppercase mt-1">Signals</span>
        </a>
        <a href="#" className="flex flex-col items-center justify-center text-white/30 hover:text-white/60">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-[10px] font-bold uppercase mt-1">Activity</span>
        </a>
        <button onClick={handleEnterTerminal} className="flex flex-col items-center justify-center text-white/30 hover:text-white/60">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-[10px] font-bold uppercase mt-1">Wallet</span>
        </button>
      </nav>

    </div>
  );
}
