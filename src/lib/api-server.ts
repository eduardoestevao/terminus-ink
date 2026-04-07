// Server-side API helpers for build-time data fetching
// Used by generateStaticParams and page components during next build

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.terminus.ink";

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
