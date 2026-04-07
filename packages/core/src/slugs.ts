/**
 * Generate a URL-friendly slug from a title and date.
 * Format: "2026-04-07-byte-level-statistical-analysis"
 */
export function generateSlug(title: string, date: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${date}-${slug}`;
}

/**
 * Generate the next experiment ID from a counter value.
 * Format: "EXP-001", "EXP-042", "EXP-1337"
 */
export function formatExperimentId(counter: number): string {
  return `EXP-${String(counter).padStart(3, "0")}`;
}
