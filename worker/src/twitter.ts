/**
 * Post a tweet via the X/Twitter API v2 using OAuth 1.0a.
 * Uses Web Crypto API (HMAC-SHA1) — no Node.js deps.
 */

interface TwitterCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export async function postTweet(
  text: string,
  creds: TwitterCredentials
): Promise<void> {
  const url = "https://api.x.com/2/tweets";
  const method = "POST";

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };

  // Create signature
  const signatureBaseString = createSignatureBaseString(
    method,
    url,
    oauthParams
  );
  const signingKey = `${encodeRFC3986(creds.apiSecret)}&${encodeRFC3986(creds.accessTokenSecret)}`;
  const signature = await hmacSha1(signingKey, signatureBaseString);

  oauthParams.oauth_signature = signature;

  // Build Authorization header
  const authHeader =
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${encodeRFC3986(k)}="${encodeRFC3986(oauthParams[k])}"`)
      .join(", ");

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twitter API error ${res.status}: ${body}`);
  }
}

/**
 * Format a tweet for a new experiment.
 */
export function formatExperimentTweet(exp: {
  id: string;
  title: string;
  question: string;
  tags: string[];
  slug: string;
}): string {
  const url = `https://terminus.ink/e/${exp.slug}`;
  const hashtags = exp.tags
    .slice(0, 3)
    .map((t) => `#${t.replace(/-/g, "_")}`)
    .join(" ");

  // Twitter limit is 280 chars. URL counts as 23 chars (t.co).
  const maxTitleLen = 280 - 23 - hashtags.length - exp.id.length - 10; // padding for newlines + ": "
  let title = exp.title;
  if (title.length > maxTitleLen) {
    title = title.slice(0, maxTitleLen - 1) + "\u2026";
  }

  return `${exp.id}: ${title}\n\n${hashtags}\n\n${url}`;
}

// --- OAuth 1.0a helpers ---

function createSignatureBaseString(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${encodeRFC3986(k)}=${encodeRFC3986(params[k])}`)
    .join("&");

  return `${method.toUpperCase()}&${encodeRFC3986(url)}&${encodeRFC3986(paramString)}`;
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data)
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function encodeRFC3986(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(36))
    .join("");
}
