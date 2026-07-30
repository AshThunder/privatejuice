# Private Juice — web app

Vite + React + wagmi + `@iexec-nox/handle` frontend for [Private Juice](../README.md).

## Local dev

```bash
cp .env.example .env   # set VITE_PRIVATE_JUICEBOX
npm install
npm run dev
```

## Vercel

If the project was imported from the monorepo root, either:

1. **Recommended:** Project Settings → General → **Root Directory** → `web`, then redeploy, **or**
2. Use the repo-root [`vercel.json`](../vercel.json) (builds `web/` automatically).

Add environment variables in Vercel → Settings → Environment Variables:

| Variable | Example |
|----------|---------|
| `VITE_PRIVATE_JUICEBOX` | `0xc37a6b7206944b0d33732972fc68c047e12bcce0` |
| `VITE_SEPOLIA_RPC_URL` | `https://ethereum-sepolia-rpc.publicnode.com` |

Redeploy after changing env vars or config.
