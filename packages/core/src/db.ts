import type { SupabaseClient } from "@supabase/supabase-js";
import type { Experiment, Profile, ListExperimentsQuery } from "./schemas";
import { generateSlug, formatExperimentId } from "./slugs";
import type { ExperimentSubmission, ExperimentUpdate } from "./schemas";

/**
 * Get the next experiment ID atomically.
 */
export async function getNextExperimentId(
  supabase: SupabaseClient
): Promise<string> {
  const { data, error } = await supabase.rpc("increment_counter", {
    counter_name: "experiment_id",
  });
  if (error) throw new Error(`Failed to get next experiment ID: ${error.message}`);
  return formatExperimentId(data as number);
}

/**
 * Insert a new experiment.
 */
export async function insertExperiment(
  supabase: SupabaseClient,
  submission: ExperimentSubmission,
  authorId: string
): Promise<{ id: string; slug: string }> {
  const id = await getNextExperimentId(supabase);
  const date = new Date().toISOString().split("T")[0];
  const slug = generateSlug(submission.title, date);

  const { error } = await supabase.from("experiments").insert({
    id,
    slug,
    title: submission.title,
    date,
    question: submission.question,
    setup: submission.setup,
    results_json: submission.results,
    key_findings: submission.keyFindings,
    tags: submission.tags,
    author_id: authorId,
    chain_prev: submission.chainPrev || null,
    lesson_learned: submission.lessonLearned || null,
    tools_used: submission.toolsUsed || null,
  });

  if (error) throw new Error(`Failed to insert experiment: ${error.message}`);
  return { id, slug };
}

/**
 * Get experiment metadata (author_id, created_at) for auth/edit checks.
 */
export async function getExperimentMeta(
  supabase: SupabaseClient,
  slug: string
): Promise<{ authorId: string; createdAt: string } | null> {
  const { data, error } = await supabase
    .from("experiments")
    .select("author_id, created_at")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return { authorId: data.author_id, createdAt: data.created_at };
}

/**
 * Update an existing experiment (partial update).
 */
export async function updateExperiment(
  supabase: SupabaseClient,
  slug: string,
  update: ExperimentUpdate
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (update.title !== undefined) row.title = update.title;
  if (update.question !== undefined) row.question = update.question;
  if (update.setup !== undefined) row.setup = update.setup;
  if (update.results !== undefined) row.results_json = update.results;
  if (update.keyFindings !== undefined) row.key_findings = update.keyFindings;
  if (update.tags !== undefined) row.tags = update.tags;
  if (update.lessonLearned !== undefined) row.lesson_learned = update.lessonLearned;
  if (update.toolsUsed !== undefined) row.tools_used = update.toolsUsed;
  if (update.chainPrev !== undefined) row.chain_prev = update.chainPrev || null;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from("experiments")
    .update(row)
    .eq("slug", slug);

  if (error) throw new Error(`Failed to update experiment: ${error.message}`);
}

/**
 * Get a single experiment by slug.
 */
export async function getExperimentBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<Experiment | null> {
  const { data, error } = await supabase
    .from("experiments")
    .select("*, profiles!experiments_author_id_fkey(username, name)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) return null;
  return mapExperimentRow(data);
}

/**
 * List experiments with optional filters.
 */
export async function listExperiments(
  supabase: SupabaseClient,
  query: ListExperimentsQuery
): Promise<Experiment[]> {
  let q = supabase
    .from("experiments")
    .select("*, profiles!experiments_author_id_fkey(username, name)")
    .eq("status", "published")
    .order("date", { ascending: false })
    .range(query.offset, query.offset + query.limit - 1);

  if (query.tag) {
    q = q.contains("tags", [query.tag]);
  }
  if (query.author) {
    q = q.eq("profiles.username", query.author);
  }

  const { data, error } = await q;
  if (error) throw new Error(`Failed to list experiments: ${error.message}`);
  return (data || []).map(mapExperimentRow);
}

/**
 * Get all tags with counts.
 */
export async function getAllTags(
  supabase: SupabaseClient
): Promise<{ tag: string; count: number }[]> {
  const { data, error } = await supabase
    .from("experiments")
    .select("tags")
    .eq("status", "published");

  if (error) throw new Error(`Failed to get tags: ${error.message}`);

  const tagMap = new Map<string, number>();
  for (const row of data || []) {
    const tags = row.tags as string[];
    for (const tag of tags) {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    }
  }

  return Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Verify an API key and return the associated user_id.
 */
export async function verifyApiKey(
  supabase: SupabaseClient,
  keyHash: string
): Promise<{ userId: string; username: string } | null> {
  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id, profiles!api_keys_user_id_fkey(username)")
    .eq("key_hash", keyHash)
    .eq("revoked", false)
    .single();

  if (error || !data) return null;

  // Update last_used
  await supabase
    .from("api_keys")
    .update({ last_used: new Date().toISOString() })
    .eq("key_hash", keyHash);

  const profile = data.profiles as unknown as { username: string };
  return { userId: data.user_id, username: profile.username };
}

/**
 * Get profile by user ID.
 */
export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    username: data.username,
    name: data.name,
    affiliation: data.affiliation,
    bio: data.bio,
    createdAt: data.created_at,
  };
}

// --- Helpers ---

function mapExperimentRow(row: Record<string, unknown>): Experiment {
  const profile = row.profiles as { username: string; name: string } | null;
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    date: row.date as string,
    question: row.question as string,
    setup: row.setup as string,
    results: row.results_json as Experiment["results"],
    keyFindings: row.key_findings as string[],
    tags: row.tags as string[],
    authorId: row.author_id as string,
    authorUsername: profile?.username,
    authorName: profile?.name,
    chainPrev: row.chain_prev as string | null,
    chainNext: row.chain_next as string | null,
    lessonLearned: row.lesson_learned as string | null,
    toolsUsed: row.tools_used as string | null,
    createdAt: row.created_at as string,
    status: row.status as "published" | "pending_review",
  };
}
