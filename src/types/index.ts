export interface DimensionScores {
  scopeOfInfluence: number;
  reviewAuthority: number;
  unblockingPower: number;
  prSignificance: number;
  discussionLeadership: number;
}

export interface SubBreakdown {
  label: string;
  value: number;
}

export interface DimensionDetail {
  name: string;
  key: keyof DimensionScores;
  weight: number;
  score: number;
  weighted: number;
  subBreakdowns: SubBreakdown[];
}

export interface NotablePR {
  number: number;
  title: string;
  url: string;
  filesChanged: number;
  dirsSpread: number;
  additions: number;
  deletions: number;
}

export interface NotableReview {
  prNumber: number;
  prTitle: string;
  prUrl: string;
  turnaroundHours: number;
  state: string;
}

export interface ActivityWeek {
  week: string; // ISO week string e.g. "2025-W12"
  prsAuthored: number;
  reviewsGiven: number;
}

export interface EngineerRanking {
  rank: number;
  username: string;
  displayName: string; // "Engineer 1", "Engineer 2", etc.
  overallScore: number;
  dimensions: DimensionScores;
  dimensionDetails: DimensionDetail[];
  notablePRs: NotablePR[];
  notableReviews: NotableReview[];
  activityTimeline: ActivityWeek[];
}

export interface Metadata {
  repo: string;
  windowDays: number;
  generatedAt: string;
  totalPRsAnalyzed: number;
  totalReviewsAnalyzed: number;
  totalIssuesAnalyzed: number;
  totalEngineersScored: number;
}

export interface Summary {
  metadata: Metadata;
  rankings: EngineerRanking[];
}
