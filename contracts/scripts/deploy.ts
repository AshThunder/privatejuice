/**
 * Deploy PrivateJuicebox to Ethereum Sepolia.
 *
 * Usage:
 *   SEPOLIA_RPC_URL=... SEPOLIA_PRIVATE_KEY=... npx hardhat run scripts/deploy.ts --network sepolia
 *
 * Juicebox Sepolia:
 *   JBETHPaymentTerminal3_1_2  0x55FF1D8093166c1fF9664efd613D8C543b95feFc
 *   JBTokenStore               0x25fdda0eBD9e979b8c1657780045Cf87392a14E4
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { network } from "hardhat";

const JB_ETH_TERMINAL_SEPOLIA =
  "0x55FF1D8093166c1fF9664efd613D8C543b95feFc" as const;

const JB_TOKEN_STORE_SEPOLIA =
  "0x25fdda0eBD9e979b8c1657780045Cf87392a14E4" as const;

const NOX_COMPUTE_SEPOLIA =
  "0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF" as const;

async function main() {
  const { viem } = await network.connect();
  const [wallet] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log("Deployer:", wallet.account.address);
  console.log("Chain id:", await publicClient.getChainId());
  console.log("Juicebox terminal:", JB_ETH_TERMINAL_SEPOLIA);
  console.log("Juicebox token store:", JB_TOKEN_STORE_SEPOLIA);

  const contract = await viem.deployContract("PrivateJuicebox", [
    JB_ETH_TERMINAL_SEPOLIA,
    JB_TOKEN_STORE_SEPOLIA,
  ]);

  console.log("PrivateJuicebox deployed:", contract.address);

  const outDir = join(process.cwd(), "deployments");
  mkdirSync(outDir, { recursive: true });
  const payload = {
    network: "sepolia",
    chainId: 11155111,
    privateJuicebox: contract.address,
    juiceTerminal: JB_ETH_TERMINAL_SEPOLIA,
    juiceTokenStore: JB_TOKEN_STORE_SEPOLIA,
    noxCompute: NOX_COMPUTE_SEPOLIA,
    deployer: wallet.account.address,
    deployedAt: new Date().toISOString(),
  };
  writeFileSync(
    join(outDir, "sepolia.json"),
    JSON.stringify(payload, null, 2)
  );
  console.log("Wrote deployments/sepolia.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
