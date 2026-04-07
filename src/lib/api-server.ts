// Server-side API helpers for SSR data fetching.
// Uses the workers.dev URL for server-to-server calls because Cloudflare
// Workers can't fetch other Workers on the same zone via custom domains.

const API_URL =
  process.env.SERVER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://terminus-api.tydor-eduardo.workers.dev";

export async function fetchAllExperiments() {
  try {
    const res = await fetch(`${API_URL}/api/experiments?limit=100`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchExperimentBySlug(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/experiments/${slug}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchAllTags() {
  try {
    const res = await fetch(`${API_URL}/api/tags`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
