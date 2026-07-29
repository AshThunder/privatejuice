import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, type Eip1193Provider } from "ethers";
import { createEthersHandleClient, type HandleClient } from "@iexec-nox/handle";
import { useAccount, useWalletClient } from "wagmi";

function getEthereum(): Eip1193Provider | undefined {
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
}

export function useNoxHandleClient() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [client, setClient] = useState<HandleClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    setReady(false);
    setClient(null);
    const ethereum = getEthereum();
    if (!isConnected || !walletClient || !ethereum) {
      return;
    }
    try {
      const provider = new BrowserProvider(ethereum);
      const handleClient = await createEthersHandleClient(provider);
      setClient(handleClient);
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to init Nox Handle SDK");
    }
  }, [isConnected, walletClient, address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { client, ready, error, refresh };
}
