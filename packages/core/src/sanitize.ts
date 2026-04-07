/**
 * Sanitize text fields for safe storage and display.
 * For now this is a simple HTML-entity escape.
 * When we add markdown rendering on the frontend, we'll use rehype-sanitize there.
 *
 * The key principle: store clean text, render safely.
 * Markdown is stored as plain text (no HTML allowed in input).
 * The frontend renders it with a sanitized markdown pipeline.
 */

/**
 * Escape HTML entities in a string to prevent XSS when rendered.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validate that a string contains no raw HTML tags.
 * Returns true if clean, false if HTML detected.
 */
export function containsHtml(s: string): boolean {
  return /<[a-zA-Z][^>]*>/.test(s);
}

/**
 * Sanitize all text fields in an experiment submission.
 * Rejects submissions containing raw HTML.
 */
export function validateNoHtml(
  fields: Record<string, string | undefined>
): string | null {
  for (const [key, value] of Object.entries(fields)) {
    if (value && containsHtml(value)) {
      return `Field "${key}" contains HTML, which is not allowed. Use plain text or markdown.`;
    }
  }
  return null;
}
