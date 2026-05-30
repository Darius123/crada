import { Metadata } from 'next';

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`https://api.kalshi.com/trade-api/v2/markets/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const market = data.market;

    const title = market.title ?? 'Crada Market';
    const prob = market.yes_bid ? Math.round(market.yes_bid * 100) : 50;
    const description = `${prob}% YES — View this prediction market on Crada.`;
    const url = `https://crada.fun/kalshi/${id}`;
    const marketImage = market.mutually_exclusive_collection_id
      ? `https://kalshi.com/cdn/images/collections/${market.mutually_exclusive_collection_id}.webp`
      : '';

    const ogImage = `https://crada.fun/api/og/market?question=${encodeURIComponent(title)}&probability=${prob}&volume=${market.volume ?? 0}&image=${encodeURIComponent(marketImage)}&source=kalshi`;

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

export default function KalshiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
