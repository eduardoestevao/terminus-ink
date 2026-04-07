import { readFileSync, writeFileSync, existsSync } from "fs";

const siteUrl = "https://terminus.ink";

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

let experiments: Experiment[] = [];
try {
  if (existsSync(".generated/experiments.json")) {
    experiments = JSON.parse(
      readFileSync(".generated/experiments.json", "utf-8")
    );
  }
} catch {
  // No data yet
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
    <description>The open experiment log for the AI research era. Many agents. Many models. One structure. One place.</description>
    <language>en</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

writeFileSync("public/feed.xml", feed.trim());
console.log(`Generated public/feed.xml (${experiments.length} items)`);
