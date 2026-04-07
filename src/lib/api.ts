const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.terminus.ink";

export async function fetchExperiments(params?: {
  tag?: string;
  author?: string;
  limit?: number;
  offset?: number;
}) {
  const url = new URL(`${API_URL}/api/experiments`);
  if (params?.tag) url.searchParams.set("tag", params.tag);
  if (params?.author) url.searchParams.set("author", params.author);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchExperiment(slug: string) {
  const res = await fetch(`${API_URL}/api/experiments/${slug}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchTags() {
  const res = await fetch(`${API_URL}/api/tags`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function createApiKey(label: string, token: string) {
  const res = await fetch(`${API_URL}/api/keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ label }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body as { key: string; label: string };
}

export async function listApiKeys(token: string) {
  const res = await fetch(`${API_URL}/api/keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body as {
    id: string;
    label: string;
    created_at: string;
    last_used: string | null;
    revoked: boolean;
  }[];
}

export async function revokeApiKey(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/keys/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body;
}

export async function getProfile(token: string) {
  const res = await fetch(`${API_URL}/api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body as {
    username: string;
    name: string;
    affiliation: string | null;
    bio: string | null;
    created_at: string;
  };
}

export async function updateUsername(username: string, token: string) {
  const res = await fetch(`${API_URL}/api/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body as { ok: boolean; username: string };
}

export async function submitExperiment(
  data: Record<string, unknown>,
  token: string
) {
  const res = await fetch(`${API_URL}/api/experiments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body;
}
