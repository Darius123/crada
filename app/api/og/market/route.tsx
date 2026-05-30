import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const question = searchParams.get('question') ?? 'Prediction Market';
  const probability = searchParams.get('probability') ?? '50';
  const volume = searchParams.get('volume') ?? '0';
  const image = searchParams.get('image') ?? '';
  const source = searchParams.get('source') ?? 'polymarket';

  const prob = parseInt(probability);
  const vol = parseFloat(volume);
  const volLabel = vol >= 1_000_000
    ? `$${(vol / 1_000_000).toFixed(1)}M`
    : vol >= 1000
    ? `$${(vol / 1000).toFixed(0)}K`
    : `$${vol.toFixed(0)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#050505',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Market image as background */}
        {image && (
          <img
            src={image}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.2,
            }}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(5,5,5,0.95) 0%, rgba(124,58,237,0.15) 50%, rgba(5,5,5,0.90) 100%)',
            display: 'flex',
          }}
        />

        {/* Purple glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'rgba(124,58,237,0.15)',
            filter: 'blur(80px)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: '60px', height: '100%', justifyContent: 'space-between' }}>

          {/* Top row — logo + source badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${origin}/crada-logo.png`} alt="Crada" style={{ height: '48px', width: 'auto' }} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {source === 'kalshi' ? 'Kalshi via DFlow' : 'Polymarket'}
            </span>
          </div>

          {/* Market question */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <p style={{
              color: 'white',
              fontSize: question.length > 80 ? '36px' : '48px',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              margin: 0,
            }}>
              {question.length > 100 ? question.slice(0, 100) + '…' : question}
            </p>

            {/* Stats row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              {/* Probability */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                  PROBABILITY
                </span>
                <span style={{ color: prob >= 50 ? '#4de082' : '#f87171', fontSize: '48px', fontWeight: 700, lineHeight: 1 }}>
                  {prob}%
                </span>
              </div>

              {/* Divider */}
              <div style={{ width: '1px', height: '60px', background: 'rgba(255,255,255,0.10)', display: 'flex' }} />

              {/* Volume */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                  VOLUME
                </span>
                <span style={{ color: 'white', fontSize: '48px', fontWeight: 700, lineHeight: 1 }}>
                  {volLabel}
                </span>
              </div>

              {/* Divider */}
              <div style={{ width: '1px', height: '60px', background: 'rgba(255,255,255,0.10)', display: 'flex' }} />

              {/* CTA */}
              <div style={{
                background: '#7C3AED',
                borderRadius: '12px',
                padding: '14px 28px',
                display: 'flex',
                alignItems: 'center',
              }}>
                <span style={{ color: 'white', fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Trade on Crada →
                </span>
              </div>
            </div>
          </div>

          {/* Bottom — domain */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em' }}>
              crada.fun
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
