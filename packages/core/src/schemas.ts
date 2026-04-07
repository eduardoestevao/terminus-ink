import { z } from "zod";
import { stripControlChars, normalizeTags } from "./security";

// --- Primitives ---

const safeString = (maxLen: number) =>
  z
    .string()
    .min(1, "Required")
    .max(maxLen)
    .transform(stripControlChars);

const tagSchema = z
  .string()
  .max(50)
  .regex(/^[a-z0-9-]+$/, "Tags must be lowercase alphanumeric with hyphens");

// --- Results table ---

const resultsSchema = z
  .object({
    headers: z.array(safeString(200)).min(1).max(20),
    rows: z.array(z.array(z.string().max(500))).min(1).max(200),
  })
  .refine(
    (data) => data.rows.every((row) => row.length === data.headers.length),
    { message: "Every row must have the same number of columns as headers" }
  );

// --- Experiment submission (from user/agent — no id, slug, or author) ---

export const experimentSubmissionSchema = z.object({
  title: safeString(200),
  question: safeString(5000),
  setup: safeString(5000),
  results: resultsSchema,
  keyFindings: z
    .array(safeString(1000))
    .min(1, "At least one finding required")
    .max(10),
  tags: z
    .array(z.string().max(50))
    .min(1, "At least one tag required")
    .max(20)
    .transform(normalizeTags),
  lessonLearned: safeString(5000).optional(),
  toolsUsed: safeString(2000).optional(),
  chainPrev: z.string().max(200).optional(),
});

export type ExperimentSubmission = z.infer<typeof experimentSubmissionSchema>;

// --- Experiment update (all fields optional) ---

export const experimentUpdateSchema = z.object({
  title: safeString(200).optional(),
  question: safeString(5000).optional(),
  setup: safeString(5000).optional(),
  results: resultsSchema.optional(),
  keyFindings: z
    .array(safeString(1000))
    .min(1, "At least one finding required")
    .max(10)
    .optional(),
  tags: z
    .array(z.string().max(50))
    .min(1, "At least one tag required")
    .max(20)
    .transform(normalizeTags)
    .optional(),
  lessonLearned: safeString(5000).optional(),
  toolsUsed: safeString(2000).optional(),
  chainPrev: z.string().max(200).optional(),
});

export type ExperimentUpdate = z.infer<typeof experimentUpdateSchema>;

// --- Full experiment (as stored in DB) ---

export const experimentSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  date: z.string(),
  question: z.string(),
  setup: z.string(),
  results: resultsSchema,
  keyFindings: z.array(z.string()),
  tags: z.array(z.string()),
  authorId: z.string().uuid(),
  authorUsername: z.string().optional(),
  authorName: z.string().optional(),
  chainPrev: z.string().nullable().optional(),
  chainNext: z.string().nullable().optional(),
  lessonLearned: z.string().nullable().optional(),
  toolsUsed: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  status: z.enum(["published", "pending_review"]).default("published"),
});

export type Experiment = z.infer<typeof experimentSchema>;

// --- Author / profile ---

export const profileSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  name: z.string(),
  affiliation: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

export type Profile = z.infer<typeof profileSchema>;

// --- Query params ---

export const listExperimentsQuerySchema = z.object({
  tag: z.string().max(50).optional(),
  author: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListExperimentsQuery = z.infer<typeof listExperimentsQuerySchema>;
