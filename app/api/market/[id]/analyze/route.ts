/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'no_key' }, { status: 503 });
  }

  const { id } = await params;

  try {
    const marketRes = await fetch(`https://gamma-api.polymarket.com/markets/${id}`, {
      next: { revalidate: 300 },
    });
    if (!marketRes.ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const m = await marketRes.json();

    let prob = 0.5;
    try { prob = parseFloat(JSON.parse(m.outcomePrices || '["0.5"]')[0]); } catch {}

    const volume = parseFloat(m.volumeNum || '0');
    const volume24h = parseFloat(m.volume24hr || '0');
    const liquidity = parseFloat(m.liquidityNum || '0');
    const priceChange = m.oneMonthPriceChange != null ? (parseFloat(m.oneMonthPriceChange) * 100).toFixed(1) + '%' : 'N/A';

    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are Crada Intelligence — an elite prediction market analyst with insider-level pattern recognition. Be sharp, specific, and confident.

MARKET: ${m.question}
PROBABILITY (YES): ${Math.round(prob * 100)}%
24H VOLUME: $${(volume24h / 1000).toFixed(1)}K
TOTAL VOLUME: $${(volume / 1000).toFixed(0)}K
LIQUIDITY: $${(liquidity / 1000).toFixed(0)}K
1-MONTH PRICE CHANGE: ${priceChange}
EXPIRY: ${m.endDateIso || 'Unknown'}
DESCRIPTION: ${(m.description || '').slice(0, 400)}

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
    // Strip markdown code fences if present
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
