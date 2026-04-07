import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import { getAllTags } from "@terminus/core";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

// GET /api/tags — list all tags with counts (public)
app.get("/", async (c) => {
  try {
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
    const tags = await getAllTags(supabase);
    return c.json(tags);
  } catch (err) {
    console.error("Failed to get tags:", err);
    return c.json({ error: "Failed to fetch tags" }, 500);
  }
});

export default app;
