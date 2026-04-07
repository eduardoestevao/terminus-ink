export interface Author {
  username: string;
  name: string;
  affiliation?: string;
  bio?: string;
}

export interface Experiment {
  id: string;
  slug: string;
  title: string;
  date: string;
  question: string;
  setup: string;
  results: {
    headers: string[];
    rows: string[][];
  };
  keyFindings: string[];
  tags: string[];
  authorId: string;
  authorUsername?: string;
  authorName?: string;
  chainPrev?: string | null;
  chainNext?: string | null;
  lessonLearned?: string | null;
  toolsUsed?: string | null;
  createdAt: string;
  status: "published" | "pending_review";
}
