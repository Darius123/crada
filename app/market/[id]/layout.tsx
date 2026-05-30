import { Metadata } from 'next';

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`https://gamma-api.polymarket.com/markets/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error();
    const market = await res.json();

    const title = market.question ?? 'Crada Market';
    const description = market.description
      ? market.description.slice(0, 160)
      : `View this prediction market on Crada — ${title}`;
    const url = `https://crada.fun/market/${id}`;

    let prob = 50;
    try { prob = Math.round(parseFloat(JSON.parse(market.outcomePrices ?? '["0.5"]')[0]) * 100); } catch {}

    const ogImage = `https://crada.fun/api/og/market?question=${encodeURIComponent(title)}&probability=${prob}&volume=${market.volumeNum ?? 0}&image=${encodeURIComponent(market.image ?? '')}&source=polymarket`;

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
