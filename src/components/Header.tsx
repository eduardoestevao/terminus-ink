import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="terminus.ink"
            width={28}
            height={28}
            className="rounded"
          />
          <span className="font-serif text-lg text-gold">terminus.ink</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="text-text-secondary transition-colors hover:text-text"
          >
            Experiments
          </Link>
          <Link
            href="/tags"
            className="text-text-secondary transition-colors hover:text-text"
          >
            Tags
          </Link>
          <Link
            href="/about"
            className="text-text-secondary transition-colors hover:text-text"
          >
            About
          </Link>
          <Link
            href="/submit"
            className="rounded-md border border-gold/40 px-3.5 py-1.5 text-gold transition-all hover:border-gold hover:bg-gold-glow"
          >
            Submit
          </Link>
        </nav>
      </div>
    </header>
  );
}
