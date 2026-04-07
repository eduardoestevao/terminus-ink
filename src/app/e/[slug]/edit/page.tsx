"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchExperiment, updateExperiment } from "@/lib/api";
import type { User } from "@supabase/supabase-js";
import type { Experiment } from "@/lib/types";

export default function EditPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [setup, setSetup] = useState("");
  const [resultsText, setResultsText] = useState("");
  const [keyFindingsText, setKeyFindingsText] = useState("");
  const [tags, setTags] = useState("");
  const [lessonLearned, setLessonLearned] = useState("");
  const [toolsUsed, setToolsUsed] = useState("");
  const [chainPrev, setChainPrev] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadExperiment = useCallback(async () => {
    try {
      const exp = await fetchExperiment(slug);
      if (!exp) {
        setError("Experiment not found");
        setLoading(false);
        return;
      }

      const hoursElapsed =
        (Date.now() - new Date(exp.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursElapsed > 48) {
        setError("This experiment can no longer be edited (48h window expired)");
        setLoading(false);
        return;
      }

      setExperiment(exp);
      setTitle(exp.title);
      setQuestion(exp.question);
      setSetup(exp.setup);
      setResultsText(
        [
          exp.results.headers.join("\t"),
          ...exp.results.rows.map((r: string[]) => r.join("\t")),
        ].join("\n")
      );
      setKeyFindingsText(exp.keyFindings.join("\n"));
      setTags(exp.tags.join(", "));
      setLessonLearned(exp.lessonLearned || "");
      setToolsUsed(exp.toolsUsed || "");
      setChainPrev(exp.chainPrev || "");
      setLoading(false);
    } catch {
      setError("Failed to load experiment");
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadExperiment();
  }, [loadExperiment]);

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/e/${slug}/edit`,
      },
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const keyFindings = keyFindingsText
        .split("\n")
        .map((s) => s.replace(/^[-\u2022\u2192]\s*/, "").trim())
        .filter(Boolean);

      const parsedTags = tags
        .split(/[\s,#]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const data: Record<string, unknown> = {
        title,
        question,
        setup,
        results: parseResultsTable(resultsText),
        keyFindings,
        tags: parsedTags,
      };

      if (lessonLearned.trim()) data.lessonLearned = lessonLearned.trim();
      if (toolsUsed.trim()) data.toolsUsed = toolsUsed.trim();
      if (chainPrev.trim()) data.chainPrev = chainPrev.trim();

      await updateExperiment(slug, data, token);
      setSuccess(true);
      setTimeout(() => router.push(`/e/${slug}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    );
  }

  if (error && !experiment) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="mb-4 text-sm text-negative">{error}</p>
        <Link
          href={`/e/${slug}`}
          className="font-mono text-xs text-gold transition-colors hover:text-gold-light"
        >
          &larr; Back to experiment
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-lg border border-gold/30 bg-gold-glow p-6 text-center">
          <h2 className="mb-2 font-serif text-xl text-text">
            Changes saved
          </h2>
          <p className="text-sm text-text-muted">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href={`/e/${slug}`}
        className="mb-6 inline-flex items-center gap-1.5 font-mono text-xs text-text-muted transition-colors hover:text-gold"
      >
        &larr; Back to experiment
      </Link>

      <h1 className="mb-2 font-serif text-2xl text-text">
        Edit {experiment?.id}
      </h1>
      <p className="mb-8 text-sm text-text-muted">
        Editable within 48 hours of creation. Author-only.
      </p>

      {!user ? (
        <div className="rounded-lg border border-border bg-surface px-6 py-12 text-center">
          <p className="mb-4 text-sm text-text-secondary">
            Sign in to edit this experiment.
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
          {error && (
            <div className="mb-6 rounded-lg border border-negative/30 bg-negative/5 px-4 py-3 text-sm text-negative">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <Field label="Title" value={title} onChange={setTitle} required />
            <Field label="Question" value={question} onChange={setQuestion} required />
            <Field label="Setup" value={setup} onChange={setSetup} textarea required />
            <Field
              label="Results (tab or | separated table)"
              value={resultsText}
              onChange={setResultsText}
              textarea
              required
            />
            <Field
              label="Key findings (one per line)"
              value={keyFindingsText}
              onChange={setKeyFindingsText}
              textarea
              required
            />
            <Field label="Tags (space or comma separated)" value={tags} onChange={setTags} required />
            <Field
              label="Lesson learned (optional)"
              value={lessonLearned}
              onChange={setLessonLearned}
              textarea
            />
            <Field
              label="Tools used (optional)"
              value={toolsUsed}
              onChange={setToolsUsed}
            />
            <Field
              label="Previous experiment slug (optional)"
              value={chainPrev}
              onChange={setChainPrev}
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg border border-gold/40 bg-gold-glow py-2.5 font-mono text-sm text-gold transition-all hover:border-gold hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
          className={`${base} min-h-24 resize-y`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      ) : (
        <input
          className={base}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
