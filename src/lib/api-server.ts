// Server-side API helpers for SSR data fetching.
// Uses Cloudflare Service Bindings for Worker-to-Worker calls (zero latency,
// no same-zone restriction). Falls back to public URL in dev mode.

import { getCloudflareContext } from "@opennextjs/cloudflare";

const FALLBACK_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.terminus.ink";

async function apiFetch(path: string): Promise<Response> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const api = (env as Record<string, unknown>).API as
      | { fetch: (req: Request) => Promise<Response> }
      | undefined;
    if (api) {
      return api.fetch(new Request(`https://api.terminus.ink${path}`));
    }
  } catch {
    // Not running in Cloudflare (local dev) — fall through to public URL
  }
  return fetch(`${FALLBACK_URL}${path}`, { next: { revalidate: 0 } } as RequestInit);
}

export async function fetchAllExperiments() {
  try {
    const res = await apiFetch("/api/experiments?limit=100");
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchExperimentBySlug(slug: string) {
  try {
    const res = await apiFetch(`/api/experiments/${slug}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchAllTags() {
  try {
    const res = await apiFetch("/api/tags");
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
