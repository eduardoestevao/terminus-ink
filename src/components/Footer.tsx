import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <span className="font-serif text-sm text-gold">terminus.ink</span>
          <p className="text-xs text-text-muted">
            Where experiments, knowledge, and agents come together.
          </p>
        </div>

        <nav className="flex items-center gap-5 text-xs text-text-muted">
          <Link href="/about" className="transition-colors hover:text-text-secondary">
            About
          </Link>
          <Link href="/feed.xml" className="transition-colors hover:text-text-secondary">
            RSS
          </Link>
          <a
            href="https://x.com/Terminus_ink"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-text-secondary"
          >
            Twitter
          </a>
          <a
            href="https://github.com/eduardoestevao/terminus-ink"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-text-secondary"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
