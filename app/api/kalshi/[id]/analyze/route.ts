/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const DFLOW_BASE = 'https://prediction-markets-api-proxy.dflow.workers.dev/api/v1';
const HEADERS = { Origin: 'https://dflow.net', Referer: 'https://dflow.net/' };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'no_key' }, { status: 503 });
  }

  const { id } = await params;

  try {
    const marketRes = await fetch(`${DFLOW_BASE}/market/${id}`, {
      headers: HEADERS,
      next: { revalidate: 300 },
    });
    if (!marketRes.ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const m = await marketRes.json();

    const yesAsk = m.yesAsk ? parseFloat(m.yesAsk) : 0.5;
    const yesPct = Math.round(yesAsk * 100);
    const volume = m.volume ?? 0;
    const volume24h = m.volume24hFp ? parseFloat(m.volume24hFp) : 0;

    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are Crada Intelligence — an elite prediction market analyst with insider-level pattern recognition. Be sharp, specific, and confident.

MARKET: ${m.title}
PLATFORM: Kalshi (via DFlow on Solana)
PROBABILITY (YES): ${yesPct}¢
24H VOLUME: $${(volume24h / 1000).toFixed(1)}K
TOTAL VOLUME: $${(volume / 1_000_000).toFixed(2)}M
CLOSES: ${m.closeTime ? new Date(m.closeTime * 1000).toISOString().split('T')[0] : 'Unknown'}

Return ONLY valid JSON in this exact shape:
{
  "verdict": "STRONG YES" | "LEAN YES" | "CONTESTED" | "LEAN NO" | "STRONG NO",
  "edge": <integer -50 to 50>,
  "signals": ["<signal 1, max 12 words>", "<signal 2, max 12 words>", "<signal 3, max 12 words>"],
  "assessment": "<2 sharp sentences written like an insider — be specific to this market>",
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "catalyst": "<single most likely event to move this market, max 20 words>"
}`,
      }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const analysis = JSON.parse(cleaned);

    return NextResponse.json(
      { analysis },
      { headers: { 'Cache-Control': 'public, max-age=300' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
