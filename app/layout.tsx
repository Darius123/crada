import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Crada — Prediction Market Intelligence',
  description: 'The edge serious traders don\'t talk about. Prediction markets, made easy. Built on Solana.',
  icons: {
    icon: '/crada-icon.png',
    apple: '/crada-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}