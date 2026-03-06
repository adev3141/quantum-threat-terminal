export type CompanyDoc = {
  symbol: string;
  name: string;
  searchTerm: string;
  tier: string;
  tierNormalized: string;
  isActive: boolean;
  isSupportedByFinnhub: boolean | null;
  displayOrder: number;
};

export type MarketSnapshotDoc = {
  symbol: string;
  name: string;
  tier: string;
  displayOrder: number;
  currentPrice: number | null;
  changeAmount: number | null;
  percentChange: number | null;
  quoteStatus: 'ok' | 'missing' | 'error' | 'unsupported';
  quoteFetchedAt?: { toDate?: () => Date } | null;
  updatedAt?: { toDate?: () => Date } | null;
};

export type NewsFeedDoc = {
  articleKey: string;
  title: string;
  description: string | null;
  url: string;
  sourceName: string | null;
  publishedAt?: { toDate?: () => Date } | null;
  primarySymbol: string | null;
  primaryTier: string | null;
  queryStrategy?: 'primary' | 'fallback';
  matchStrength?: 'strong' | 'fallback';
  topMatchScore?: number;
};

export type TerminalDataState = {
  companies: CompanyDoc[];
  marketSnapshots: MarketSnapshotDoc[];
  newsFeed: NewsFeedDoc[];
  loading: boolean;
  configError: string | null;
  marketError: string | null;
  companyError: string | null;
  newsError: string | null;
};
