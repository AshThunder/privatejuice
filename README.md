# Private Juice — Juicebox × Nox

Confidential crowdfunding for [Juicebox](https://juicebox.money) using [iExec Nox](https://docs.noxprotocol.io/getting-started/welcome).

Built for the [WTF !! hackathon summer edition](https://dorahacks.io/hackathon/wtf-hackathon/detail) (Write The Future).

## What it does

Juicebox payments are transparent by design. **Private Juice** adds a Nox confidentiality layer **without forking Juicebox**:

1. **Fund** — deposit ETH into an escrowed, encrypted personal balance (`euint256` handle).
2. **Pledge** — encrypt a pledge amount with the Nox Handle SDK and move it into a Juicebox project’s encrypted pot. Individual pledge sizes are not readable from contract storage. Each pledger’s contribution is tracked encrypted for later claims.
3. **Open settlement** — anyone makes the **aggregate** pot publicly decryptable.
4. **Settle** — decrypt the total off-chain and call Juicebox `pay()` with **this contract** as beneficiary so Juicebox credits are held for pledgers.
5. **Claim** — each pledger `prepareClaim`s their proportional share (`contrib × tokens / ethTotal`) via Nox, then `claimTokens` with a public-decrypt proof to receive Juicebox unclaimed credits.

Individual pledges stay confidential until a pledger chooses to claim (claim reveals that user’s share). Settlement lands ETH in the real Juicebox protocol.

```
User wallet ──fund()/pledge()──► PrivateJuicebox (Nox handles)
                                      │
                                      │ settleToJuicebox() → beneficiary = PrivateJuicebox
                                      ▼
                         Juicebox ETH terminal (Sepolia)
                                      │
                                      │ claimTokens() ← proportional credits
                                      ▼
                                 Pledger wallets
```

## Repo layout

| Path | Purpose |
|------|---------|
| `contracts/` | `PrivateJuicebox.sol` + Hardhat 3 / Nox plugin |
| `web/` | Vite + React + wagmi + `@iexec-nox/handle` UI |
| `feedback.md` | Hackathon-required tooling feedback |

## Prerequisites

- Node.js 22+
- Docker (for local Nox Hardhat tests)
- Sepolia ETH + a wallet private key for deploy
- Browser wallet on Sepolia for the UI

## Contracts

```bash
cd contracts
cp .env.example .env   # set SEPOLIA_RPC_URL + SEPOLIA_PRIVATE_KEY
npm install
npm run compile
npm run deploy:sepolia
```

Sepolia addresses used:

| Contract | Address |
|----------|---------|
| Juicebox `JBETHPaymentTerminal3_1_2` | `0x55FF1D8093166c1fF9664efd613D8C543b95feFc` |
| Juicebox `JBTokenStore` | `0x25fdda0eBD9e979b8c1657780045Cf87392a14E4` |
| NoxCompute | `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF` |

After deploy, copy `PrivateJuicebox` address into `web/.env` as `VITE_PRIVATE_JUICEBOX`.

**Live Sepolia deploy (2026-07-29 — private proportional claims):**

| | |
|--|--|
| **PrivateJuicebox** | [`0xc37a6b7206944b0d33732972fc68c047e12bcce0`](https://sepolia.etherscan.io/address/0xc37a6b7206944b0d33732972fc68c047e12bcce0) |
| Deployer | `0x25b7a7d21ccf349fba8245209a25bbb36fbe4ffd` |
| Juicebox terminal | `0x55FF1D8093166c1fF9664efd613D8C543b95feFc` |
| Juicebox token store | `0x25fdda0eBD9e979b8c1657780045Cf87392a14E4` |

### Important notes

- **Funding tx value is visible once** (native ETH always is). After that, balances and pledges are Nox handles.
- Prefer **not** pledging your entire funded amount in one obvious pattern if you care about correlating fund size ↔ pledge size.
- `openSettlement` is **permissionless** once the project pot has pledges (so judges can finish the flow). `settleToJuicebox` is also permissionless after settlement is open (community can verify the publicDecrypt matches `amount`).
- Settle always pays Juicebox with **PrivateJuicebox as beneficiary**. Pledgers later claim proportional unclaimed credits via `prepareClaim` → Nox `publicDecrypt` → `claimTokens`.
- **Claiming reveals your share** (and thus your pledge size vs public totals). Amounts stay private until you choose to claim.
- Confirm a valid Juicebox **project ID on Sepolia** before settling (UI defaults to `1` — change it). Some projects may pause token transfers; claim needs `JBTokenStore.transferFrom` to succeed.

## Web app

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Flow in the UI: Connect → Fund → Pledge privately → Open settlement → Settle to Juicebox.

## Hackathon deliverables checklist

- [x] Public repo with open-source code
- [x] README with install / deploy / usage
- [x] Functional front-end
- [x] `feedback.md` for iExec / Nox tooling
- [ ] Deploy `PrivateJuicebox` to ETH Sepolia
- [ ] Demo video ≤ 4 min
- [ ] X post tagging `@iEx_ec`
- [ ] DoraHacks BUIDL submission

## License

MIT
