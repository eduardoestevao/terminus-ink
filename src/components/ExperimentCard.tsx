import Link from "next/link";
import type { Experiment } from "@/lib/types";

export default function ExperimentCard({ experiment }: { experiment: Experiment }) {
  const isNegativeResult = experiment.tags.includes("negative-result");

  return (
    <Link
      href={`/e/${experiment.slug}`}
      className="group block rounded-lg border border-border bg-surface p-5 transition-all hover:border-border-hover hover:bg-surface-2"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-xs font-medium text-gold">
          {experiment.id}
        </span>
        <time className="font-mono text-xs text-text-muted">
          {experiment.date}
        </time>
      </div>

      <h3 className="mb-2 text-sm font-medium leading-snug text-text group-hover:text-gold-light transition-colors">
        {experiment.title}
      </h3>

      <p className="mb-3 text-sm italic text-text-secondary leading-relaxed">
        {experiment.question}
      </p>

      <ul className="mb-4 space-y-1">
        {experiment.keyFindings.slice(0, 2).map((finding, i) => (
          <li
            key={i}
            className="text-xs leading-relaxed text-text-muted before:mr-1.5 before:text-gold/50 before:content-['→']"
          >
            {finding.length > 120 ? finding.slice(0, 120) + "…" : finding}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-1.5">
        {isNegativeResult && (
          <span className="inline-block rounded-md border border-negative/30 bg-negative/5 px-2 py-0.5 font-mono text-xs text-negative">
            #negative-result
          </span>
        )}
        {experiment.tags
          .filter((t) => t !== "negative-result")
          .slice(0, 4)
          .map((tag) => (
            <span
              key={tag}
              className="inline-block rounded-md border border-border px-2 py-0.5 font-mono text-xs text-text-secondary"
            >
              #{tag}
            </span>
          ))}
      </div>
    </Link>
  );
}
