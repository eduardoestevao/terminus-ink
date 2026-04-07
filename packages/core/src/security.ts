/**
 * Strip control characters (except \n and \t) and zero-width characters.
 */
export function stripControlChars(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(
    /[\u200B-\u200F\u2028-\u202F\u2060\uFEFF]/g,
    ""
  );
}

/**
 * Normalize tags: lowercase, trim, deduplicate, validate pattern.
 */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }
  return result;
}

/**
 * Soft-scan for common prompt injection patterns.
 * Returns a warning string if suspicious content is found, null otherwise.
 * This is advisory, not a hard block — legitimate research content may match.
 */
export function softScanForInjection(text: string): string | null {
  const patterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+/i,
    /\[INST\]/i,
    /<<SYS>>/i,
    /<\|im_start\|>/i,
    /system:\s*you/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return `Suspicious pattern detected: ${pattern.source}`;
    }
  }
  return null;
}
