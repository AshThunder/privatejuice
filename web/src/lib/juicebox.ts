/**
 * Resolve a Juicebox project ID from a raw number or juicebox.money URL.
 *
 * Supported:
 * - "42"
 * - "sep:28" / "eth:28" (chain-prefixed IDs)
 * - "https://sepolia.juicebox.money/v2/p/42"
 * - "https://sepolia.juicebox.money/v5/sep:28"
 * - "https://sepolia.juicebox.money/v3/sep:28"
 * - "https://juicebox.money/v2/p/42"
 * - ".../p/42/..." (any path segment after /p/)
 *
 * Handle URLs like /@myproject are not resolved here (need ENS/subgraph).
 */
export function parseJuiceboxProjectId(input: string): {
  id: string | null;
  error?: string;
} {
  const raw = input.trim();
  if (!raw) return { id: null };

  if (/^\d+$/.test(raw)) {
    return { id: raw.replace(/^0+(?=\d)/, "") || "0" };
  }

  // Bare chain-prefixed id: sep:28, eth:1, etc.
  const barePrefixed = raw.match(/^(?:sep|eth|base|op|arb):(\d+)$/i);
  if (barePrefixed) {
    return { id: barePrefixed[1] };
  }

  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    if (!host.includes("juicebox.money")) {
      return { id: null, error: "Not a juicebox.money URL" };
    }

    // Modern Sepolia / multi-chain paths: /v5/sep:28, /v3/sep:28, /sep:28
    const chainPrefixed = url.pathname.match(
      /\/(?:v\d+\/)?(?:sep|eth|base|op|arb):(\d+)/i
    );
    if (chainPrefixed) {
      return { id: chainPrefixed[1] };
    }

    // Legacy: /v2/p/123 or /p/123
    const pathMatch = url.pathname.match(/\/p\/(\d+)/i);
    if (pathMatch) {
      return { id: pathMatch[1] };
    }

    // Query params sometimes carry projectId
    const fromQuery =
      url.searchParams.get("projectId") ?? url.searchParams.get("id");
    if (fromQuery && /^\d+$/.test(fromQuery)) {
      return { id: fromQuery };
    }

    // /@handle — cannot resolve without subgraph/ENS
    if (/\/@[\w.-]+/i.test(url.pathname)) {
      return {
        id: null,
        error:
          "Handle URLs (@name) need the numeric ID — open the project and copy the URL (e.g. /v5/sep:28) or paste just 28",
      };
    }

    return {
      id: null,
      error: "Could not find a project ID — try /v5/sep:28, /v2/p/28, or just 28",
    };
  } catch {
    return { id: null, error: "Paste a project ID or juicebox.money URL" };
  }
}

export function juiceboxProjectUrl(projectId: string | number | bigint): string {
  return `https://sepolia.juicebox.money/v5/sep:${projectId.toString()}`;
}
