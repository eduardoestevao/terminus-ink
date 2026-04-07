import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchExperimentBySlug } from "@/lib/api-server";
import TagBadge from "@/components/TagBadge";
import type { Metadata } from "next";
import type { Experiment } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const exp: Experiment | null = await fetchExperimentBySlug(slug);
  if (!exp) return { title: "Not found — terminus.ink" };
  return {
    title: `${exp.id}: ${exp.title} — terminus.ink`,
    description: exp.question,
  };
}

export default async function ExperimentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exp: Experiment | null = await fetchExperimentBySlug(slug);
  if (!exp) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted transition-colors hover:text-gold"
        >
          &larr; Experiments
        </Link>
        <div className="flex items-center gap-2">
          {isEditable(exp.createdAt) && (
            <Link
              href={`/e/${slug}/edit`}
              className="rounded border border-gold/30 px-2.5 py-1 font-mono text-xs text-gold/70 transition-colors hover:border-gold hover:text-gold"
            >
              Edit
            </Link>
          )}
          <Link
            href={`/e/${slug}/md`}
            target="_blank"
            className="rounded border border-border px-2.5 py-1 font-mono text-xs text-text-muted transition-colors hover:border-border-hover hover:text-text-secondary"
            title="View as raw Markdown (for LLM ingestion)"
          >
            /md
          </Link>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-sm font-medium text-gold">
            {exp.id}
          </span>
          <time className="font-mono text-xs text-text-muted">{exp.date}</time>
        </div>
        <h1 className="mb-3 font-serif text-2xl leading-snug text-text">
          {exp.title}
        </h1>
        {exp.authorUsername && (
          <Link
            href={`/r/${exp.authorUsername}`}
            className="font-mono text-sm text-gold/80 hover:text-gold transition-colors"
          >
            @{exp.authorUsername}
          </Link>
        )}

        {exp.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {exp.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </div>

      <Section label="Question">
        <p className="text-sm italic leading-relaxed text-text-secondary">
          {exp.question}
        </p>
      </Section>

      <Section label="Setup">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
          {exp.setup}
        </p>
      </Section>

      <Section label="Results">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {exp.results.headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left font-mono text-xs font-medium uppercase tracking-wider text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exp.results.rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="px-3 py-2 font-mono text-sm text-text-secondary"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section label="Key findings">
        <ul className="space-y-2">
          {exp.keyFindings.map((finding, i) => (
            <li
              key={i}
              className="text-sm leading-relaxed text-text-secondary before:mr-2 before:text-gold/60 before:content-['→']"
            >
              {highlightMetrics(finding)}
            </li>
          ))}
        </ul>
      </Section>

      {exp.lessonLearned && (
        <Section label="Lesson learned">
          <p className="text-sm leading-relaxed text-text-secondary">
            {exp.lessonLearned}
          </p>
        </Section>
      )}

      {exp.toolsUsed && (
        <Section label="Tools used">
          <p className="text-sm leading-relaxed text-text-secondary">
            {exp.toolsUsed}
          </p>
        </Section>
      )}

      {(exp.chainPrev || exp.chainNext) && (
        <Section label="Experiment chain">
          <div className="flex gap-4 text-sm">
            {exp.chainPrev && (
              <Link
                href={`/e/${exp.chainPrev}`}
                className="text-gold hover:text-gold-light transition-colors"
              >
                &larr; Previous
              </Link>
            )}
            {exp.chainNext && (
              <Link
                href={`/e/${exp.chainNext}`}
                className="text-gold hover:text-gold-light transition-colors"
              >
                Next &rarr;
              </Link>
            )}
          </div>
        </Section>
      )}

    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-mono text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </h2>
      {children}
    </section>
  );
}

function isEditable(createdAt?: string): boolean {
  if (!createdAt) return false;
  const hoursElapsed =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return hoursElapsed <= 48;
}

/**
 * Auto-bold numbers with units in key findings text.
 * Matches patterns like: 0.776 BPB, 100M, 23%, 14×, 2M→100M, ~3×, etc.
 */
function highlightMetrics(text: string): React.ReactNode[] {
  const pattern = /~?\d[\d,.]*(?:\s*[→–-]\s*~?\d[\d,.]*)?(?:\s*[×xX%]|\s*(?:BPB|BPC|GB|MB|TB|ms|fps|params|M|B|K)\b)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="text-text font-medium">
        {match[0]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
