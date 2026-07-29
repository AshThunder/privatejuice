import { http, createConfig } from "wagmi";
import {
  arbitrumSepolia,
  baseSepolia,
  mainnet,
  optimismSepolia,
  sepolia,
} from "wagmi/chains";
import { injected } from "wagmi/connectors";

/** Sepolia is the only supported network for Private Juice (Nox + Juicebox terminal). */
export const SUPPORTED_CHAIN = sepolia;

/**
 * Include common testnets so wagmi tracks the real wallet chain.
 * If the active chain is missing from this list, wagmi can mis-report chainId
 * and skip switching — which breaks Fund.
 */
export const config = createConfig({
  chains: [sepolia, baseSepolia, arbitrumSepolia, optimismSepolia, mainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL || undefined),
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [optimismSepolia.id]: http(),
    [mainnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
