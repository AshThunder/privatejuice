/**
 * Resolve a Juicebox project ID from a raw number or juicebox.money URL.
 *
 * Supported:
 * - "42"
 * - "https://sepolia.juicebox.money/v2/p/42"
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

  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    if (!host.includes("juicebox.money")) {
      return { id: null, error: "Not a juicebox.money URL" };
    }

    // /v2/p/123 or /p/123
    const pathMatch = url.pathname.match(/\/p\/(\d+)/i);
    if (pathMatch) {
      return { id: pathMatch[1] };
    }

    // /@handle — cannot resolve without subgraph/ENS
    if (/\/@[\w.-]+/i.test(url.pathname)) {
      return {
        id: null,
        error:
          "Handle URLs (@name) need the numeric ID — open the project and copy from /v2/p/<id> in the address bar",
      };
    }

    return { id: null, error: "Could not find /p/<id> in that URL" };
  } catch {
    return { id: null, error: "Paste a project ID or juicebox.money URL" };
  }
}

export function juiceboxProjectUrl(projectId: string | number | bigint): string {
  return `https://sepolia.juicebox.money/v2/p/${projectId.toString()}`;
}
