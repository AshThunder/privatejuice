export const SEPOLIA_CHAIN_ID = 11155111;

/** Filled after `npm run deploy:sepolia` in contracts/ — override via VITE_PRIVATE_JUICEBOX */
export const PRIVATE_JUICEBOX_ADDRESS = (import.meta.env
  .VITE_PRIVATE_JUICEBOX ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const JB_ETH_TERMINAL_SEPOLIA =
  "0x55FF1D8093166c1fF9664efd613D8C543b95feFc" as const;

export const JB_TOKEN_STORE_SEPOLIA =
  "0x25fdda0eBD9e979b8c1657780045Cf87392a14E4" as const;

export const NOX_COMPUTE_SEPOLIA =
  "0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF" as const;

/** Default Juicebox Sepolia project — change in the UI. Verify on juicebox.money (Sepolia). */
export const DEFAULT_PROJECT_ID = 1n;

export const PRIVATE_JUICEBOX_ABI = [
  {
    type: "function",
    name: "fund",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "pledge",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceHandleOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "projectPledgeHandle",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "contributionHandleOf",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "claimShareHandleOf",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "openSettlement",
    stateMutability: "nonpayable",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "settleToJuicebox",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "memo", type: "string" },
    ],
    outputs: [{ name: "jbTokenCount", type: "uint256" }],
  },
  {
    type: "function",
    name: "prepareClaim",
    stateMutability: "nonpayable",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ name: "shareHandle", type: "bytes32" }],
  },
  {
    type: "function",
    name: "claimTokens",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "decryptionProof", type: "bytes" },
    ],
    outputs: [{ name: "tokenCount", type: "uint256" }],
  },
  {
    type: "function",
    name: "escrowBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "heldCredits",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "settlementOpen",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "settled",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "settledAmount",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "settledTokenCount",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "pledgeCount",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "claimed",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "juiceTerminal",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "juiceTokenStore",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "event",
    name: "Funded",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "ethAmount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Pledged",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "projectId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "SettlementOpened",
    inputs: [
      { name: "projectId", type: "uint256", indexed: true },
      { name: "pledgeHandle", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SettledToJuicebox",
    inputs: [
      { name: "projectId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "beneficiary", type: "address", indexed: false },
      { name: "jbTokenCount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ClaimPrepared",
    inputs: [
      { name: "projectId", type: "uint256", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "shareHandle", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TokensClaimed",
    inputs: [
      { name: "projectId", type: "uint256", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "tokenCount", type: "uint256", indexed: false },
    ],
  },
] as const;
