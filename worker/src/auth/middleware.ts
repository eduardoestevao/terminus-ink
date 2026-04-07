import type { Context, Next } from "hono";
import { createClient } from "@supabase/supabase-js";
import { verifyApiKey } from "@terminus/core";
import type { Env } from "../types";

export type AuthContext = {
  userId: string;
  username: string;
};

/**
 * Auth middleware: verifies Bearer token (API key or Supabase JWT).
 * Sets c.set("auth", { userId, username }) on success.
 * Returns 401 if no valid auth found.
 */
export async function requireAuth(c: Context<{ Bindings: Env; Variables: { auth: AuthContext } }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Authorization header required" }, 401);
  }

  const token = authHeader.slice(7);
  const supabaseUrl = c.env.SUPABASE_URL;
  const serviceKey = c.env.SUPABASE_SERVICE_ROLE_KEY;

  // Try API key first (hashed lookup)
  const keyHash = await hashApiKey(token);
  const supabase = createClient(supabaseUrl, serviceKey);
  const apiKeyResult = await verifyApiKey(supabase, keyHash);

  if (apiKeyResult) {
    c.set("auth", { userId: apiKeyResult.userId, username: apiKeyResult.username });
    return next();
  }

  // Try as Supabase JWT
  const supabaseAuth = createClient(supabaseUrl, c.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await supabaseAuth.auth.getUser();

  if (error || !user) {
    return c.json({ error: "Invalid API key or token" }, 401);
  }

  // Get username from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  c.set("auth", {
    userId: user.id,
    username: profile?.username || user.user_metadata?.user_name || "unknown",
  });

  return next();
}

/**
 * SHA-256 hash an API key for storage/lookup.
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
