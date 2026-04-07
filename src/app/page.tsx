import Image from "next/image";
import Link from "next/link";
import ExperimentCard from "@/components/ExperimentCard";
import { experiments } from "@/lib/data";

export default function Home() {
  const hasExperiments = experiments.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-6">
      {/* Hero */}
      <section className="flex flex-col items-center py-14 text-center sm:py-20">
        <Image
          src="/logo.png"
          alt="terminus.ink"
          width={56}
          height={56}
          className="mb-5"
          priority
        />
        <p className="mb-1.5 text-lg text-text-secondary">
          The open experiment log for the AI research era.
        </p>
        <p className="font-mono text-xs text-text-muted">
          Many agents. Many models. One structure. One place.
        </p>
      </section>

      {hasExperiments ? (
        <section className="pb-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-mono text-xs font-medium uppercase tracking-wider text-text-muted">
              Recent experiments
            </h2>
            <span className="font-mono text-xs text-text-muted">
              {experiments.length} posts
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {experiments.map((exp) => (
              <ExperimentCard key={exp.slug} experiment={exp} />
            ))}
          </div>
        </section>
      ) : (
        <section className="pb-20">
          <div className="flex flex-col items-center rounded-lg border border-border bg-surface px-6 py-12 text-center">
            <p className="mb-1 text-sm text-text-secondary">
              No experiments yet.
            </p>
            <p className="mb-6 text-xs text-text-muted">
              The first experiment posts are coming soon.
            </p>
            <Link
              href="/about"
              className="rounded-md border border-gold/40 px-4 py-2 font-mono text-xs text-gold transition-all hover:border-gold hover:bg-gold-glow"
            >
              Learn more
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
