import { useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useSwitchChain,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { formatEther, parseEther, zeroAddress, isAddress, type Hash } from "viem";
import { useNoxHandleClient } from "./hooks/useNoxHandleClient";
import { ChainSwitcher } from "./components/ChainSwitcher";
import {
  DEFAULT_PROJECT_ID,
  PRIVATE_JUICEBOX_ABI,
  PRIVATE_JUICEBOX_ADDRESS,
} from "./lib/contracts";
import { juiceboxProjectUrl, parseJuiceboxProjectId } from "./lib/juicebox";
import { readWalletChainId, switchWalletToChain } from "./lib/switchChain";
import { config, SUPPORTED_CHAIN } from "./lib/wagmi";
import "./App.css";

function sepoliaTxUrl(hash: string) {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}

function short(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function App() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { client: nox, ready: noxReady, error: noxError } = useNoxHandleClient();

  const [projectInput, setProjectInput] = useState(
    DEFAULT_PROJECT_ID.toString()
  );
  const [fundEth, setFundEth] = useState("0.01");
  const [pledgeEth, setPledgeEth] = useState("0.005");
  const [status, setStatus] = useState<string | null>(null);
  const [balanceClear, setBalanceClear] = useState<string | null>(null);
  const [potClear, setPotClear] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsedProject = useMemo(
    () => parseJuiceboxProjectId(projectInput),
    [projectInput]
  );
  const projectId = parsedProject.id;
  const projectIdBig = useMemo(() => {
    try {
      return BigInt(projectId || "0");
    } catch {
      return 0n;
    }
  }, [projectId]);

  const deployed =
    PRIVATE_JUICEBOX_ADDRESS !== zeroAddress &&
    isAddress(PRIVATE_JUICEBOX_ADDRESS);

  const { data: escrow, refetch: refetchEscrow } = useReadContract({
    address: PRIVATE_JUICEBOX_ADDRESS,
    abi: PRIVATE_JUICEBOX_ABI,
    functionName: "escrowBalance",
    query: { enabled: deployed },
  });

  const { data: pledgeCount, refetch: refetchCount } = useReadContract({
    address: PRIVATE_JUICEBOX_ADDRESS,
    abi: PRIVATE_JUICEBOX_ABI,
    functionName: "pledgeCount",
    args: [projectIdBig],
    query: { enabled: deployed && projectIdBig > 0n },
  });

  const { data: settlementOpen, refetch: refetchOpen } = useReadContract({
    address: PRIVATE_JUICEBOX_ADDRESS,
    abi: PRIVATE_JUICEBOX_ABI,
    functionName: "settlementOpen",
    args: [projectIdBig],
    query: { enabled: deployed && projectIdBig > 0n },
  });

  const { data: isSettled, refetch: refetchSettled } = useReadContract({
    address: PRIVATE_JUICEBOX_ADDRESS,
    abi: PRIVATE_JUICEBOX_ABI,
    functionName: "settled",
    args: [projectIdBig],
    query: { enabled: deployed && projectIdBig > 0n },
  });

  const { data: settledAmount } = useReadContract({
    address: PRIVATE_JUICEBOX_ADDRESS,
    abi: PRIVATE_JUICEBOX_ABI,
    functionName: "settledAmount",
    args: [projectIdBig],
    query: { enabled: deployed && projectIdBig > 0n && Boolean(isSettled) },
  });

  const { data: settledTokenCount, refetch: refetchSettledTokens } =
    useReadContract({
      address: PRIVATE_JUICEBOX_ADDRESS,
      abi: PRIVATE_JUICEBOX_ABI,
      functionName: "settledTokenCount",
      args: [projectIdBig],
      query: { enabled: deployed && projectIdBig > 0n && Boolean(isSettled) },
    });

  const { data: heldCredits, refetch: refetchHeld } = useReadContract({
    address: PRIVATE_JUICEBOX_ADDRESS,
    abi: PRIVATE_JUICEBOX_ABI,
    functionName: "heldCredits",
    args: [projectIdBig],
    query: { enabled: deployed && projectIdBig > 0n && Boolean(isSettled) },
  });

  const { data: hasClaimed, refetch: refetchClaimed } = useReadContract({
    address: PRIVATE_JUICEBOX_ADDRESS,
    abi: PRIVATE_JUICEBOX_ABI,
    functionName: "claimed",
    args: address ? [projectIdBig, address] : undefined,
    query: {
      enabled: deployed && projectIdBig > 0n && Boolean(address) && Boolean(isSettled),
    },
  });

  const { data: contribHandle, refetch: refetchContrib } = useReadContract({
    address: PRIVATE_JUICEBOX_ADDRESS,
    abi: PRIVATE_JUICEBOX_ABI,
    functionName: "contributionHandleOf",
    args: address ? [projectIdBig, address] : undefined,
    query: {
      enabled: deployed && projectIdBig > 0n && Boolean(address),
    },
  });

  const { data: claimShareHandle, refetch: refetchClaimShare } =
    useReadContract({
      address: PRIVATE_JUICEBOX_ADDRESS,
      abi: PRIVATE_JUICEBOX_ABI,
      functionName: "claimShareHandleOf",
      args: address ? [projectIdBig, address] : undefined,
      query: {
        enabled:
          deployed && projectIdBig > 0n && Boolean(address) && Boolean(isSettled),
      },
    });

  const { data: balanceHandle, refetch: refetchBalHandle } = useReadContract({
    address: PRIVATE_JUICEBOX_ADDRESS,
    abi: PRIVATE_JUICEBOX_ABI,
    functionName: "balanceHandleOf",
    args: address ? [address] : undefined,
    query: { enabled: deployed && Boolean(address) },
  });

  const { data: potHandle, refetch: refetchPotHandle } = useReadContract({
    address: PRIVATE_JUICEBOX_ADDRESS,
    abi: PRIVATE_JUICEBOX_ABI,
    functionName: "projectPledgeHandle",
    args: [projectIdBig],
    query: { enabled: deployed && projectIdBig > 0n },
  });

  const { writeContractAsync, isPending: writing } = useWriteContract();

  const onSepolia = chainId === SUPPORTED_CHAIN.id;

  async function refreshAll() {
    await Promise.all([
      refetchEscrow(),
      refetchCount(),
      refetchOpen(),
      refetchSettled(),
      refetchBalHandle(),
      refetchPotHandle(),
      refetchSettledTokens(),
      refetchHeld(),
      refetchClaimed(),
      refetchContrib(),
      refetchClaimShare(),
    ]);
  }

  async function requireSepolia() {
    const walletId = (await readWalletChainId()) ?? chainId;
    if (walletId === SUPPORTED_CHAIN.id) return;

    setStatus(
      `Wallet is on chain ${walletId}. Approve the switch to ${SUPPORTED_CHAIN.name}…`
    );

    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: SUPPORTED_CHAIN.id });
      } else {
        await switchWalletToChain(SUPPORTED_CHAIN);
      }
    } catch {
      await switchWalletToChain(SUPPORTED_CHAIN);
    }

    const after = await readWalletChainId();
    if (after !== SUPPORTED_CHAIN.id) {
      throw new Error(
        `Still on chain ${after ?? "?"}. Open the network menu and switch to ${SUPPORTED_CHAIN.name}, then try again.`
      );
    }
  }

  async function sendAndConfirm(
    label: string,
    write: () => Promise<Hash>
  ): Promise<Hash> {
    await requireSepolia();
    // Don't force chainId in the write — wallet must already be on Sepolia.
    // Passing chainId while mismatched caused the viem error you saw.
    const hash = await write();
    setStatus(
      `${label} submitted — waiting for Sepolia confirmation…\n${sepoliaTxUrl(hash)}`
    );
    const receipt = await waitForTransactionReceipt(config, {
      hash,
      timeout: 180_000,
    });
    if (receipt.status !== "success") {
      throw new Error(`${label} reverted on-chain (${hash})`);
    }
    return hash;
  }

  async function onFund() {
    if (!deployed) return;
    setBusy(true);
    setStatus(null);
    try {
      const hash = await sendAndConfirm("Fund", () =>
        writeContractAsync({
          address: PRIVATE_JUICEBOX_ADDRESS,
          abi: PRIVATE_JUICEBOX_ABI,
          functionName: "fund",
          value: parseEther(fundEth),
        })
      );
      setStatus(`Funded (confirmed) — ${sepoliaTxUrl(hash)}`);
      await refreshAll();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Fund failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPledge() {
    if (!deployed || !nox) {
      setStatus("Nox Handle client not ready");
      return;
    }
    if (!projectId) {
      setStatus("Enter a Juicebox project ID or URL first");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const wei = parseEther(pledgeEth);
      setStatus("Encrypting pledge with Nox…");
      const { handle, handleProof } = await nox.encryptInput(
        wei,
        "uint256",
        PRIVATE_JUICEBOX_ADDRESS
      );
      const hash = await sendAndConfirm("Pledge", () =>
        writeContractAsync({
          address: PRIVATE_JUICEBOX_ADDRESS,
          abi: PRIVATE_JUICEBOX_ABI,
          functionName: "pledge",
          args: [
            projectIdBig,
            handle as `0x${string}`,
            handleProof as `0x${string}`,
          ],
        })
      );
      setStatus(
        `Pledged privately to Juicebox #${projectId} (confirmed) — ${sepoliaTxUrl(hash)}`
      );
      setBalanceClear(null);
      setPotClear(null);
      await refreshAll();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Pledge failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDecryptBalance() {
    const empty = `0x${"0".repeat(64)}`;
    if (!nox || !balanceHandle || (balanceHandle as string) === empty) {
      setStatus("No balance handle yet — fund first");
      return;
    }
    setBusy(true);
    try {
      const { value } = await nox.decrypt(balanceHandle as `0x${string}`);
      setBalanceClear(`${formatEther(BigInt(value.toString()))} ETH`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Decrypt failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDecryptPot() {
    if (!nox || !potHandle || (potHandle as string) === `0x${"0".repeat(64)}`) {
      setStatus("No pledge pot yet");
      return;
    }
    setBusy(true);
    try {
      // After settle + extra pledges, the pot handle may no longer be public.
      // Prefer ACL decrypt (owner/viewer); fall back to publicDecrypt.
      try {
        const { value } = await nox.decrypt(potHandle as `0x${string}`);
        setPotClear(`${formatEther(BigInt(value.toString()))} ETH`);
        return;
      } catch {
        if (!settlementOpen) throw new Error("Not allowed to decrypt this pot");
        const { value } = await nox.publicDecrypt(potHandle as `0x${string}`);
        setPotClear(`${formatEther(BigInt(value.toString()))} ETH`);
      }
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Decrypt failed — if you pledged after settling, that pot handle is no longer publicly decryptable"
      );
    } finally {
      setBusy(false);
    }
  }

  async function onOpenSettlement() {
    setBusy(true);
    try {
      const hash = await sendAndConfirm("Open settlement", () =>
        writeContractAsync({
          address: PRIVATE_JUICEBOX_ADDRESS,
          abi: PRIVATE_JUICEBOX_ABI,
          functionName: "openSettlement",
          args: [projectIdBig],
        })
      );
      setStatus(`Settlement opened (confirmed) — ${sepoliaTxUrl(hash)}`);
      await refreshAll();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "openSettlement failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSettle() {
    if (!nox || !potHandle) {
      setStatus("Need Nox client + pot handle");
      return;
    }
    setBusy(true);
    try {
      const { value } = await nox.publicDecrypt(potHandle as `0x${string}`);
      const amount = BigInt(value.toString());
      const hash = await sendAndConfirm("Settle", () =>
        writeContractAsync({
          address: PRIVATE_JUICEBOX_ADDRESS,
          abi: PRIVATE_JUICEBOX_ABI,
          functionName: "settleToJuicebox",
          args: [
            projectIdBig,
            amount,
            "Private Juice · Nox confidential pledges",
          ],
        })
      );
      setStatus(
        `Settled ${formatEther(amount)} ETH into Juicebox #${projectId ?? "?"} — credits held for pledgers to claim (confirmed) — ${sepoliaTxUrl(hash)}`
      );
      await refreshAll();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Settle failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPrepareClaim() {
    if (!deployed || !projectId) return;
    setBusy(true);
    try {
      const hash = await sendAndConfirm("Prepare claim", () =>
        writeContractAsync({
          address: PRIVATE_JUICEBOX_ADDRESS,
          abi: PRIVATE_JUICEBOX_ABI,
          functionName: "prepareClaim",
          args: [projectIdBig],
        })
      );
      setStatus(
        `Claim prepared — your token share is now decryptable. Next: Claim tokens.\nNote: preparing a claim reveals your share size.\n${sepoliaTxUrl(hash)}`
      );
      await refreshAll();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Prepare claim failed");
    } finally {
      setBusy(false);
    }
  }

  async function onClaimTokens() {
    if (!nox) {
      setStatus("Nox Handle client not ready");
      return;
    }
    const handle = claimShareHandle as `0x${string}` | undefined;
    if (!handle || /^0x0+$/.test(handle)) {
      setStatus("Prepare your claim first");
      return;
    }
    setBusy(true);
    try {
      setStatus("Decrypting your token share with Nox…");
      const { value, decryptionProof } = await nox.publicDecrypt(handle);
      const tokens = BigInt(value.toString());
      const hash = await sendAndConfirm("Claim tokens", () =>
        writeContractAsync({
          address: PRIVATE_JUICEBOX_ADDRESS,
          abi: PRIVATE_JUICEBOX_ABI,
          functionName: "claimTokens",
          args: [projectIdBig, decryptionProof as `0x${string}`],
        })
      );
      setStatus(
        `Claimed ${tokens.toString()} Juicebox credits for project #${projectId} (confirmed) — ${sepoliaTxUrl(hash)}`
      );
      await refreshAll();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setBusy(false);
    }
  }

  const pending = busy || writing;

  const hasPledges = (pledgeCount ?? 0n) > 0n;
  const flowFund =
    Boolean(isSettled) || hasPledges || Boolean(balanceClear) ? "done" : "active";
  const flowPledge = Boolean(isSettled)
    ? "done"
    : hasPledges
      ? "done"
      : flowFund === "done"
        ? "active"
        : "";
  const flowSettle = Boolean(isSettled)
    ? "done"
    : hasPledges || Boolean(settlementOpen)
      ? "active"
      : "";

  return (
    <div className="page">
      <header className="top">
        <div className="top-inner">
          <div className="brand">
            <div className="logo-mark" aria-hidden>
              J
            </div>
            <div className="brand-text">
              <span className="mark">Private Juice</span>
              <span className="tag">Juicebox × iExec Nox</span>
            </div>
          </div>
          <nav className="nav-links" aria-label="Steps">
            <a href="#fund" className={flowFund === "active" ? "active" : ""}>
              Fund
            </a>
            <a href="#pledge" className={flowPledge === "active" ? "active" : ""}>
              Pledge
            </a>
            <a href="#settle" className={flowSettle === "active" || flowSettle === "done" ? "active" : ""}>
              Settle
            </a>
          </nav>
          <div className="wallet">
            <ChainSwitcher />
            {isConnected ? (
              <>
                <div className="addr-chip">
                  <span className="material-symbols-outlined" aria-hidden>
                    account_balance_wallet
                  </span>
                  {short(address)}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  title="Disconnect"
                  onClick={() => disconnect()}
                >
                  <span className="material-symbols-outlined" aria-hidden>
                    logout
                  </span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="primary"
                style={{ width: "auto", padding: "10px 18px" }}
                disabled={connecting}
                onClick={() => connect({ connector: connectors[0] })}
              >
                Connect wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <div className="hero-stickers" aria-hidden>
            <span className="sticker s1" />
            <span className="sticker s2" />
            <span className="sticker s3" />
            <span className="sticker s4" />
            <span className="sticker s5" />
            <span className="sticker s6" />
          </div>
          <div className="hero-inner">
            <p className="eyebrow">WTF Hackathon · Write The Future</p>
            <h1>Private Juice</h1>
            <p className="lede">
              Confidential pledges for Juicebox — fund an encrypted balance with
              Nox, pledge without revealing size, then settle the aggregate into
              the real Juicebox ETH terminal on Sepolia.
            </p>
          </div>
        </section>

        <nav className="flow" aria-label="Pledge flow">
          <div className={`flow-step ${flowFund}`}>
            <span className="flow-num">{flowFund === "done" ? "✓" : "1"}</span>
            Fund
          </div>
          <div className={`flow-step ${flowPledge}`}>
            <span className="flow-num">{flowPledge === "done" ? "✓" : "2"}</span>
            Pledge
          </div>
          <div className={`flow-step ${flowSettle}`}>
            <span className="flow-num">{flowSettle === "done" ? "✓" : "3"}</span>
            Settle
          </div>
        </nav>

        {!deployed && (
          <div className="banner">
            Set <code>VITE_PRIVATE_JUICEBOX</code> after deploying{" "}
            <code>PrivateJuicebox</code> to Sepolia (
            <code>contracts/npm run deploy:sepolia</code>).
          </div>
        )}

        <section className="grid">
          <article className="panel" id="fund">
            <div className="panel-band sky" aria-hidden />
            <div className="panel-body">
              <div className="panel-head">
                <span className="step-chip">Step 1</span>
              </div>
              <h2>Fund</h2>
              <div className="fields">
                <label>
                  Amount (ETH)
                  <input
                    value={fundEth}
                    onChange={(e) => setFundEth(e.target.value)}
                    inputMode="decimal"
                  />
                </label>
              </div>
              <div className="panel-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={!isConnected || pending || !deployed}
                  onClick={onFund}
                >
                  {onSepolia ? "Fund" : "Fund (will switch to Sepolia)"}
                </button>
                <div className="panel-foot">
                  <button
                    type="button"
                    className="ghost"
                    disabled={!noxReady || pending}
                    onClick={onDecryptBalance}
                  >
                    Decrypt my balance
                  </button>
                  {balanceClear && (
                    <div className="pill">
                      <span className="material-symbols-outlined" aria-hidden>
                        check_circle
                      </span>
                      {balanceClear} available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>

          <article
            className={`panel ${flowFund !== "done" && !hasPledges && !balanceClear ? "dimmed" : ""}`}
            id="pledge"
          >
            <div className="panel-band purple" aria-hidden />
            <div className="panel-body">
              <div className="panel-head">
                <span className="step-chip">Step 2</span>
              </div>
              <h2>Pledge</h2>
              <div className="fields">
                <label>
                  <span className="label-row">
                    <span>Juicebox project URL</span>
                    {projectId ? (
                      <a
                        href={juiceboxProjectUrl(projectId)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        open on Sepolia Juicebox
                      </a>
                    ) : null}
                  </span>
                  <input
                    value={projectInput}
                    onChange={(e) => setProjectInput(e.target.value)}
                    placeholder="28 or https://sepolia.juicebox.money/v5/sep:28"
                  />
                </label>
                {projectId ? (
                  <p className="hint">Using project <strong>#{projectId}</strong></p>
                ) : (
                  <p className="hint">
                    {parsedProject.error ??
                      "Paste a Sepolia project URL or numeric ID"}
                  </p>
                )}
                <label>
                  Pledge amount (ETH)
                  <input
                    value={pledgeEth}
                    onChange={(e) => setPledgeEth(e.target.value)}
                    inputMode="decimal"
                  />
                </label>
                {Boolean(isSettled) && (
                  <p className="hint">
                    Project #{projectId} is already settled (
                    {settledAmount !== undefined
                      ? `${formatEther(settledAmount)} ETH`
                      : "?"}
                    ). Further pledges are locked. Check{" "}
                    <a
                      href={`https://sepolia.etherscan.io/address/${PRIVATE_JUICEBOX_ADDRESS}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Etherscan
                    </a>
                    .
                  </p>
                )}
                {!noxReady && (
                  <p className="hint">Nox SDK: {noxError ?? "initializing…"}</p>
                )}
              </div>
              <div className="panel-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={
                    !isConnected ||
                    !noxReady ||
                    pending ||
                    !deployed ||
                    !projectId ||
                    Boolean(isSettled)
                  }
                  onClick={onPledge}
                >
                  {isSettled
                    ? "Already settled — pick another project"
                    : "Pledge privately"}
                </button>
              </div>
            </div>
          </article>

          <article
            className={`panel ${!hasPledges && !settlementOpen && !isSettled ? "dimmed" : ""}`}
            id="settle"
          >
            <div className="panel-band teal" aria-hidden />
            <div className="panel-body">
              <div className="panel-head">
                <span className="step-chip">Step 3</span>
              </div>
              <h2>Settle</h2>
              <ul className="stats">
                <li>
                  Escrow
                  <strong>
                    {escrow !== undefined ? `${formatEther(escrow)} ETH` : "—"}
                  </strong>
                </li>
                <li>
                  Pledges
                  <strong>{pledgeCount?.toString() ?? "0"}</strong>
                </li>
                <li>
                  Settlement
                  <strong>
                    {isSettled
                      ? `done (${settledAmount !== undefined ? formatEther(settledAmount) : "?"} ETH)`
                      : settlementOpen
                        ? "open"
                        : "closed"}
                  </strong>
                </li>
                <li>
                  JB credits held
                  <strong>
                    {isSettled
                      ? heldCredits !== undefined
                        ? heldCredits.toString()
                        : settledTokenCount?.toString() ?? "—"
                      : "—"}
                  </strong>
                </li>
                <li>
                  Target project
                  <strong>{projectId ? `#${projectId}` : "—"}</strong>
                </li>
              </ul>
              <div className="panel-actions">
                <button
                  type="button"
                  className="ghost"
                  disabled={pending || !deployed || Boolean(isSettled) || !projectId}
                  onClick={onOpenSettlement}
                >
                  Open settlement
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={!noxReady || pending}
                  onClick={onDecryptPot}
                >
                  Read pot
                </button>
                {potClear && (
                  <div className="pill">
                    <span className="material-symbols-outlined" aria-hidden>
                      check_circle
                    </span>
                    {potClear}
                  </div>
                )}
                <button
                  type="button"
                  className={`primary ${!settlementOpen || isSettled ? "outline" : ""}`}
                  disabled={
                    !settlementOpen || Boolean(isSettled) || pending || !deployed
                  }
                  onClick={onSettle}
                >
                  Settle to Juicebox
                </button>
                {Boolean(isSettled) && (
                  <div className="panel-foot">
                    <p className="hint">
                      Credits sit in Private Juice until each pledger claims their
                      share. Preparing a claim reveals your share size.
                    </p>
                    {Boolean(hasClaimed) ? (
                      <div className="pill">
                        <span className="material-symbols-outlined" aria-hidden>
                          check_circle
                        </span>
                        You already claimed
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="ghost"
                          disabled={
                            pending ||
                            !deployed ||
                            !contribHandle ||
                            /^0x0+$/.test(contribHandle as string)
                          }
                          onClick={onPrepareClaim}
                        >
                          {claimShareHandle &&
                          !/^0x0+$/.test(claimShareHandle as string)
                            ? "Re-prepare claim"
                            : "Prepare my claim"}
                        </button>
                        <button
                          type="button"
                          className="primary"
                          disabled={
                            pending ||
                            !noxReady ||
                            !claimShareHandle ||
                            /^0x0+$/.test(claimShareHandle as string)
                          }
                          onClick={onClaimTokens}
                        >
                          Claim my Juicebox credits
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </article>
        </section>

        {status && <pre className="status">{status}</pre>}

        <section className="how" id="how-it-works">
          <h2>How it works</h2>
          <p className="how-lede">
            Juicebox normally shows every payment in public. Private Juice lets
            you pledge without showing your amount. After settle, you can still
            claim your fair share of Juicebox tokens.
          </p>
          <ol className="how-steps">
            <li>
              <strong>Fund</strong>
              <span>
                Put ETH into a private balance. Other people can see that you
                deposited, but your running balance is stored encrypted.
              </span>
            </li>
            <li>
              <strong>Pledge</strong>
              <span>
                Choose a Juicebox project and how much to give. Your browser
                encrypts that amount before it goes on-chain, so nobody can read
                the size of your pledge.
              </span>
            </li>
            <li>
              <strong>Settle</strong>
              <span>
                When the round is done, anyone can open the total pot. Only the
                sum is revealed. That ETH is paid into the real Juicebox project,
                and the project tokens go to Private Juice to hold for everyone.
              </span>
            </li>
            <li>
              <strong>Claim</strong>
              <span>
                Each pledger asks Nox for their proportional token share, then
                claims those Juicebox credits. Your pledge stays private until
                you claim — claiming reveals your share.
              </span>
            </li>
          </ol>
          <p className="how-note">
            Think of a sealed box: people see you put something in, but not how
            much. Opening the box shows only the total. When you later take your
            slice of the reward tokens, that slice size can show what you put in.
          </p>
        </section>
      </main>

      <footer className="foot">
        <div className="foot-inner">
          <div className="foot-contract">
            <span>Contract:</span>
            <code>{short(PRIVATE_JUICEBOX_ADDRESS)}</code>
          </div>
          <div className="foot-links">
            <a
              href="https://docs.noxprotocol.io/getting-started/welcome"
              target="_blank"
              rel="noreferrer"
            >
              Nox Docs
            </a>
            <a href="https://juicebox.money" target="_blank" rel="noreferrer">
              Juicebox
            </a>
            <a
              href="https://dorahacks.io/hackathon/wtf-hackathon/detail"
              target="_blank"
              rel="noreferrer"
            >
              WTF Hackathon
            </a>
            <span className="foot-copy">© 2026 Private Juice</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
