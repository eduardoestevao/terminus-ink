import { getExperimentsByTag, getAllTags } from "@/lib/data";
import ExperimentCard from "@/components/ExperimentCard";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getAllTags().map(({ tag }) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `#${tag} — terminus.ink`,
    description: `Experiments tagged #${tag}`,
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const tagExperiments = getExperimentsByTag(tag);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="mb-1 font-mono text-2xl text-gold">#{tag}</h1>
        <p className="text-sm text-text-muted">
          {tagExperiments.length} experiment
          {tagExperiments.length !== 1 && "s"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tagExperiments.map((exp) => (
          <ExperimentCard key={exp.slug} experiment={exp} />
        ))}
      </div>
    </div>
  );
}
