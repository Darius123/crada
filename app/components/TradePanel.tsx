'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth/solana';
import { PublicKey } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';

const DFLOW_PROXY = 'https://api.eitherway.ai/api/dflow';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function pollOrderStatus(signature: string, maxTries = 60) {
  for (let i = 0; i < maxTries; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const res = await fetch(`${DFLOW_PROXY}/e.quote-api.dflow.net/order-status?signature=${signature}`);
      if (!res.ok) continue;
      const data = await res.json();
      const status = data.status;
      if (['closed', 'expired', 'failed', 'pendingClose'].includes(status)) return status;
    } catch { continue; }
  }
  return 'timeout';
}

const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Order submitted — waiting for confirmation...',
  open: 'Order live on-chain, awaiting fill...',
  pendingClose: 'Filled! Awaiting settlement...',
  closed: 'Order filled and settled.',
  expired: 'Order expired. Try again.',
  failed: 'Order failed. Please retry.',
  timeout: 'Status check timed out. Check your wallet.',
};

interface TradePanelProps {
  market: {
    id: string;
    question: string;
    probability: number;
    accounts?: Record<string, { yesMint?: string; noMint?: string }>;
    yesAsk?: number;
    noAsk?: number;
    status?: string;
  };
}

export default function TradePanel({ market }: TradePanelProps) {
  const { wallets } = useWallets();
  const solWallet = wallets[0] ?? null;
  const publicKey = solWallet ? new PublicKey(solWallet.address) : null;
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<{ outAmount?: number; transaction?: string } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const conn = new Connection('https://api.eitherway.ai/api/solana/rpc', 'confirmed');

  const usdcAcct = market?.accounts?.[USDC_MINT];
  const yesMint = usdcAcct?.yesMint;
  const noMint = usdcAcct?.noMint;
  const outputMint = side === 'yes' ? yesMint : noMint;

  const fetchQuote = useCallback(async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !outputMint) { setQuote(null); return; }
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const amtScaled = Math.round(amt * 1_000_000).toString();
      const params = new URLSearchParams({
        inputMint: USDC_MINT,
        outputMint,
        amount: amtScaled,
        slippageBps: 'auto',
        prioritizationFeeLamports: 'auto',
        predictionMarketSlippageBps: '100',
      });
      const res = await fetch(`${DFLOW_PROXY}/e.quote-api.dflow.net/order?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setQuote(await res.json());
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : String(err));
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [amount, outputMint]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 500);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  const handleTrade = async () => {
    if (!publicKey || !outputMint || !solWallet) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;

    setTxStatus('submitting');
    setTxError(null);
    setOrderStatus(null);
    setTxSig(null);

    try {
      const amtScaled = Math.round(amt * 1_000_000).toString();
      const params = new URLSearchParams({
        inputMint: USDC_MINT,
        outputMint,
        amount: amtScaled,
        userPublicKey: publicKey.toBase58(),
        slippageBps: 'auto',
        prioritizationFeeLamports: 'auto',
        predictionMarketSlippageBps: '100',
      });
      const res = await fetch(`${DFLOW_PROXY}/e.quote-api.dflow.net/order?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const orderData = await res.json();
      if (!orderData.transaction) throw new Error('No transaction returned');

      const txBytes = Uint8Array.from(atob(orderData.transaction), c => c.charCodeAt(0));
      const { signedTransaction } = await solWallet!.signTransaction({ transaction: txBytes });
      const sig = await conn.sendRawTransaction(signedTransaction, { skipPreflight: true });
      setTxSig(sig);
      setTxStatus('polling');
      setOrderStatus('pending');

      const finalStatus = await pollOrderStatus(sig);
      setOrderStatus(finalStatus);
      setTxStatus('done');
    } catch (err) {
      setTxError(err instanceof Error ? err.message : String(err));
      setTxStatus(null);
    }
  };

  const reset = () => {
    setTxStatus(null);
    setOrderStatus(null);
    setTxSig(null);
    setTxError(null);
    setAmount('');
    setQuote(null);
  };

  if (!usdcAcct) {
    return (
      <div className="border border-white/10 rounded-xl p-5 mt-4">
        <h2 className="text-sm font-medium mb-3 text-white/60">Trade this market</h2>
        <a
          href={`https://kalshi.com`}
          target="_blank"
          rel="noreferrer"
          className="block w-full py-3 rounded-xl text-center text-sm font-medium transition-all"
          style={{ backgroundColor: '#7c3aed', color: 'white' }}
        >
          Trade on Kalshi →
        </a>
        <p className="text-xs text-white/30 text-center mt-2">Powered by DFlow × Kalshi</p>
      </div>
    );
  }

  if (txStatus === 'done') {
    return (
      <div className="border border-white/10 rounded-xl p-5 mt-4">
        <h2 className="text-sm font-medium mb-3 text-white/60">Trade this market</h2>
        <div className="text-sm text-white/60 mb-3">{STATUS_MESSAGES[orderStatus || ''] || ''}</div>
        {txSig && (
          <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noreferrer"
            className="text-xs text-purple-400 hover:underline block mb-3">
            View on Solscan →
          </a>
        )}
        <button onClick={reset}
          className="w-full py-2 rounded-xl text-sm font-medium border border-white/10 text-white/60 hover:text-white transition-all">
          New Trade
        </button>
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-xl p-5 mt-4">
      <h2 className="text-sm font-medium mb-4 text-white/60">Trade this market</h2>

      {/* Side selector */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSide('yes')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            side === 'yes' ? 'bg-green-500 text-white' : 'bg-green-500/10 text-green-400 border border-green-500/30'
          }`}>
          Buy YES
        </button>
        <button onClick={() => setSide('no')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            side === 'no' ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}>
          Buy NO
        </button>
      </div>

      {/* Amount */}
      <div className="mb-4">
        <label className="text-xs text-white/40 mb-1 block">Amount (USDC)</label>
        <div className="relative">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 pr-16"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/30">USDC</span>
        </div>
        <div className="flex gap-2 mt-2">
          {[1, 5, 10, 50].map(v => (
            <button key={v} onClick={() => setAmount(String(v))}
              className="px-3 py-1 rounded-lg text-xs bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">
              ${v}
            </button>
          ))}
        </div>
      </div>

      {/* Quote */}
      {(quoteLoading || quote || quoteError) && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs mb-4 space-y-1.5">
          {quoteLoading && <div className="text-white/40">Fetching quote...</div>}
          {quoteError && <div className="text-red-400">{quoteError}</div>}
          {quote && !quoteLoading && (
            <div className="flex justify-between">
              <span className="text-white/40">Estimated contracts</span>
              <span className="text-white font-mono">{((quote.outAmount ?? 0) / 1e6).toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {txError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 mb-4">
          {txError}
        </div>
      )}

      {/* Trade button */}
      {!publicKey ? (
        <div className="text-center text-xs text-white/40 py-3">
          Sign in to trade this market
        </div>
      ) : txStatus ? (
        <div className="text-center text-xs text-white/40 py-3">
          {STATUS_MESSAGES[orderStatus || ''] || 'Processing...'}
        </div>
      ) : (
        <button
          onClick={handleTrade}
          disabled={!amount || parseFloat(amount) <= 0}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
            !amount || parseFloat(amount) <= 0
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : side === 'yes'
                ? 'bg-green-500 text-white hover:opacity-90'
                : 'bg-red-500 text-white hover:opacity-90'
          }`}
        >
          {amount ? `Buy ${side.toUpperCase()} — $${amount}` : 'Enter amount'}
        </button>
      )}

      <p className="text-xs text-white/20 text-center mt-3">Powered by DFlow × Kalshi on Solana</p>
    </div>
  );
}