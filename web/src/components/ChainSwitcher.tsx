import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { switchWalletToChain } from "../lib/switchChain";
import { SUPPORTED_CHAIN } from "../lib/wagmi";

export function ChainSwitcher() {
  const { isConnected, chain, chainId } = useAccount();
  const { chains, switchChainAsync, isPending } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isConnected || chainId == null) return null;

  const known = chains.find((c) => c.id === chainId);
  const currentName = known?.name ?? chain?.name ?? `Chain ${chainId}`;
  const supported = chainId === SUPPORTED_CHAIN.id;
  const busy = isPending || switching;

  async function switchTo(nextId: number) {
    setOpen(false);
    setLocalError(null);
    if (nextId === chainId) return;

    setSwitching(true);
    try {
      const target =
        chains.find((c) => c.id === nextId) ??
        (nextId === SUPPORTED_CHAIN.id ? SUPPORTED_CHAIN : null);

      try {
        if (switchChainAsync && chains.some((c) => c.id === nextId)) {
          await switchChainAsync({ chainId: nextId as (typeof chains)[number]["id"] });
        } else if (target) {
          await switchWalletToChain(target);
        } else {
          throw new Error(`Unsupported chain id ${nextId}`);
        }
      } catch {
        // Wagmi can fail when the wallet is on an unexpected net — fall back to EIP-3326.
        if (target) {
          await switchWalletToChain(target);
        } else {
          throw new Error(`Could not switch to chain ${nextId}`);
        }
      }
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "Could not switch network — try MetaMask"
      );
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className={`chain-switcher ${supported ? "" : "warn"}`}>
      <button
        type="button"
        className="chain-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`chain-dot ${supported ? "ok" : "bad"}`} />
        <span className="chain-name">
          {busy ? "Switching…" : currentName}
        </span>
        <span className="chain-caret" aria-hidden>
          ▾
        </span>
      </button>

      {!supported && (
        <button
          type="button"
          className="chain-fix"
          disabled={busy}
          onClick={() => void switchTo(SUPPORTED_CHAIN.id)}
        >
          Switch to {SUPPORTED_CHAIN.name}
        </button>
      )}

      {open && (
        <>
          <button
            type="button"
            className="chain-backdrop"
            aria-label="Close network menu"
            onClick={() => setOpen(false)}
          />
          <ul className="chain-menu" role="listbox">
            {chains.map((c) => {
              const active = c.id === chainId;
              const isAppChain = c.id === SUPPORTED_CHAIN.id;
              return (
                <li key={c.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`chain-option ${active ? "active" : ""}`}
                    onClick={() => void switchTo(c.id)}
                  >
                    <span className="chain-option-name">{c.name}</span>
                    {isAppChain && (
                      <span className="chain-badge">required</span>
                    )}
                    {active && <span className="chain-check">✓</span>}
                  </button>
                </li>
              );
            })}
            {!known && (
              <li className="chain-option-disabled">
                Current: {currentName} (unsupported)
              </li>
            )}
          </ul>
        </>
      )}

      {!supported && (
        <p className="chain-hint">
          Wallet is on {currentName}. Private Juice needs {SUPPORTED_CHAIN.name}.
        </p>
      )}
      {localError && <p className="chain-hint danger">{localError}</p>}
    </div>
  );
}
