import Link from "next/link";
import { fetchAllTags } from "@/lib/api-server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tags — terminus.ink",
  description: "Browse experiments by tag",
};

export default async function TagsPage() {
  const tags: { tag: string; count: number }[] = await fetchAllTags();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-2 font-serif text-2xl text-text">Tags</h1>
      <p className="mb-8 text-sm text-text-muted">
        Browse experiments by topic.
      </p>

      {tags.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map(({ tag, count }) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition-all hover:border-border-hover hover:bg-surface-2"
            >
              <span className="font-mono text-sm text-text-secondary transition-colors group-hover:text-gold">
                #{tag}
              </span>
              <span className="font-mono text-xs text-text-muted">
                {count} exp{count !== 1 && "s"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-text-muted">
            Tags will appear here as experiments are published.
          </p>
        </div>
      )}
    </div>
  );
}
