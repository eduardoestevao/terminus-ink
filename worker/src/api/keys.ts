import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, hashApiKey, type AuthContext } from "../auth/middleware";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

// GET /api/keys — list current user's API keys
app.get("/", requireAuth, async (c) => {
  try {
    const auth = c.get("auth");
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, label, created_at, last_used, revoked")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to list keys:", error);
      return c.json({ error: "Failed to list keys" }, 500);
    }

    return c.json(data || []);
  } catch (err) {
    console.error("Failed to list keys:", err);
    return c.json({ error: "Failed to list keys" }, 500);
  }
});

// POST /api/keys — create a new API key
app.post("/", requireAuth, async (c) => {
  try {
    const auth = c.get("auth");
    const body = await c.req.json().catch(() => ({}));
    const label = (body.label as string)?.trim()?.slice(0, 100) || "default";

    // Generate a random API key
    const rawKey = generateApiKey();
    const keyHash = await hashApiKey(rawKey);

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase.from("api_keys").insert({
      key_hash: keyHash,
      user_id: auth.userId,
      label,
    });

    if (error) {
      console.error("Failed to create key:", error);
      return c.json({ error: "Failed to create key" }, 500);
    }

    // Return the raw key ONCE — it's hashed in the DB and can never be retrieved again
    return c.json({ key: rawKey, label }, 201);
  } catch (err) {
    console.error("Failed to create key:", err);
    return c.json({ error: "Failed to create key" }, 500);
  }
});

// DELETE /api/keys/:id — revoke a key
app.delete("/:id", requireAuth, async (c) => {
  try {
    const auth = c.get("auth");
    const keyId = c.req.param("id");
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase
      .from("api_keys")
      .update({ revoked: true })
      .eq("id", keyId)
      .eq("user_id", auth.userId);

    if (error) {
      console.error("Failed to revoke key:", error);
      return c.json({ error: "Failed to revoke key" }, 500);
    }

    return c.json({ ok: true });
  } catch (err) {
    console.error("Failed to revoke key:", err);
    return c.json({ error: "Failed to revoke key" }, 500);
  }
});

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "tink_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default app;
