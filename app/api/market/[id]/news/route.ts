import { NextResponse } from 'next/server';

const STOP_WORDS = new Set([
  'will', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or',
  'is', 'be', 'by', 'with', 'this', 'that', 'have', 'has', 'had', 'do', 'does',
  'did', 'what', 'when', 'where', 'who', 'which', 'how', 'than', 'more', 'most',
  'before', 'after', 'from', 'out', 'over', 'under', 'again', 'all', 'both',
  'each', 'some', 'such', 'no', 'nor', 'not', 'only', 'same', 'so', 'too',
  'very', 'win', 'lose', 'get', 'make', 'take', 'come', 'its', 'their', 'there',
]);

function extractKeywords(question: string): string {
  return question
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()))
    .slice(0, 6)
    .join(' ');
}

function inferSentiment(title: string): string {
  const t = title.toLowerCase();
  const YES_WORDS = [
    'wins', 'win', 'victory', 'elected', 'passes', 'approved', 'confirms',
    'confirmed', 'achieves', 'succeeds', 'rises', 'surges', 'climbs', 'hits',
    'reaches', 'breaks record', 'ahead', 'leads', 'gains', 'beats', 'soars',
    'rallies', 'advances', 'granted', 'announces', 'secures',
  ];
  const NO_WORDS = [
    'loses', 'loss', 'defeated', 'fails', 'failed', 'rejected', 'denied',
    'dismissed', 'drops', 'falls', 'declines', 'crashes', 'suspended',
    'arrested', 'indicted', 'scandal', 'collapses', 'plunges', 'blocks',
    'blocked', 'delays', 'delayed', 'cancels', 'cancelled', 'withdraws',
  ];

  const yesHits = YES_WORDS.filter(w => t.includes(w)).length;
  const noHits  = NO_WORDS.filter(w => t.includes(w)).length;

  if (yesHits > noHits) return 'yes';
  if (noHits > yesHits) return 'no';
  return 'neutral';
}

function inferOutcomeSentiment(title: string, outcomes: string[]): string {
  const t = title.toLowerCase();
  for (const outcome of outcomes) {
    if (outcome.length <= 2) continue;
    // Exact phrase match first
    if (t.includes(outcome.toLowerCase())) return outcome;
    // Word-level match — catches "Forest" matching "Nottingham Forest FC"
    // Use > 4 threshold to avoid generic words like "team", "city", "draw" firing everywhere
    const words = outcome.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4 && !STOP_WORDS.has(w));
    if (words.length > 0 && words.some(w => t.includes(w))) return outcome;
  }
  return 'neutral';
}

function parseRSS(xml: string): { title: string; link: string; source: string; pubDate: string }[] {
  const items: { title: string; link: string; source: string; pubDate: string }[] = [];
  const itemRx = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRx.exec(xml)) !== null && items.length < 10) {
    const content = m[1];
    const title =
      (content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
       content.match(/<title>([\s\S]*?)<\/title>/))?.[1]?.trim() || '';
    const link  = content.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || '#';
    const pub   = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || '';
    const src   =
      (content.match(/<source[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/source>/) ||
       content.match(/<source[^>]*>([\s\S]*?)<\/source>/))?.[1]?.trim() || 'News';

    if (title) items.push({ title: title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'), link, source: src, pubDate: pub });
  }
  return items;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    let question = '';
    const outcomes: string[] = [];

    if (id.startsWith('event_')) {
      const eventId = id.replace('event_', '');
      const eventRes = await fetch(`https://gamma-api.polymarket.com/events?id=${eventId}`, { cache: 'no-store' });
      const eventData = await eventRes.json();
      const event = Array.isArray(eventData) ? eventData[0] : eventData;
      question = event?.title || '';
      for (const m of event?.markets ?? []) {
        const name: string = m.groupItemTitle || m.question || '';
        if (name) outcomes.push(name);
      }
    } else {
      const marketRes = await fetch(`https://gamma-api.polymarket.com/markets?id=${id}`, { cache: 'no-store' });
      const marketData = await marketRes.json();
      question = (Array.isArray(marketData) ? marketData[0] : marketData)?.question || '';
    }

    if (!question) return NextResponse.json({ news: [] });

    const keywords = extractKeywords(question);
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keywords)}&hl=en-US&gl=US&ceid=US:en`;

    const rssRes = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Crada/1.0)' },
      next: { revalidate: 300 },
    });
    const xml = await rssRes.text();

    const raw = parseRSS(xml);
    const news = raw.map(item => {
      const date = item.pubDate ? new Date(item.pubDate) : new Date();
      const minsAgo = Math.max(1, Math.round((Date.now() - date.getTime()) / 60_000));
      return {
        title: item.title,
        link: item.link,
        source: item.source,
        minsAgo,
        sentiment: outcomes.length > 0
          ? inferOutcomeSentiment(item.title, outcomes)
          : inferSentiment(item.title),
      };
    });

    return NextResponse.json({ news }, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch {
    return NextResponse.json({ news: [] });
  }
}
