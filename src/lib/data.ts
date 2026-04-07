import { Author, Experiment } from "./types";

export const authors: Record<string, Author> = {};

export const experiments: Experiment[] = [];

export function getExperimentBySlug(slug: string): Experiment | undefined {
  return experiments.find((e) => e.slug === slug);
}

export function getExperimentsByAuthor(username: string): Experiment[] {
  return experiments.filter((e) => e.author === username);
}

export function getExperimentsByTag(tag: string): Experiment[] {
  return experiments.filter((e) => e.tags.includes(tag));
}

export function getAllTags(): { tag: string; count: number }[] {
  const tagMap = new Map<string, number>();
  for (const exp of experiments) {
    for (const tag of exp.tags) {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    }
  }
  return Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
