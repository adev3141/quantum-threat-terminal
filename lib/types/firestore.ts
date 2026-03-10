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

export type SourceLink = {
  label: string;
  url: string;
  note: string;
};

export type FrontierSignal = {
  taskId: number;
  taskName: string;
  acceptedMetricName: string;
  metricValue: number;
  selectionRule: 'max' | 'min';
  normalizationStrategy: 'log-upper' | 'linear' | 'inverse-log' | 'inverse-linear' | 'none';
  normalizationParams: {
    referenceValue?: number;
    lowerReference?: number;
    upperReference?: number;
  };
  normalizedScore: number | null;
  sourceLabel: string;
  submissionId: string | null;
  platformId: string | null;
  evaluatedAt?: { toDate?: () => Date } | null;
  attributionStatus: 'direct' | 'provider-only' | 'platform-ref-only' | 'unattributed';
  status: 'selected' | 'diagnostic' | 'excluded';
  exclusionReason: string | null;
  rawSnapshot: Record<string, unknown>;
};

export type FrontierExclusion = {
  taskId: number;
  taskKey: string;
  taskName: string;
  signalTier: 'production' | 'diagnostic';
  required: boolean;
  reason: string;
};

export type GlobalMetricsDoc = {
  current_sota_lq: number;
  current_sota_source_label: string;
  current_sota_submission_id: string | null;
  current_sota_platform_id: string | null;
  rsa_2048_required_lq: number;
  rsa_2048_delta: number;
  rsa_2048_status_percent: number;
  q_day_target_runtime_hours: number;
  years_to_qday_central: number;
  years_to_qday_low: number;
  years_to_qday_high: number;
  q_day_year_central: number;
  q_day_year_low: number;
  q_day_year_high: number;
  q_day_estimate_date_central?: { toDate?: () => Date } | null;
  annual_growth_factor_central: number;
  annual_growth_factor_low: number;
  annual_growth_factor_high: number;
  methodology_version: string;
  methodology_note: string;
  source: 'metriq-curated';
  source_url: string;
  leader_metric_basis?: string;
  composite_readiness_percent?: number;
  utility_frontier_percent?: number;
  fault_tolerance_bridge_percent?: number;
  frontier_dependency_version?: string;
  frontier_signals?: Partial<
    Record<
      | 'aq'
      | 'physicalQubits'
      | 'twoQubitFidelity'
      | 'logicalErrorRate'
      | 'surfaceCode'
      | 'readoutFidelity'
      | 'coherenceT2'
      | 'quantumVolume'
      | 'faultTolerantQecLogicalErrorRate'
      | 'singleQubitGateSpeed'
      | 'twoQubitGateSpeed'
      | 'qecDecoding'
      | 'shorOrderFinding'
      | 'integerFactoring',
      FrontierSignal
    >
  >;
  is_stale: boolean;
  stale_after_hours: number;
  selected_record?: {
    isSota: boolean;
    sotaValueRaw: string;
    sotaValueParsed: number;
    title: string | null;
    platformName: string | null;
    taskName: string | null;
    rawSnapshot: Record<string, unknown>;
  } | null;
  last_successful_sync?: { toDate?: () => Date } | null;
  last_attempted_sync?: { toDate?: () => Date } | null;
};

export type GlobalMetriqFrontierDoc = {
  productionSignals: Record<string, FrontierSignal>;
  diagnosticSignals: Record<string, FrontierSignal>;
  excludedSignals?: FrontierExclusion[];
  methodologyVersion: string;
  source: 'metriq-curated';
  sourceUrlBase: string;
  lastSuccessfulSync?: { toDate?: () => Date } | null;
  lastAttemptedSync?: { toDate?: () => Date } | null;
  isStale: boolean;
  staleAfterHours: number;
};

export type GlobalRiskMethodologyDoc = {
  encryptedTrafficShare: number;
  pqProtectedShare: number;
  utilityWeights: {
    aq: number;
    quantumVolume: number;
  };
  hardwareScaleWeights: {
    physicalQubits: number;
  };
  gateQualityWeights: {
    twoQubitFidelity: number;
    readoutFidelity: number;
    coherenceT2: number;
  };
  runtimeWeights: {
    singleQubitGateSpeed: number;
    twoQubitGateSpeed: number;
  };
  faultToleranceWeights: {
    errorCorrectionMitigation: number;
    surfaceCode: number;
    faultTolerantQecLogicalErrorRate: number;
  };
  hndlWeights: {
    faultTolerance: number;
    runtimePracticality: number;
    gateQuality: number;
    hardwareScale: number;
    utilityFrontier: number;
  };
  methodologyVersion: string;
  methodologyNote: string;
  updatedAt?: { toDate?: () => Date } | null;
};

export type RiskAxis = {
  label: string;
  value: number | null;
  status: 'direct' | 'modelled' | 'unavailable';
  detail: string;
  sourceTasks: number[];
};

export type GlobalRiskSignalsDoc = {
  threatMatrixAxes: {
    utilityFrontier: RiskAxis;
    hardwareScale: RiskAxis;
    gateQuality: RiskAxis;
    runtimePracticality: RiskAxis;
    faultTolerance: RiskAxis;
    cryptanalyticRelevance: RiskAxis;
  };
  harvestableShare: number;
  cryptanalyticReadinessCore: number;
  hndlPressure: number;
  hndlStatus: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  methodologyVersion: string;
  methodologyNote: string;
  isStale: boolean;
  staleAfterHours: number;
  lastSuccessfulSync?: { toDate?: () => Date } | null;
  lastAttemptedSync?: { toDate?: () => Date } | null;
};

export type TerminalDataState = {
  companies: CompanyDoc[];
  marketSnapshots: MarketSnapshotDoc[];
  newsFeed: NewsFeedDoc[];
  globalMetriqFrontier: GlobalMetriqFrontierDoc | null;
  globalMetrics: GlobalMetricsDoc | null;
  globalRiskSignals: GlobalRiskSignalsDoc | null;
  loading: boolean;
  companyLoading: boolean;
  marketLoading: boolean;
  newsLoading: boolean;
  globalMetriqFrontierLoading: boolean;
  globalMetricsLoading: boolean;
  globalRiskSignalsLoading: boolean;
  configError: string | null;
  marketError: string | null;
  companyError: string | null;
  newsError: string | null;
  globalMetriqFrontierError: string | null;
  globalMetricsError: string | null;
  globalRiskSignalsError: string | null;
};
