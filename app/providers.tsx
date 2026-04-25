'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { PrivyProvider } from '@privy-io/react-auth';
import '@solana/wallet-adapter-react-ui/styles.css';

export function Providers({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], [network]);

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#7c3aed',
          logo: '/crada-logo.png',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        loginMethods: ['wallet', 'email'],
        defaultChain: {
          id: 101,
          name: 'Solana',
          network: 'solana',
          nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
          rpcUrls: { default: { http: ['https://api.mainnet-beta.solana.com'] } },
        },
        supportedChains: [{
          id: 101,
          name: 'Solana',
          network: 'solana',
          nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
          rpcUrls: { default: { http: ['https://api.mainnet-beta.solana.com'] } },
        }],
      }}
    >
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </PrivyProvider>
  );
}