import { Metadata } from 'next';

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const isEvent = id.startsWith('event_');
    const rawId = isEvent ? id.replace('event_', '') : id;

    const apiUrl = isEvent
      ? `https://gamma-api.polymarket.com/events?id=${rawId}`
      : `https://gamma-api.polymarket.com/markets?id=${rawId}`;

    const res = await fetch(apiUrl, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const item = Array.isArray(data) ? data[0] : data;
    if (!item) throw new Error();

    const title = item.title ?? item.question ?? 'Crada Market';
    const description = item.description
      ? item.description.slice(0, 160)
      : `View this prediction market on Crada — ${title}`;
    const url = `https://crada.fun/market/${id}`;

    let prob = 50;
    try {
      if (isEvent) {
        const firstMarket = item.markets?.[0];
        const prices = JSON.parse(firstMarket?.outcomePrices ?? '["0.5"]');
        prob = Math.round(parseFloat(prices[0]) * 100);
      } else {
        const prices = JSON.parse(item.outcomePrices ?? '["0.5"]');
        prob = Math.round(parseFloat(prices[0]) * 100);
      }
    } catch {}

    const volume = isEvent
      ? parseFloat(item.volume || '0')
      : parseFloat(item.volumeNum || '0');

    const image = item.image ?? '';

    const ogImage = `https://crada.fun/api/og/market?question=${encodeURIComponent(title)}&probability=${prob}&volume=${volume}&image=${encodeURIComponent(image)}&source=polymarket`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: 'Crada',
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
        site: '@crada_fun',
      },
    };
  } catch {
    return {
      title: 'Crada — Prediction Market',
      description: 'Prediction markets, made easy.',
      openGraph: { siteName: 'Crada', images: [{ url: 'https://crada.fun/og-default.png' }] },
    };
  }
}

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
