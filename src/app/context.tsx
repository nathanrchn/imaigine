"use client";

import "@mysten/dapp-kit/dist/index.css";
import { config } from "@fal-ai/serverless-client";
import { getFullnodeUrl } from "@mysten/sui/client";
import { EnokiFlowProvider } from "@mysten/enoki/react";
import { ThemeProvider } from "@/components/theme-provider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";

const { networkConfig } = createNetworkConfig({
	testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
});

const queryClient = new QueryClient();

config({ proxyUrl: "/api/proxy" });

export default function Context({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork={"testnet"}>
          <WalletProvider stashedWallet={{
            name: "Imaigine",
          }} autoConnect>
            <EnokiFlowProvider apiKey={process.env.ENOKI_API_KEY!}>
              {children}
            </EnokiFlowProvider>
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
