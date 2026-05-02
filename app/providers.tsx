'use client';

import { useMemo } from 'react';
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors, defaultSolanaRpcsPlugin } from '@privy-io/react-auth/solana';

const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: false });

export function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(
    () => clusterApiUrl(WalletAdapterNetwork.Mainnet),
    []
  );

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#7c3aed',
          logo: '/crada-logo.png',
          walletChainType: 'solana-only',
        },
        loginMethods: ['wallet', 'email'],
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        plugins: [defaultSolanaRpcsPlugin()],
        connectorsDebugLogs: true,
      }}
    >
      <ConnectionProvider endpoint={endpoint}>
        {children}
      </ConnectionProvider>
    </PrivyProvider>
  );
}
