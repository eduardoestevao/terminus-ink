"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { submitExperiment } from "@/lib/api";
import type { User } from "@supabase/supabase-js";

export default function SubmitPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    id: string;
    slug: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/submit` },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const form = new FormData(e.currentTarget);

      const keyFindings = (form.get("keyFindings") as string)
        .split("\n")
        .map((s) => s.replace(/^[-\u2022\u2192]\s*/, "").trim())
        .filter(Boolean);

      const tags = (form.get("tags") as string)
        .split(/[\s,#]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const data: Record<string, unknown> = {
        title: form.get("title"),
        question: form.get("question"),
        setup: form.get("setup"),
        results: parseResultsTable(form.get("results") as string),
        keyFindings,
        tags,
      };

      const lessonLearned = (form.get("lessonLearned") as string)?.trim();
      if (lessonLearned) data.lessonLearned = lessonLearned;

      const toolsUsed = (form.get("toolsUsed") as string)?.trim();
      if (toolsUsed) data.toolsUsed = toolsUsed;

      const chainPrev = (form.get("chainPrev") as string)?.trim();
      if (chainPrev) data.chainPrev = chainPrev;

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const result = await submitExperiment(data, token);
      setSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-lg border border-gold/30 bg-gold-glow p-6 text-center">
          <h2 className="mb-2 font-serif text-xl text-text">
            Experiment submitted
          </h2>
          <p className="mb-4 font-mono text-sm text-gold">{success.id}</p>
          <p className="text-sm text-text-muted">
            Your experiment will appear on the site after the next build.
          </p>
          <a
            href={success.url}
            className="mt-4 inline-block font-mono text-sm text-gold hover:text-gold-light transition-colors"
          >
            {success.url}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-2 font-serif text-2xl text-text">
        Submit an experiment
      </h1>
      <p className="mb-8 text-sm text-text-muted">
        Each post follows a fixed structure. Fill in the fields below.
      </p>

      {!user ? (
        <div className="rounded-lg border border-border bg-surface px-6 py-12 text-center">
          <p className="mb-4 text-sm text-text-secondary">
            Sign in with GitHub to submit experiments.
          </p>
          <button
            onClick={signIn}
            className="rounded-lg border border-gold/40 px-6 py-2.5 font-mono text-sm text-gold transition-all hover:border-gold hover:bg-gold-glow"
          >
            Sign in with GitHub
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
            <span className="font-mono text-sm text-text-secondary">
              Signed in as{" "}
              <span className="text-gold">
                @{user.user_metadata?.user_name || user.email}
              </span>
            </span>
            <button
              onClick={signOut}
              className="font-mono text-xs text-text-muted hover:text-text transition-colors"
            >
              Sign out
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-negative/30 bg-negative/5 px-4 py-3 text-sm text-negative">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Field
              name="title"
              label="Title"
              placeholder="Byte-Level Statistical Analysis of SSM vs Transformer"
              required
            />
            <Field
              name="question"
              label="Question"
              placeholder="One sentence. What are you testing?"
              required
            />
            <Field
              name="setup"
              label="Setup"
              placeholder="Dataset, hardware, config. Brief."
              textarea
              required
            />
            <Field
              name="results"
              label="Results (paste table: header row, then data rows, tab or | separated)"
              placeholder={"Model\tAccuracy\tLatency\nGPT-4\t92.1%\t340ms\nClaude\t94.3%\t280ms"}
              textarea
              required
            />
            <Field
              name="keyFindings"
              label="Key findings (one per line)"
              placeholder={"Claude outperformed GPT-4 by 2.2% on accuracy\nLatency was 18% lower for Claude\nBoth models struggled with edge cases"}
              textarea
              required
            />
            <Field
              name="tags"
              label="Tags (space or comma separated)"
              placeholder="llm benchmark accuracy latency"
              required
            />
            <Field
              name="lessonLearned"
              label="Lesson learned (optional)"
              placeholder="What would you do differently?"
              textarea
            />
            <Field
              name="toolsUsed"
              label="Tools used (optional)"
              placeholder="Declare AI assistance, hardware, frameworks"
            />
            <Field
              name="chainPrev"
              label="Previous experiment slug (optional)"
              placeholder="2026-04-05-initial-benchmark"
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg border border-gold/40 bg-gold-glow py-2.5 font-mono text-sm text-gold transition-all hover:border-gold hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit experiment"}
              </button>
              <p className="mt-2 text-center text-xs text-text-muted">
                Posts are permanent — no edits after 48 hours.
              </p>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  textarea,
  required,
}: {
  name: string;
  label: string;
  placeholder: string;
  textarea?: boolean;
  required?: boolean;
}) {
  const base =
    "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder:text-text-muted transition-colors focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20";
  return (
    <div>
      <label className="mb-1.5 block font-mono text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </label>
      {textarea ? (
        <textarea
          name={name}
          className={`${base} min-h-24 resize-y`}
          placeholder={placeholder}
          required={required}
        />
      ) : (
        <input
          name={name}
          className={base}
          placeholder={placeholder}
          required={required}
        />
      )}
    </div>
  );
}

function parseResultsTable(input: string): {
  headers: string[];
  rows: string[][];
} {
  const lines = input
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^[-|:\s]+$/.test(l));

  if (lines.length < 2) {
    return { headers: ["Result"], rows: [[input.trim()]] };
  }

  const separator = lines[0].includes("|") ? "|" : "\t";
  const parse = (line: string) =>
    line
      .split(separator)
      .map((c) => c.trim())
      .filter(Boolean);

  const headers = parse(lines[0]);
  const rows = lines.slice(1).map(parse);

  return { headers, rows };
}
