import Link from "next/link";

export default function TagBadge({ tag }: { tag: string }) {
  return (
    <Link
      href={`/tags/${tag}`}
      className="inline-block rounded-md border border-border px-2 py-0.5 font-mono text-xs text-text-secondary transition-all hover:border-gold/40 hover:text-gold"
    >
      #{tag}
    </Link>
  );
}
