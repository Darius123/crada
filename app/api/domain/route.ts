import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { reverseLookup } from '@bonfida/spl-name-service';
import { TldParser } from '@onsol/tldparser';

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';

const cache = new Map<string, string | null>();

export async function GET(req: NextRequest) {
  const address = new URL(req.url).searchParams.get('address');
  if (!address) return NextResponse.json({ domain: null });

  if (cache.has(address)) return NextResponse.json({ domain: cache.get(address) });

  const connection = new Connection(RPC, 'confirmed');
  let domain: string | null = null;

  // 1. Try SNS (.sol) reverse lookup
  try {
    const name = await Promise.race([
      reverseLookup(connection, new PublicKey(address)),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
    ]);
    if (name) domain = `${name}.sol`;
  } catch { /* no .sol domain */ }

  // 2. Try AllDomains — fetch ALL owned domains (no "main domain" config required)
  if (!domain) {
    try {
      const parser = new TldParser(connection);
      const domains = await Promise.race([
        parser.getParsedAllUserDomainsUnwrapped(address),
        new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 8000)),
      ]);
      if (Array.isArray(domains) && domains.length > 0) {
        const list = domains as { domain: string }[];
        // Prefer .solana, then .sol, then anything else
        const preferred =
          list.find(d => d.domain.endsWith('.solana')) ??
          list.find(d => d.domain.endsWith('.sol')) ??
          list[0];
        domain = preferred.domain;
      }
    } catch { /* no AllDomains domain */ }
  }

  cache.set(address, domain);
  return NextResponse.json({ domain });
}
