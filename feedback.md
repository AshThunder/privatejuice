# feedback.md — iExec Nox / tooling notes

Project: **Private Juice** (Juicebox × Nox) · WTF Hackathon Summer Edition

## What worked well

- **Hello World → production path is clear.** The confidential piggy-bank tutorial maps directly onto escrow + pledge accounting (`toEuint256`, `fromExternal`, `add` / `sub`, `allowThis` / `allow` / `addViewer`).
- **`@iexec-nox/handle` API is small and usable.** `createEthersHandleClient` + `encryptInput(value, "uint256", app)` + `decrypt` / `publicDecrypt` is enough for a full dApp loop.
- **Chain wiring is explicit.** NoxCompute on Ethereum Sepolia (`0x24Ef36…`) and Hardhat plugin docs made Sepolia targeting obvious.
- **Public decryption is the right primitive for settlement.** `allowPublicDecryption` on an aggregate pot lets us reveal only the batch total when paying Juicebox, which matches “privacy while composing with transparent protocols.”

## Friction / gaps

- **Native ETH vs encrypted amounts.** Any `msg.value` is public. Documented patterns focus on encrypted *state*; crowdfunding still needs careful UX so fund size doesn’t trivially leak pledge size (overfunding, batching, or cToken rails).
- **Hardhat starter link 404.** DoraHacks listed `nox-hardhat-starter`; we bootstrapped from the Hardhat plugin docs instead. A maintained starter would save hours.
- **Solidity `0.8.35` + Hardhat 3** is a sharp edge if you also pull older protocol interfaces (Juicebox is `^0.8.0` — fine via interface-only imports).
- **No on-chain binding of `publicDecrypt` proof to `settle(amount)`** in the SDK examples we followed. We rely on off-chain verify + escrow balance checks; a solidity helper to verify decryption proofs would harden settlement.
- **ACL gotchas are real.** Forgetting `allowThis` / viewer grants after every new handle breaks the next transaction — the docs warn about this; runtime errors are still easy to hit while iterating.

## Juicebox integration note

Paying `JBETHPaymentTerminal.pay` with the decrypted aggregate is clean composability: Juicebox stays unmodified; Nox sits in front as a confidential pledge router.

## Wishlist

1. Official Sepolia faucet / status page linked from Nox networks docs (RPC + gateway health).
2. Example “settle aggregate into external protocol” recipe (Uniswap / Juicebox / Safe).
3. Type-safe ABI exports for `externalEuint256` in viem/wagmi templates.

— Built during WTF !! hackathon summer edition, July 2026
