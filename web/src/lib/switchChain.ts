import type { Chain } from "viem";
import { SUPPORTED_CHAIN } from "./wagmi";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getProvider(): EthereumProvider | undefined {
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

function toHexChainId(id: number): `0x${string}` {
  return `0x${id.toString(16)}`;
}

/**
 * Force the injected wallet onto `chain` via EIP-3326 / EIP-3085.
 * Used when wagmi switchChain is unavailable or the wallet is on an
 * unconfigured network.
 */
export async function switchWalletToChain(chain: Chain = SUPPORTED_CHAIN) {
  const ethereum = getProvider();
  if (!ethereum?.request) {
    throw new Error("No injected wallet found. Open MetaMask and try again.");
  }

  const chainIdHex = toHexChainId(chain.id);

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    return;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? Number((err as { code: number }).code)
        : undefined;

    // 4902 = chain not added to wallet yet
    if (code !== 4902 && code !== -32603) {
      throw err instanceof Error
        ? err
        : new Error("Wallet rejected the network switch");
    }
  }

  const rpcUrl =
    chain.rpcUrls.default.http[0] ??
    (chain.id === 11155111
      ? "https://ethereum-sepolia-rpc.publicnode.com"
      : undefined);

  if (!rpcUrl) {
    throw new Error(`No RPC URL available to add ${chain.name}`);
  }

  await ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: chainIdHex,
        chainName: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: [rpcUrl],
        blockExplorerUrls: chain.blockExplorers?.default.url
          ? [chain.blockExplorers.default.url]
          : [],
      },
    ],
  });

  await ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: chainIdHex }],
  });
}

export async function readWalletChainId(): Promise<number | null> {
  const ethereum = getProvider();
  if (!ethereum?.request) return null;
  const hex = (await ethereum.request({ method: "eth_chainId" })) as string;
  return Number.parseInt(hex, 16);
}
