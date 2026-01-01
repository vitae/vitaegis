"use client";
import { ReactNode } from "react";

import { WagmiProvider } from "wagmi";
import { mainnet, polygon } from "wagmi/chains";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";


const config = getDefaultConfig({
  appName: "Vitaegis Vitality",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo",
  chains: [mainnet, polygon],
  ssr: true,
});

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#00ff6a",
            accentColorForeground: "#000000",
            borderRadius: "medium",
            fontStack: "system",
          })}
          coolMode
        >
          {children}
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
