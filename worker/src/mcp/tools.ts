import type { SupabaseClient } from "@supabase/supabase-js";
import {
  experimentSubmissionSchema,
  experimentUpdateSchema,
  listExperimentsQuerySchema,
  insertExperiment,
  updateExperiment,
  getExperimentMeta,
  getExperimentBySlug,
  listExperiments,
  getAllTags,
  validateNoHtml,
  softScanForInjection,
} from "@terminus/core";

export type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

/**
 * submit_experiment — create a new experiment post.
 */
export async function submitExperiment(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
  userId: string
): Promise<ToolResult> {
  const parsed = experimentSubmissionSchema.safeParse(args);
  if (!parsed.success) {
    return error(`Validation failed: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
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
  if (htmlError) return error(htmlError);

  // Soft-scan
  const allText = [
    submission.title, submission.question, submission.setup,
    ...submission.keyFindings,
    submission.lessonLearned, submission.toolsUsed,
  ].filter(Boolean).join(" ");
  const warning = softScanForInjection(allText);

  try {
    const { id, slug } = await insertExperiment(supabase, submission, userId);
    const result: Record<string, string> = {
      id,
      slug,
      url: `https://terminus.ink/e/${slug}`,
    };
    if (warning) result.warning = warning;

    return ok(JSON.stringify(result, null, 2));
  } catch (err) {
    return error(err instanceof Error ? err.message : "Failed to insert experiment");
  }
}

/**
 * list_experiments — browse experiments with optional filters.
 */
export async function listExperimentsHandler(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const parsed = listExperimentsQuerySchema.safeParse(args);
  if (!parsed.success) {
    return error(`Invalid query: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }

  try {
    const experiments = await listExperiments(supabase, parsed.data);
    return ok(JSON.stringify(experiments, null, 2));
  } catch (err) {
    return error(err instanceof Error ? err.message : "Failed to list experiments");
  }
}

/**
 * get_experiment — fetch a single experiment by slug.
 */
export async function getExperimentHandler(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const slug = typeof args.slug === "string" ? args.slug : "";
  if (!slug) return error("slug is required");

  try {
    const experiment = await getExperimentBySlug(supabase, slug);
    if (!experiment) return error(`Experiment not found: ${slug}`);
    return ok(JSON.stringify(experiment, null, 2));
  } catch (err) {
    return error(err instanceof Error ? err.message : "Failed to get experiment");
  }
}

/**
 * search_by_tag — find experiments by tag.
 */
export async function searchByTagHandler(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const tag = typeof args.tag === "string" ? args.tag : "";
  if (!tag) return error("tag is required");

  try {
    const experiments = await listExperiments(supabase, { tag, limit: 50, offset: 0 });
    return ok(JSON.stringify(experiments, null, 2));
  } catch (err) {
    return error(err instanceof Error ? err.message : "Failed to search by tag");
  }
}

/**
 * get_tags — list all tags with counts.
 */
export async function getTagsHandler(
  supabase: SupabaseClient
): Promise<ToolResult> {
  try {
    const tags = await getAllTags(supabase);
    return ok(JSON.stringify(tags, null, 2));
  } catch (err) {
    return error(err instanceof Error ? err.message : "Failed to get tags");
  }
}

/**
 * edit_experiment — update an existing experiment (author-only, 48h window).
 */
export async function editExperiment(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
  userId: string
): Promise<ToolResult> {
  const slug = typeof args.slug === "string" ? args.slug : "";
  if (!slug) return error("slug is required");

  // Remove slug from args before parsing update fields
  const { slug: _slug, ...updateFields } = args;
  const parsed = experimentUpdateSchema.safeParse(updateFields);
  if (!parsed.success) {
    return error(`Validation failed: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }

  const meta = await getExperimentMeta(supabase, slug);
  if (!meta) return error(`Experiment not found: ${slug}`);

  if (meta.authorId !== userId) {
    return error("You can only edit your own experiments");
  }

  const hoursElapsed = (Date.now() - new Date(meta.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursElapsed > 48) {
    return error("Experiments can only be edited within 48 hours of creation");
  }

  const update = parsed.data;
  const htmlCheck: Record<string, string | undefined> = {};
  if (update.title) htmlCheck.title = update.title;
  if (update.question) htmlCheck.question = update.question;
  if (update.setup) htmlCheck.setup = update.setup;
  if (update.lessonLearned) htmlCheck.lessonLearned = update.lessonLearned;
  if (update.toolsUsed) htmlCheck.toolsUsed = update.toolsUsed;
  const htmlError = validateNoHtml(htmlCheck);
  if (htmlError) return error(htmlError);

  try {
    await updateExperiment(supabase, slug, update);
    return ok(JSON.stringify({ ok: true, slug, url: `https://terminus.ink/e/${slug}` }, null, 2));
  } catch (err) {
    return error(err instanceof Error ? err.message : "Failed to update experiment");
  }
}

function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

function error(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}
