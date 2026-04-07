import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, type AuthContext } from "../auth/middleware";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

// GET /api/profile — get current user's profile
app.get("/", requireAuth, async (c) => {
  try {
    const auth = c.get("auth");
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase
      .from("profiles")
      .select("username, name, affiliation, bio, created_at")
      .eq("id", auth.userId)
      .single();

    if (error || !data) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json(data);
  } catch (err) {
    console.error("Failed to get profile:", err);
    return c.json({ error: "Failed to get profile" }, 500);
  }
});

// PATCH /api/profile — update username
app.patch("/", requireAuth, async (c) => {
  try {
    const auth = c.get("auth");
    const body = await c.req.json().catch(() => ({}));
    const username = (body.username as string)?.trim()?.toLowerCase();

    if (!username || username.length < 2 || username.length > 40) {
      return c.json({ error: "Username must be 2-40 characters" }, 400);
    }

    if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(username)) {
      return c.json({ error: "Username must be lowercase alphanumeric (dots, hyphens, underscores allowed)" }, 400);
    }

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    // Check uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", auth.userId)
      .single();

    if (existing) {
      return c.json({ error: "Username already taken" }, 409);
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", auth.userId);

    if (error) {
      console.error("Failed to update username:", error);
      return c.json({ error: "Failed to update username" }, 500);
    }

    return c.json({ ok: true, username });
  } catch (err) {
    console.error("Failed to update profile:", err);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

export default app;
