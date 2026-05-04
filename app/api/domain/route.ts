import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { reverseLookup } from '@bonfida/spl-name-service';
import { TldParser } from '@onsol/tldparser';

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';

const cache = new Map<string, { domain: string | null; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
}

async function snsDomain(address: string): Promise<string | null> {
  // 1a. Try Bonfida REST proxy first (no RPC needed)
  try {
    const res = await withTimeout(
      fetch(`https://sns-sdk-proxy.bonfida.workers.dev/reverse-lookup/${address}`),
      4000
    );
    const json = await res.json() as { s: string; result: string };
    if (json.s === 'ok' && json.result) return `${json.result}.sol`;
  } catch { /* fall through to RPC */ }

  // 1b. RPC fallback
  try {
    const conn = new Connection(RPC, 'confirmed');
    const name = await withTimeout(
      reverseLookup(conn, new PublicKey(address)),
      6000
    );
    if (name) return `${name}.sol`;
  } catch { /* no .sol domain */ }

  return null;
}

async function allDomainsDomain(address: string): Promise<string | null> {
  try {
    const conn = new Connection(RPC, 'confirmed');
    const parser = new TldParser(conn);
    const domains = await withTimeout(
      parser.getParsedAllUserDomainsUnwrapped(address),
      10000
    );
    if (!Array.isArray(domains) || domains.length === 0) return null;
    const list = domains as { domain: string }[];
    const preferred =
      list.find(d => d.domain.endsWith('.solana')) ??
      list.find(d => d.domain.endsWith('.sol')) ??
      list[0];
    return preferred.domain;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const address = new URL(req.url).searchParams.get('address');
  if (!address) return NextResponse.json({ domain: null });

  const cached = cache.get(address);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ domain: cached.domain });
  }

  // Run both lookups in parallel — first non-null result wins
  const [sns, allDomains] = await Promise.all([snsDomain(address), allDomainsDomain(address)]);
  const domain = allDomains ?? sns ?? null;

  cache.set(address, { domain, ts: Date.now() });
  return NextResponse.json({ domain }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
