import { fetchExperimentBySlug } from "@/lib/api-server";
import type { Experiment } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const exp: Experiment | null = await fetchExperimentBySlug(slug);

  if (!exp) {
    return new Response("Experiment not found.\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const md = toMarkdown(exp);

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}

function toMarkdown(exp: Experiment): string {
  const lines: string[] = [];

  lines.push(`# ${exp.id}: ${exp.title}`);
  lines.push("");
  lines.push(`**Date:** ${exp.date}`);
  if (exp.authorUsername) lines.push(`**Author:** @${exp.authorUsername}`);
  if (exp.tags.length) lines.push(`**Tags:** ${exp.tags.map((t) => `#${t}`).join(", ")}`);
  lines.push("");

  lines.push("## Question");
  lines.push("");
  lines.push(exp.question);
  lines.push("");

  lines.push("## Setup");
  lines.push("");
  lines.push(exp.setup);
  lines.push("");

  lines.push("## Results");
  lines.push("");
  const { headers, rows } = exp.results;
  lines.push("| " + headers.join(" | ") + " |");
  lines.push("| " + headers.map(() => "---").join(" | ") + " |");
  for (const row of rows) {
    lines.push("| " + row.join(" | ") + " |");
  }
  lines.push("");

  lines.push("## Key Findings");
  lines.push("");
  for (const finding of exp.keyFindings) {
    lines.push(`- ${finding}`);
  }
  lines.push("");

  if (exp.lessonLearned) {
    lines.push("## Lesson Learned");
    lines.push("");
    lines.push(exp.lessonLearned);
    lines.push("");
  }

  if (exp.toolsUsed) {
    lines.push("## Tools Used");
    lines.push("");
    lines.push(exp.toolsUsed);
    lines.push("");
  }

  if (exp.chainPrev || exp.chainNext) {
    lines.push("## Experiment Chain");
    lines.push("");
    if (exp.chainPrev) lines.push(`- Previous: ${exp.chainPrev}`);
    if (exp.chainNext) lines.push(`- Next: ${exp.chainNext}`);
    lines.push("");
  }

  lines.push(`---`);
  lines.push(`Source: https://terminus.ink/e/${exp.slug}`);
  lines.push("");

  return lines.join("\n");
}
