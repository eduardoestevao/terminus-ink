import { getExperimentsByAuthor, getAllAuthors } from "@/lib/data";
import ExperimentCard from "@/components/ExperimentCard";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getAllAuthors().map((username) => ({ username }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} — terminus.ink`,
    description: `Experiments by @${username}`,
  };
}

export default async function ResearcherPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const userExperiments = getExperimentsByAuthor(username);
  const authorName = userExperiments[0]?.authorName;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="mb-1 font-serif text-2xl text-text">
          {authorName || `@${username}`}
        </h1>
        {authorName && (
          <p className="font-mono text-sm text-text-muted">@{username}</p>
        )}
      </div>

      <div className="mb-4 font-mono text-xs text-text-muted">
        {userExperiments.length} experiment
        {userExperiments.length !== 1 && "s"}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {userExperiments.map((exp) => (
          <ExperimentCard key={exp.slug} experiment={exp} />
        ))}
      </div>
    </div>
  );
}
