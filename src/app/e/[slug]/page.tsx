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
            className="font-mono text-sm text-text-secondary hover:text-gold transition-colors"
          >
            @{exp.authorUsername}
          </Link>
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
              {finding}
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

      <div className="mt-8 flex flex-wrap gap-2">
        {exp.tags.map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>
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
