# Jupiter DX Report — Crada

**Project:** Crada — Prediction Market Intelligence  
**Live URL:** https://crada.fun  
**Developer Email:** dariusomejiaku@gmail.com

---

## What Crada does

Crada is a prediction market terminal. It pulls live markets from Polymarket and Kalshi into one feed, shows you what whales and insiders are betting on-chain before everyone else notices, and lets you trade without leaving the app.

Jupiter is how the money moves.

---

## How we use Jupiter

### Swapping into positions

The core problem we kept running into: users land on a market they want to trade, but their funds are in SOL and the market needs USDC. We didn't want to send them to a DEX — that's the kind of friction that kills conversion.

So we built the swap directly into Crada's terminal. You enter an amount in SOL, we hit Jupiter's Quote API to show you exactly what you're getting, you confirm, and the swap executes in-app before the trade goes through.

```typescript
// Quote
fetch(`https://api.jup.ag/swap/v1/quote?inputMint=${SOL_MINT}&outputMint=${USDC_MINT}&amount=${raw}&slippageBps=50`, {
  headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_JUPITER_API_KEY}` }
})

// Execute
fetch('https://api.jup.ag/swap/v1/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_JUPITER_API_KEY}` },
  body: JSON.stringify({ quoteResponse: swapQuote, userPublicKey: address, wrapAndUnwrapSol: true }),
})
```

### SOL price for whale signal calculations

Our signals engine tracks large wallet movements and flags suspicious activity. To display those positions in USD (so it's actually readable), we needed a reliable real-time SOL price. We use Jupiter's quote API for this — 1 SOL → USDC quote gives us the price directly from live market conditions, no third-party oracle.

```typescript
// app/api/signals/route.ts
const res = await fetch(
  'https://api.jup.ag/swap/v1/quote?inputMint=So111...&outputMint=EPjF...&amount=1000000000&slippageBps=50',
  { headers: { 'Authorization': `Bearer ${process.env.JUPITER_API_KEY}` } }
);
const solPrice = parseInt(data.outAmount) / 1e6;
```

---

## Honest dev feedback

The Quote API is solid — fast, consistent, never had it go down on us during testing. The swap flow was straightforward to integrate.

One thing that tripped me up early: I wasn't sure which endpoints needed the API key and which worked without it. Took some trial and error. Clearer docs on auth requirements per endpoint would've saved time.

Also — using the swap quote as a price oracle works but feels like a workaround. A clean dedicated price endpoint would be cleaner for this use case.

---

## What's next with Jupiter

- Limit orders so users can set a price to auto-convert SOL → USDC when funding a market position
- DCA for users who want to drip funds into their prediction market bankroll over time
- Swap the CoinGecko price ticker for Jupiter's Price API — want the whole stack Solana-native
