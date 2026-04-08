import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import {
  experimentSubmissionSchema,
  experimentUpdateSchema,
  listExperimentsQuerySchema,
  insertExperiment,
  updateExperiment,
  getExperimentMeta,
  getExperimentBySlug,
  listExperiments,
  validateNoHtml,
  softScanForInjection,
} from "@terminus/core";
import { requireAuth, type AuthContext } from "../auth/middleware";
import { postTweet, formatExperimentTweet } from "../twitter";
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

    // Tweet about the new experiment (fire-and-forget)
    if (c.env.TWITTER_API_KEY && c.env.TWITTER_ACCESS_TOKEN) {
      const tweet = formatExperimentTweet({
        id,
        title: submission.title,
        question: submission.question,
        tags: submission.tags,
        slug,
      });
      postTweet(tweet, {
        apiKey: c.env.TWITTER_API_KEY,
        apiSecret: c.env.TWITTER_API_SECRET!,
        accessToken: c.env.TWITTER_ACCESS_TOKEN,
        accessTokenSecret: c.env.TWITTER_ACCESS_TOKEN_SECRET!,
      }).catch((err) => console.error("Failed to tweet:", err));
    }

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

// PUT /api/experiments/:slug — edit experiment (auth required, author-only, 48h window)
app.put("/:slug", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = experimentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const slug = c.req.param("slug");
  const auth = c.get("auth");
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  // Check experiment exists and get metadata
  const meta = await getExperimentMeta(supabase, slug);
  if (!meta) {
    return c.json({ error: "Experiment not found" }, 404);
  }

  // Author-only
  if (meta.authorId !== auth.userId) {
    return c.json({ error: "You can only edit your own experiments" }, 403);
  }

  // 48h window
  const createdAt = new Date(meta.createdAt).getTime();
  const now = Date.now();
  const hoursElapsed = (now - createdAt) / (1000 * 60 * 60);
  if (hoursElapsed > 48) {
    return c.json({ error: "Experiments can only be edited within 48 hours of creation" }, 403);
  }

  const update = parsed.data;

  // Reject raw HTML in updated fields
  const htmlCheck: Record<string, string | undefined> = {};
  if (update.title) htmlCheck.title = update.title;
  if (update.question) htmlCheck.question = update.question;
  if (update.setup) htmlCheck.setup = update.setup;
  if (update.lessonLearned) htmlCheck.lessonLearned = update.lessonLearned;
  if (update.toolsUsed) htmlCheck.toolsUsed = update.toolsUsed;
  const htmlError = validateNoHtml(htmlCheck);
  if (htmlError) {
    return c.json({ error: htmlError }, 400);
  }

  try {
    await updateExperiment(supabase, slug, update);
    return c.json({ ok: true, slug });
  } catch (err) {
    console.error("Failed to update experiment:", err);
    return c.json({ error: "Failed to update experiment" }, 500);
  }
});

export default app;
