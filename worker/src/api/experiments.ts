import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import {
  experimentSubmissionSchema,
  listExperimentsQuerySchema,
  insertExperiment,
  getExperimentBySlug,
  listExperiments,
  validateNoHtml,
  softScanForInjection,
} from "@terminus/core";
import { requireAuth, type AuthContext } from "../auth/middleware";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

// GET /api/experiments — list experiments (public)
app.get("/", async (c) => {
  const query = listExperimentsQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json({ error: "Invalid query parameters", details: query.error.flatten() }, 400);
  }

  try {
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
    const experiments = await listExperiments(supabase, query.data);
    return c.json(experiments);
  } catch (err) {
    console.error("Failed to list experiments:", err);
    return c.json({ error: "Failed to fetch experiments" }, 500);
  }
});

// GET /api/experiments/:slug — get single experiment (public)
app.get("/:slug", async (c) => {
  try {
    const slug = c.req.param("slug");
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
    const experiment = await getExperimentBySlug(supabase, slug);

    if (!experiment) {
      return c.json({ error: "Experiment not found" }, 404);
    }
    return c.json(experiment);
  } catch (err) {
    console.error("Failed to get experiment:", err);
    return c.json({ error: "Failed to fetch experiment" }, 500);
  }
});

// POST /api/experiments — submit experiment (auth required)
app.post("/", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  // Validate schema
  const parsed = experimentSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const submission = parsed.data;

  // Reject raw HTML
  const htmlError = validateNoHtml({
    title: submission.title,
    question: submission.question,
    setup: submission.setup,
    lessonLearned: submission.lessonLearned,
    toolsUsed: submission.toolsUsed,
  });
  if (htmlError) {
    return c.json({ error: htmlError }, 400);
  }

  // Soft-scan for prompt injection (log warning, don't block)
  const allText = [
    submission.title,
    submission.question,
    submission.setup,
    ...submission.keyFindings,
    submission.lessonLearned,
    submission.toolsUsed,
  ]
    .filter(Boolean)
    .join(" ");
  const injectionWarning = softScanForInjection(allText);

  // Insert into database using service role (bypasses RLS)
  const auth = c.get("auth");
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { id, slug } = await insertExperiment(supabase, submission, auth.userId);

    return c.json(
      {
        id,
        slug,
        url: `https://terminus.ink/e/${slug}`,
        ...(injectionWarning ? { warning: injectionWarning } : {}),
      },
      201
    );
  } catch (err) {
    console.error("Failed to insert experiment:", err);
    return c.json({ error: "Failed to submit experiment" }, 500);
  }
});

export default app;
