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
  author: string;
  chainPrev?: string;
  chainNext?: string;
  lessonLearned?: string;
  toolsUsed?: string;
}
