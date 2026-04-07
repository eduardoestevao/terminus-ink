import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import { getAllTags } from "@terminus/core";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

// GET /api/tags — list all tags with counts (public)
app.get("/", async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  const tags = await getAllTags(supabase);
  return c.json(tags);
});

export default app;
