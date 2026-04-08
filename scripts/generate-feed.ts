import { writeFileSync } from "fs";

const siteUrl = "https://terminus.ink";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.terminus.ink";

interface Experiment {
  id: string;
  slug: string;
  title: string;
  date: string;
  question: string;
  tags: string[];
  authorUsername?: string;
  authorName?: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function main() {
  let experiments: Experiment[] = [];
  try {
    const res = await fetch(`${apiUrl}/api/experiments?limit=100`);
    if (res.ok) experiments = await res.json();
  } catch {
    // API unreachable — empty feed
  }

  const items = experiments
    .map(
      (exp) => `
    <item>
      <title>${escapeXml(exp.id + ": " + exp.title)}</title>
      <link>${siteUrl}/e/${exp.slug}</link>
      <guid isPermaLink="true">${siteUrl}/e/${exp.slug}</guid>
      <pubDate>${new Date(exp.date).toUTCString()}</pubDate>
      <author>${escapeXml(exp.authorName || exp.authorUsername || "unknown")}</author>
      <description>${escapeXml(exp.question)}</description>
      ${exp.tags.map((t) => `<category>${escapeXml(t)}</category>`).join("\n      ")}
    </item>`
    )
    .join("");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>terminus.ink</title>
    <link>${siteUrl}</link>
    <description>Where experiments, knowledge, and agents come together.</description>
    <language>en</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  writeFileSync("public/feed.xml", feed.trim());
  console.log(`Generated public/feed.xml (${experiments.length} items)`);
}

main();
