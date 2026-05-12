# Jupiter DX Report — Crada

**Project:** Crada — Prediction Market Intelligence  
**Live URL:** https://crada.fun  
**Developer Email:** dariusomejiaku@gmail.com  
**Hackathon:** Colosseum Frontier 2026

---

## What We Built

Crada is a prediction market intelligence platform that aggregates 500+ live markets from Polymarket and Kalshi, surfaces whale and insider wallet signals, and allows users to trade directly in-app. Jupiter powers the core execution and price intelligence layer.

---

## How We Use Jupiter

### 1. SOL ↔ USDC Swap (Swap API v1)

Users can swap SOL to USDC directly within Crada to fund their prediction market positions — no need to leave the app or go to an external DEX.

**Endpoint:** `POST https://api.jup.ag/swap/v1/swap`  
**File:** `app/page.tsx`

```typescript
const res = await fetch('https://api.jup.ag/swap/v1/swap', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_JUPITER_API_KEY}`
  },
  body: JSON.stringify({
    quoteResponse: swapQuote,
    userPublicKey: address,
    wrapAndUnwrapSol: true
  }),
});
```

### 2. Swap Quote (Quote API)

Before executing a swap, Crada fetches a live quote from Jupiter to show users the exact output amount and route.

**Endpoint:** `GET https://api.jup.ag/swap/v1/quote`  
**File:** `app/page.tsx`

```typescript
fetch(`https://api.jup.ag/swap/v1/quote?inputMint=${SOL_MINT}&outputMint=${USDC_MINT}&amount=${raw}&slippageBps=50`, {
  headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_JUPITER_API_KEY}` }
})
```

### 3. SOL Price for Signal Intelligence

Crada's signals engine uses Jupiter's quote API as a real-time SOL price oracle to calculate USD values for on-chain whale positions and insider wallet activity.

**File:** `app/api/signals/route.ts`

```typescript
const res = await fetch(
  'https://api.jup.ag/swap/v1/quote?inputMint=So111...&outputMint=EPjF...&amount=1000000000&slippageBps=50',
  { headers: { 'Authorization': `Bearer ${process.env.JUPITER_API_KEY}` } }
);
const solPrice = parseInt(data.outAmount) / 1e6;
```

---

## Developer Experience Feedback

**What worked well:**
- The Quote API is fast and reliable — we use it as a price oracle without issues
- Clean JSON responses, minimal setup required
- No authentication friction for getting started

**What could be improved:**
- Clearer documentation on which endpoints require the API key vs. which work without it
- A dedicated Price API endpoint (separate from the Swap Quote) would be cleaner for price oracle use cases

---

## What's Next

- Integrate Jupiter Limit Orders so users can set price targets for prediction market position funding
- Add Jupiter DCA for automated recurring deposits into prediction market bankrolls
- Replace CoinGecko price ticker with Jupiter Price API for a fully Solana-native stack
