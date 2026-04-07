"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { href: "/", label: "Experiments" },
  { href: "/tags", label: "Tags" },
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
  { href: "/profile", label: "Profile" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

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

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-text-secondary transition-colors hover:text-text"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/submit"
            className="rounded-md border border-gold/40 px-3.5 py-1.5 text-gold transition-all hover:border-gold hover:bg-gold-glow"
          >
            Submit
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-8 w-8 flex-col items-center justify-center gap-1.5 md:hidden"
          aria-label="Toggle menu"
        >
          <span
            className={`h-px w-5 bg-text-secondary transition-all duration-200 ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
          />
          <span
            className={`h-px w-5 bg-text-secondary transition-all duration-200 ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-border bg-background px-6 pb-4 pt-2 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm text-text-secondary transition-colors hover:text-text"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/submit"
            onClick={() => setOpen(false)}
            className="mt-2 inline-block rounded-md border border-gold/40 px-3.5 py-1.5 text-sm text-gold transition-all hover:border-gold hover:bg-gold-glow"
          >
            Submit
          </Link>
        </nav>
      )}
    </header>
  );
}
