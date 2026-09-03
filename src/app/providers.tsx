'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { config } from '@/utils/wagmi';
import Head from '../components/Head';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();
export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    <Head />
                    <main className='px-30 py-4'>{children}</main>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}