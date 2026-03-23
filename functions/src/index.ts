import {createHash} from "node:crypto";
import {URL} from "node:url";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {setGlobalOptions} from "firebase-functions";
import {defineSecret} from "firebase-functions/params";
import {onRequest} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {
  Timestamp,
  getFirestore,
  FieldValue,
} from "firebase-admin/firestore";

setGlobalOptions({maxInstances: 10});

initializeApp();

const db = getFirestore();
const finnhubApiKey = defineSecret("FINNHUB_API_KEY");
const gnewsApiKey = defineSecret("GNEWS_API_KEY");
const adminTriggerKey = defineSecret("ADMIN_TRIGGER_KEY");
const XML_PATH = join(__dirname, "../src/data/quantum_companies.xml");
const GNEWS_BATCH_SIZE = 2;
const METRIQ_BENCHMARK_LATEST_URL = "https://unitaryfoundation.github.io/metriq-data/benchmark.latest.json";
const METRIQ_PLATFORMS_INDEX_URL = "https://unitaryfoundation.github.io/metriq-data/platforms/index.json";
const METRICS_STALE_AFTER_HOURS = 18;
const RISK_SIGNALS_STALE_AFTER_HOURS = 18;
const DEFAULT_GLOBAL_METRICS_METHOD_NOTE =
  "Composite RSA-2048 readiness model using curated Metriq AQ, error-correction, quality, and scale frontier tasks.";
const LEGACY_GLOBAL_METRICS_METHOD_NOTES = new Set([
  "Threshold-based RSA-2048 delta using curated Metriq logical-qubit SOTA records.",
]);
const METRIQ_QV_REFERENCE = 1048576;
const METRIQ_PHYSICAL_QUBITS_REFERENCE = 100000;
const METRIQ_SURFACE_CODE_REFERENCE = 31;
const METRIQ_COHERENCE_REFERENCE_US = 1000;

type MetriqTaskKey =
  | "aq"
  | "physicalQubits"
  | "twoQubitFidelity"
  | "logicalErrorRate"
  | "surfaceCode"
  | "readoutFidelity"
  | "coherenceT2"
  | "quantumVolume"
  | "faultTolerantQecLogicalErrorRate"
  | "singleQubitGateSpeed"
  | "twoQubitGateSpeed"
  | "qecDecoding"
  | "shorOrderFinding"
  | "integerFactoring";

type MetriqSignalTier = "production" | "diagnostic";

type MetriqNormalizationStrategy =
  | "log-upper"
  | "linear"
  | "inverse-log"
  | "inverse-linear"
  | "none";

type MetriqTaskConfig = {
  key: MetriqTaskKey;
  taskId: number;
  label: string;
  signalTier: MetriqSignalTier;
  acceptedMetricNames?: string[];
  metricAliases?: string[];
  requirePlatformAttribution?: boolean;
  allowPaperOnly?: boolean;
  referenceValue?: number;
  lowerReference?: number;
  upperReference?: number;
  selectionRule: "max" | "min";
  normalizationStrategy: MetriqNormalizationStrategy;
  weight: number;
  required?: boolean;
};

const METRIQ_TASK_CONFIGS: MetriqTaskConfig[] = [
  {
    key: "aq",
    taskId: 128,
    label: "Algorithmic Qubits",
    signalTier: "production",
    acceptedMetricNames: ["Algorithmic Qubits"],
    metricAliases: ["Algorithmic Qubits"],
    requirePlatformAttribution: true,
    referenceValue: 256,
    normalizationStrategy: "log-upper",
    selectionRule: "max",
    weight: 0.24,
    required: true,
  },
  {
    key: "physicalQubits",
    taskId: 159,
    label: "Number of physical qubits",
    signalTier: "production",
    acceptedMetricNames: ["Qubits", "Number of physical qubits"],
    metricAliases: ["Number of physical qubits", "Physical qubits"],
    requirePlatformAttribution: true,
    referenceValue: METRIQ_PHYSICAL_QUBITS_REFERENCE,
    normalizationStrategy: "log-upper",
    selectionRule: "max",
    weight: 0.08,
  },
  {
    key: "twoQubitFidelity",
    taskId: 53,
    label: "2-qubit Clifford gate fidelity",
    signalTier: "production",
    metricAliases: [
      "2-qubit Clifford gate fidelity",
      "2-qubit gate fidelity",
      "Two-qubit gate fidelity",
    ],
    requirePlatformAttribution: true,
    lowerReference: 98,
    upperReference: 99.99,
    normalizationStrategy: "linear",
    selectionRule: "max",
    weight: 0.15,
  },
  {
    key: "logicalErrorRate",
    taskId: 60,
    label: "Error correction and mitigation",
    signalTier: "production",
    acceptedMetricNames: ["Logical error rate"],
    metricAliases: ["Error correction and mitigation", "Logical error rate", "Error rate"],
    requirePlatformAttribution: true,
    selectionRule: "min",
    normalizationStrategy: "inverse-log",
    lowerReference: 1e-1,
    upperReference: 1e-6,
    weight: 0.2,
  },
  {
    key: "surfaceCode",
    taskId: 189,
    label: "Surface code",
    signalTier: "production",
    metricAliases: ["Surface code", "Code distance", "Distance"],
    requirePlatformAttribution: true,
    lowerReference: 3,
    upperReference: METRIQ_SURFACE_CODE_REFERENCE,
    normalizationStrategy: "linear",
    selectionRule: "max",
    weight: 0.14,
  },
  {
    key: "readoutFidelity",
    taskId: 198,
    label: "Single-qubit measurement fidelity",
    signalTier: "production",
    metricAliases: [
      "Single-qubit measurement fidelity",
      "Measurement fidelity",
      "Readout fidelity",
    ],
    requirePlatformAttribution: true,
    lowerReference: 90,
    upperReference: 99.99,
    normalizationStrategy: "linear",
    selectionRule: "max",
    weight: 0.05,
  },
  {
    key: "coherenceT2",
    taskId: 50,
    label: "Coherence time (T2)",
    signalTier: "production",
    metricAliases: ["Coherence time (T2)", "T2", "Coherence"],
    requirePlatformAttribution: true,
    referenceValue: METRIQ_COHERENCE_REFERENCE_US,
    normalizationStrategy: "log-upper",
    selectionRule: "max",
    weight: 0.04,
  },
  {
    key: "quantumVolume",
    taskId: 34,
    label: "Quantum volume",
    signalTier: "production",
    metricAliases: ["Quantum volume"],
    requirePlatformAttribution: true,
    referenceValue: METRIQ_QV_REFERENCE,
    normalizationStrategy: "log-upper",
    selectionRule: "max",
    weight: 0.1,
  },
  {
    key: "faultTolerantQecLogicalErrorRate",
    taskId: 141,
    label: "Fault-tolerant quantum error correction (QEC)",
    signalTier: "production",
    acceptedMetricNames: ["Logical error rate"],
    requirePlatformAttribution: true,
    selectionRule: "min",
    normalizationStrategy: "inverse-log",
    lowerReference: 1e-1,
    upperReference: 1e-6,
    weight: 0.12,
  },
  {
    key: "singleQubitGateSpeed",
    taskId: 223,
    label: "Single-qubit gate speed",
    signalTier: "production",
    acceptedMetricNames: ["Time (s)"],
    requirePlatformAttribution: true,
    selectionRule: "min",
    normalizationStrategy: "inverse-log",
    lowerReference: 1e-3,
    upperReference: 1e-6,
    weight: 0,
  },
  {
    key: "twoQubitGateSpeed",
    taskId: 224,
    label: "2-qubit gate speed",
    signalTier: "production",
    acceptedMetricNames: ["Time (s)"],
    requirePlatformAttribution: true,
    selectionRule: "min",
    normalizationStrategy: "inverse-log",
    lowerReference: 1e-2,
    upperReference: 1e-6,
    weight: 0,
  },
  {
    key: "qecDecoding",
    taskId: 192,
    label: "QEC decoding",
    signalTier: "diagnostic",
    acceptedMetricNames: ["Latency (s)", "Time per round (s)"],
    selectionRule: "min",
    normalizationStrategy: "none",
    allowPaperOnly: true,
    weight: 0,
  },
  {
    key: "shorOrderFinding",
    taskId: 175,
    label: "Shor's order-finding",
    signalTier: "diagnostic",
    acceptedMetricNames: ["Fidelity"],
    selectionRule: "max",
    normalizationStrategy: "none",
    requirePlatformAttribution: true,
    weight: 0,
  },
  {
    key: "integerFactoring",
    taskId: 4,
    label: "Integer factoring",
    signalTier: "diagnostic",
    acceptedMetricNames: ["Factorized integer"],
    selectionRule: "max",
    normalizationStrategy: "none",
    requirePlatformAttribution: true,
    weight: 0,
  },
];

const BENCHMARK_FAMILY_BY_TASK: Partial<Record<MetriqTaskKey, string[]>> = {
  aq: ["wit", "bseq", "qml_kernel", "lr_qaoa"],
  physicalQubits: [],
  twoQubitFidelity: ["eplg", "mirror_circuits"],
  logicalErrorRate: ["eplg"],
  surfaceCode: ["qedc_benchmarks"],
  readoutFidelity: ["mirror_circuits"],
  coherenceT2: ["mirror_circuits"],
  quantumVolume: ["bseq", "wit"],
  faultTolerantQecLogicalErrorRate: ["qedc_benchmarks", "eplg"],
  singleQubitGateSpeed: ["clops"],
  twoQubitGateSpeed: ["clops"],
  qecDecoding: ["qedc_benchmarks"],
  shorOrderFinding: ["qedc_benchmarks"],
  integerFactoring: ["qedc_benchmarks"],
};

type CompanyDoc = {
  symbol: string;
  name: string;
  searchTerm: string;
  tier: string;
  tierNormalized: string;
  isActive: boolean;
  isSupportedByFinnhub: boolean | null;
  displayOrder: number;
  source: "xml";
  sourceFile: "functions/src/data/quantum_companies.xml";
  createdAt?: FieldValue | Timestamp;
  updatedAt?: FieldValue | Timestamp;
};

type MarketSnapshotDoc = {
  symbol: string;
  name: string;
  tier: string;
  displayOrder: number;
  currentPrice: number | null;
  changeAmount: number | null;
  percentChange: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  dayOpen: number | null;
  previousClose: number | null;
  marketCurrency: string | null;
  exchange: string | null;
  finnhubName: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  ipoDate: string | null;
  finnhubIndustry: string | null;
  quoteStatus: "ok" | "missing" | "error" | "unsupported";
  profileStatus: "ok" | "missing" | "error" | "unsupported";
  errorMessage: string | null;
  lastGoodQuoteAt: Timestamp | null;
  lastGoodProfileAt: Timestamp | null;
  quoteFetchedAt: Timestamp | null;
  profileFetchedAt: Timestamp | null;
  updatedAt: FieldValue | Timestamp;
};

type NewsFeedDoc = {
  articleKey: string;
  title: string;
  description: string | null;
  url: string;
  normalizedUrl: string;
  imageUrl: string | null;
  sourceName: string | null;
  publishedAt: Timestamp;
  matchedSymbols: string[];
  matchedCompanyNames: string[];
  matchedSearchTerms: string[];
  primarySymbol: string | null;
  primaryTier: string | null;
  queryStrategy: "primary" | "fallback";
  matchStrength: "strong" | "fallback";
  topMatchScore: number;
  ingestBatchId: string;
  ingestQuery: string;
  provider: "gnews";
  language: "en";
  createdAt?: FieldValue | Timestamp;
  updatedAt?: FieldValue | Timestamp;
};

type ParsedCompany = {
  symbol: string;
  name: string;
  searchTerm: string;
  tier: string;
  tierNormalized: string;
  displayOrder: number;
};

type RiskReferenceDoc = {
  webEncryptedShare: number;
  pqTlsShare: number;
  hndlWeightHarvestable: number;
  hndlWeightCriticalSignals: number;
  hndlWeightUnsupportedCoverage: number;
  methodologyVersion: string;
  lastReviewedAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
};

type SourceLink = {
  label: string;
  url: string;
  note: string;
};

type CryptoReferenceDoc = {
  rsa2048RequiredLogicalQubits: number;
  forecastAnnualGrowthFactor: number;
  forecastModel: "compound-logical-qubit-growth";
  methodologyVersion: string;
  targetRuntimeHours: number;
  currentMaxAchievedLogicalQubitsOverride: number | null;
  sourceLinks: SourceLink[];
  notes: string | null;
  updatedBy: string;
  lastReviewedAt: Timestamp;
  updatedAt: Timestamp;
};

type CryptoReferenceHistoryDoc = {
  historyId: string;
  changedAt: Timestamp;
  changedBy: string;
  reason: string;
  previous: CryptoReferenceDoc | null;
  next: CryptoReferenceDoc;
  changeSummary: {
    fieldsChanged: string[];
  };
};

type UpdateCryptoReferenceRequest = {
  patch?: Partial<{
    rsa2048RequiredLogicalQubits: number;
    forecastAnnualGrowthFactor: number;
    methodologyVersion: string;
    targetRuntimeHours: number;
    currentMaxAchievedLogicalQubitsOverride: number | null;
    sourceLinks: SourceLink[];
    notes: string | null;
  }>;
  changedBy?: string;
  reason?: string;
};

type GlobalMetricsMethodologyDoc = {
  rsa_2048_required_lq: number;
  annual_growth_factor_central: number;
  annual_growth_factor_low: number;
  annual_growth_factor_high: number;
  q_day_target_runtime_hours: number;
  include_only_curated_records: boolean;
  allowed_task_names: string[];
  allowed_platform_names: string[];
  reject_theoretical_records: boolean;
  methodology_version: string;
  methodology_note: string;
  updatedAt: Timestamp;
};

type UpdateGlobalMetricsMethodologyRequest = {
  patch?: Partial<{
    rsa_2048_required_lq: number;
    annual_growth_factor_central: number;
    annual_growth_factor_low: number;
    annual_growth_factor_high: number;
    q_day_target_runtime_hours: number;
    include_only_curated_records: boolean;
    allowed_task_names: string[];
    allowed_platform_names: string[];
    reject_theoretical_records: boolean;
    methodology_version: string;
    methodology_note: string;
  }>;
  changedBy?: string;
  reason?: string;
};

type GlobalMetricsMethodologyHistoryDoc = {
  historyId: string;
  changedAt: Timestamp;
  previous: GlobalMetricsMethodologyDoc | null;
  next: GlobalMetricsMethodologyDoc;
  changedBy: string;
  reason: string;
};

type MetriqBenchmarkRow = Record<string, unknown> & {
  provider?: string;
  device?: string;
  timestamp?: string;
  results?: Record<string, unknown>;
  errors?: Record<string, unknown>;
  directions?: Record<string, unknown>;
  params?: Record<string, unknown>;
  suite_id?: string;
  app_version?: string;
  job_type?: string;
};

type BenchmarkSignalCandidate = {
  metricValue: number;
  metricName: string;
  sourceLabel: string;
  evaluatedAtMs: number;
  rawSnapshot: Record<string, unknown>;
  attributionStatus: FrontierAttributionStatus;
  platformId: string | null;
  submissionId: string | null;
};

type MetriqPlatformIndexEntry = Record<string, unknown> & {
  provider?: string;
  device?: string;
  current?: Record<string, unknown>;
};

type GlobalMetricsSelectedRecord = {
  isSota: boolean;
  sotaValueRaw: string;
  sotaValueParsed: number;
  title: string | null;
  platformName: string | null;
  taskName: string | null;
  rawSnapshot: Record<string, unknown>;
};

type GlobalMetricsDoc = {
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
  q_day_estimate_date_central: Timestamp;
  annual_growth_factor_central: number;
  annual_growth_factor_low: number;
  annual_growth_factor_high: number;
  methodology_version: string;
  methodology_note: string;
  source: "metriq-curated";
  source_url: string;
  leader_metric_basis: string;
  composite_readiness_percent: number;
  utility_frontier_percent: number;
  fault_tolerance_bridge_percent: number;
  frontier_dependency_version: string;
  frontier_signals: Partial<Record<MetriqTaskKey, FrontierSignal>>;
  is_stale: boolean;
  stale_after_hours: number;
  selected_record: GlobalMetricsSelectedRecord;
  last_successful_sync: Timestamp;
  last_attempted_sync: Timestamp;
};

type GlobalMetricsHistoryDoc = {
  historyId: string;
  publishedAt: Timestamp;
  previous: GlobalMetricsDoc | null;
  next: GlobalMetricsDoc;
  reason: "scheduled-sync" | "manual-sync";
};

type FrontierAttributionStatus =
  | "direct"
  | "provider-only"
  | "platform-ref-only"
  | "unattributed";

type FrontierSignal = {
  taskId: number;
  taskName: string;
  acceptedMetricName: string;
  metricValue: number;
  selectionRule: "max" | "min";
  normalizationStrategy: MetriqNormalizationStrategy;
  normalizationParams: {
    referenceValue?: number;
    lowerReference?: number;
    upperReference?: number;
  };
  normalizedScore: number | null;
  sourceLabel: string;
  submissionId: string | null;
  platformId: string | null;
  evaluatedAt: Timestamp | null;
  attributionStatus: FrontierAttributionStatus;
  status: "selected" | "diagnostic" | "excluded";
  exclusionReason: string | null;
  rawSnapshot: Record<string, unknown>;
};

type FrontierExclusion = {
  taskId: number;
  taskKey: MetriqTaskKey;
  taskName: string;
  signalTier: MetriqSignalTier;
  required: boolean;
  reason: string;
};

type GlobalMetriqFrontierDoc = {
  productionSignals: Partial<Record<MetriqTaskKey, FrontierSignal>>;
  diagnosticSignals: Partial<Record<MetriqTaskKey, FrontierSignal>>;
  excludedSignals: FrontierExclusion[];
  methodologyVersion: string;
  source: "metriq-curated";
  sourceUrlBase: string;
  lastSuccessfulSync: Timestamp;
  lastAttemptedSync: Timestamp;
  isStale: boolean;
  staleAfterHours: number;
};

type GlobalMetriqFrontierHistoryDoc = {
  historyId: string;
  publishedAt: Timestamp;
  previous: GlobalMetriqFrontierDoc | null;
  next: GlobalMetriqFrontierDoc;
  reason: "scheduled-sync" | "manual-sync";
};

type GlobalRiskMethodologyDoc = {
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
  updatedAt: Timestamp;
};

type UpdateGlobalRiskMethodologyRequest = {
  patch?: Partial<GlobalRiskMethodologyDoc>;
  changedBy?: string;
  reason?: string;
};

type GlobalRiskMethodologyHistoryDoc = {
  historyId: string;
  changedAt: Timestamp;
  previous: GlobalRiskMethodologyDoc | null;
  next: GlobalRiskMethodologyDoc;
  changedBy: string;
  reason: string;
};

type RiskAxis = {
  label: string;
  value: number | null;
  status: "direct" | "modelled" | "unavailable";
  detail: string;
  sourceTasks: number[];
};

type GlobalRiskSignalsDoc = {
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
  hndlStatus: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  methodologyVersion: string;
  methodologyNote: string;
  isStale: boolean;
  staleAfterHours: number;
  lastSuccessfulSync: Timestamp;
  lastAttemptedSync: Timestamp;
};

type GlobalRiskSignalsHistoryDoc = {
  historyId: string;
  publishedAt: Timestamp;
  previous: GlobalRiskSignalsDoc | null;
  next: GlobalRiskSignalsDoc;
  reason: "scheduled-sync" | "manual-sync";
};

type FinnhubQuoteResponse = {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
};

type FinnhubProfileResponse = {
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string;
  ipo?: string;
  logo?: string;
  name?: string;
  weburl?: string;
};

type GnewsResponse = {
  articles?: GnewsArticle[];
};

type GnewsArticle = {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  publishedAt?: string;
  source?: {
    name?: string;
  };
};

type IngestionStats = Record<string, number>;

class HttpStatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const TIER_VALUES = new Set([
  "Pure-Play Hardware",
  "Quantum Security",
  "Infrastructure",
  "Enterprise Hardware",
  "Cloud & Ecosystem",
  "Defense & Research",
]);
const COMMON_QUERY_TOKENS = new Set([
  "quantum",
  "computing",
  "computer",
  "research",
  "technology",
  "system",
  "systems",
]);

export const seedCompaniesFromXml = onRequest(async (req, res) => {
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  const runRef = db.collection("ingestion_runs").doc();
  const stats: IngestionStats = {
    totalCompanies: 0,
    upserted: 0,
    skipped: 0,
  };

  await startRun(runRef.id, "seedCompanies", stats);

  try {
    const companies = parseCompaniesXml();
    stats.totalCompanies = companies.length;
    const batch = db.batch();

    companies.forEach((company) => {
      const ref = db.collection("companies").doc(company.symbol);
      const payload: CompanyDoc = {
        ...company,
        isActive: true,
        isSupportedByFinnhub: null,
        source: "xml",
        sourceFile: "functions/src/data/quantum_companies.xml",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      batch.set(ref, payload, {merge: true});
      stats.upserted += 1;
    });

    await batch.commit();
    await finishRun(runRef.id, "ok", stats, []);
    res.json({ok: true, stats});
  } catch (error) {
    const message = toErrorMessage(error);
    await finishRun(runRef.id, "error", stats, [message]);
    res.status(500).json({ok: false, error: message});
  }
});

export const seedRiskReference = onRequest(
  {
    region: "us-central1",
    secrets: [adminTriggerKey],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ok: false, error: "Method not allowed"});
      return;
    }

    const provided = req.get("x-admin-key");
    const expected = adminTriggerKey.value();
    if (!provided || provided !== expected) {
      res.status(401).json({ok: false, error: "Unauthorized"});
      return;
    }

    const payload: RiskReferenceDoc = {
      webEncryptedShare: 0.95,
      pqTlsShare: 0.13,
      hndlWeightHarvestable: 0.7,
      hndlWeightCriticalSignals: 0.2,
      hndlWeightUnsupportedCoverage: 0.1,
      methodologyVersion: "2026-03-07",
      lastReviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection("risk_reference").doc("current").set(payload, {merge: true});
    res.json({ok: true, riskReference: payload});
  },
);

export const seedCryptoReference = onRequest(
  {
    region: "us-central1",
    secrets: [adminTriggerKey],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ok: false, error: "Method not allowed"});
      return;
    }

    const provided = req.get("x-admin-key");
    const expected = adminTriggerKey.value();
    if (!provided || provided !== expected) {
      res.status(401).json({ok: false, error: "Unauthorized"});
      return;
    }

    const payload: CryptoReferenceDoc = {
      rsa2048RequiredLogicalQubits: 1400,
      forecastAnnualGrowthFactor: 1.8,
      forecastModel: "compound-logical-qubit-growth",
      methodologyVersion: "2026-03-08",
      targetRuntimeHours: 24,
      currentMaxAchievedLogicalQubitsOverride: null,
      sourceLinks: [],
      notes: null,
      updatedBy: "seedCryptoReference",
      lastReviewedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await db.collection("crypto_reference").doc("current").set(payload, {merge: true});
    res.json({ok: true, cryptoReference: payload});
  },
);

export const updateCryptoReference = onRequest(
  {
    region: "us-central1",
    secrets: [adminTriggerKey],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ok: false, error: "Method not allowed"});
      return;
    }

    if (!isAuthorizedAdminRequest(req, adminTriggerKey.value())) {
      res.status(401).json({ok: false, error: "Unauthorized"});
      return;
    }

    const body = typeof req.body === "object" && req.body !== null ?
      req.body as UpdateCryptoReferenceRequest :
      {};
    const changedBy = normalizeNonEmptyString(body.changedBy);
    const reason = normalizeNonEmptyString(body.reason);
    const patch = body.patch;

    if (!changedBy) {
      res.status(400).json({ok: false, error: "changedBy is required"});
      return;
    }

    if (!reason) {
      res.status(400).json({ok: false, error: "reason is required"});
      return;
    }

    if (!patch || typeof patch !== "object" || Object.keys(patch).length === 0) {
      res.status(400).json({ok: false, error: "patch must contain at least one field"});
      return;
    }

    try {
      const currentRef = db.collection("crypto_reference").doc("current");
      const historyRef = db.collection("crypto_reference_history").doc();

      const result = await db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(currentRef);
        if (!currentSnapshot.exists) {
          throw new HttpStatusError(404, "crypto_reference/current not found");
        }

        const current = currentSnapshot.data() as CryptoReferenceDoc;
        const sanitizedPatch = normalizeCryptoReferencePatch(patch);
        const next = validateMergedCryptoReference(current, sanitizedPatch, changedBy);
        const fieldsChanged = getChangedCryptoReferenceFields(current, next);
        if (fieldsChanged.length === 0) {
          throw new HttpStatusError(400, "patch did not change any fields");
        }

        const historyId = historyRef.id;
        const historyDoc: CryptoReferenceHistoryDoc = {
          historyId,
          changedAt: next.updatedAt,
          changedBy,
          reason,
          previous: current,
          next,
          changeSummary: {
            fieldsChanged,
          },
        };

        transaction.set(currentRef, next);
        transaction.set(historyRef, historyDoc);

        return {current: next, historyId};
      });

      res.json({ok: true, current: result.current, historyId: result.historyId});
    } catch (error) {
      const status = error instanceof HttpStatusError ? error.status : 500;
      res.status(status).json({ok: false, error: toErrorMessage(error)});
    }
  },
);

export const seedGlobalMetricsMethodology = onRequest(
  {
    region: "us-central1",
    secrets: [adminTriggerKey],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ok: false, error: "Method not allowed"});
      return;
    }

    if (!isAuthorizedAdminRequest(req, adminTriggerKey.value())) {
      res.status(401).json({ok: false, error: "Unauthorized"});
      return;
    }

    const methodology = buildDefaultGlobalMetricsMethodology();
    await db.collection("global").doc("metrics_methodology").set(methodology, {merge: true});
    res.json({ok: true, methodology});
  },
);

export const updateGlobalMetricsMethodology = onRequest(
  {
    region: "us-central1",
    secrets: [adminTriggerKey],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ok: false, error: "Method not allowed"});
      return;
    }

    if (!isAuthorizedAdminRequest(req, adminTriggerKey.value())) {
      res.status(401).json({ok: false, error: "Unauthorized"});
      return;
    }

    const body = typeof req.body === "object" && req.body !== null ?
      req.body as UpdateGlobalMetricsMethodologyRequest :
      {};
    const patch = body.patch;
    const changedBy = typeof body.changedBy === "string" ? body.changedBy.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!patch || typeof patch !== "object" || Object.keys(patch).length === 0) {
      res.status(400).json({ok: false, error: "patch must contain at least one field"});
      return;
    }
    if (!changedBy) {
      res.status(400).json({ok: false, error: "changedBy must be a non-empty string"});
      return;
    }
    if (!reason) {
      res.status(400).json({ok: false, error: "reason must be a non-empty string"});
      return;
    }

    try {
      const currentRef = db.collection("global").doc("metrics_methodology");
      const historyRef = db.collection("global_metrics_methodology_history").doc();
      const result = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(currentRef);
        const current = snapshot.exists ?
          validateGlobalMetricsMethodology(snapshot.data() as Partial<GlobalMetricsMethodologyDoc>) :
          buildDefaultGlobalMetricsMethodology();
        const next = validateGlobalMetricsMethodology({
          ...current,
          ...patch,
        });
        const historyDoc: GlobalMetricsMethodologyHistoryDoc = {
          historyId: historyRef.id,
          changedAt: next.updatedAt,
          previous: snapshot.exists ? current : null,
          next,
          changedBy,
          reason,
        };
        transaction.set(currentRef, next);
        transaction.set(historyRef, historyDoc);
        return {methodology: next, historyId: historyRef.id};
      });

      res.json({ok: true, methodology: result.methodology, historyId: result.historyId});
    } catch (error) {
      const status = error instanceof HttpStatusError ? error.status : 500;
      res.status(status).json({ok: false, error: toErrorMessage(error)});
    }
  },
);

export const seedGlobalRiskMethodology = onRequest(
  {
    region: "us-central1",
    secrets: [adminTriggerKey],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ok: false, error: "Method not allowed"});
      return;
    }

    if (!isAuthorizedAdminRequest(req, adminTriggerKey.value())) {
      res.status(401).json({ok: false, error: "Unauthorized"});
      return;
    }

    const methodology = buildDefaultGlobalRiskMethodology();
    await db.collection("global").doc("risk_methodology").set(methodology, {merge: true});
    res.json({ok: true, methodology});
  },
);

export const updateGlobalRiskMethodology = onRequest(
  {
    region: "us-central1",
    secrets: [adminTriggerKey],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ok: false, error: "Method not allowed"});
      return;
    }

    if (!isAuthorizedAdminRequest(req, adminTriggerKey.value())) {
      res.status(401).json({ok: false, error: "Unauthorized"});
      return;
    }

    const body = typeof req.body === "object" && req.body !== null ?
      req.body as UpdateGlobalRiskMethodologyRequest :
      {};
    const patch = body.patch;
    const changedBy = typeof body.changedBy === "string" ? body.changedBy.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!patch || typeof patch !== "object" || Object.keys(patch).length === 0) {
      res.status(400).json({ok: false, error: "patch must contain at least one field"});
      return;
    }
    if (!changedBy) {
      res.status(400).json({ok: false, error: "changedBy must be a non-empty string"});
      return;
    }
    if (!reason) {
      res.status(400).json({ok: false, error: "reason must be a non-empty string"});
      return;
    }

    try {
      const currentRef = db.collection("global").doc("risk_methodology");
      const historyRef = db.collection("global_risk_methodology_history").doc();
      const result = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(currentRef);
        const current = snapshot.exists ?
          validateGlobalRiskMethodology(snapshot.data() as Partial<GlobalRiskMethodologyDoc>) :
          buildDefaultGlobalRiskMethodology();
        const next = validateGlobalRiskMethodology({
          ...current,
          ...patch,
        });
        const historyDoc: GlobalRiskMethodologyHistoryDoc = {
          historyId: historyRef.id,
          changedAt: next.updatedAt,
          previous: snapshot.exists ? current : null,
          next,
          changedBy,
          reason,
        };
        transaction.set(currentRef, next);
        transaction.set(historyRef, historyDoc);
        return {methodology: next, historyId: historyRef.id};
      });

      res.json({ok: true, methodology: result.methodology, historyId: result.historyId});
    } catch (error) {
      const status = error instanceof HttpStatusError ? error.status : 500;
      res.status(status).json({ok: false, error: toErrorMessage(error)});
    }
  },
);

export const syncMetriqMetrics = onSchedule(
  {
    schedule: "every 6 hours",
    region: "us-central1",
  },
  async () => {
    await syncMetriqMetricsData("scheduled-sync");
  },
);

export const manualSyncMetriqMetrics = onRequest(
  {
    region: "us-central1",
    secrets: [adminTriggerKey],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ok: false, error: "Method not allowed"});
      return;
    }

    if (!isAuthorizedAdminRequest(req, adminTriggerKey.value())) {
      res.status(401).json({ok: false, error: "Unauthorized"});
      return;
    }

    try {
      const result = await syncMetriqMetricsData("manual-sync");
      res.json({
        ok: result.errors.length === 0,
        partial: result.errors.length > 0,
        ...result,
      });
    } catch (error) {
      const status = error instanceof HttpStatusError ? error.status : 500;
      res.status(status).json({ok: false, error: toErrorMessage(error)});
    }
  },
);

export const syncFinnhubQuotes = onSchedule(
  {
    schedule: "every 5 minutes",
    secrets: [finnhubApiKey],
    region: "us-central1",
  },
  async () => {
    await syncFinnhubData({includeProfiles: false});
  },
);

export const manualSyncFinnhubQuotes = onRequest(
  {
    secrets: [adminTriggerKey, finnhubApiKey],
    region: "us-central1",
  },
  async (req, res) => {
    if (!isAuthorizedAdminRequest(req, adminTriggerKey.value())) {
      res.status(401).json({ok: false, error: "Unauthorized"});
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ok: false, error: "Method not allowed"});
      return;
    }

    await syncFinnhubData({includeProfiles: false});
    res.json({ok: true, jobType: "syncFinnhubQuotes"});
  },
);

export const syncFinnhubProfiles = onSchedule(
  {
    schedule: "every 24 hours",
    secrets: [finnhubApiKey],
    region: "us-central1",
  },
  async () => {
    await syncFinnhubData({includeProfiles: true});
  },
);

export const manualSyncFinnhubProfiles = onRequest(
  {
    secrets: [adminTriggerKey, finnhubApiKey],
    region: "us-central1",
  },
  async (req, res) => {
    if (!isAuthorizedAdminRequest(req, adminTriggerKey.value())) {
      res.status(401).json({ok: false, error: "Unauthorized"});
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ok: false, error: "Method not allowed"});
      return;
    }

    await syncFinnhubData({includeProfiles: true});
    res.json({ok: true, jobType: "syncFinnhubProfiles"});
  },
);

export const syncGnewsFeed = onSchedule(
  {
    schedule: "every 6 hours",
    secrets: [gnewsApiKey],
    region: "us-central1",
  },
  async () => {
    await syncGnewsData();
  },
);

export const manualSyncGnewsFeed = onRequest(
  {
    secrets: [adminTriggerKey, gnewsApiKey],
    region: "us-central1",
  },
  async (req, res) => {
    if (!isAuthorizedAdminRequest(req, adminTriggerKey.value())) {
      res.status(401).json({ok: false, error: "Unauthorized"});
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ok: false, error: "Method not allowed"});
      return;
    }

    await syncGnewsData();
    res.json({ok: true, jobType: "syncGnewsFeed"});
  },
);

export const cleanupOldNewsFeed = onSchedule(
  {
    schedule: "every 24 hours",
    region: "us-central1",
  },
  async () => {
    const threshold = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const snapshot = await db.collection("news_feed").where("publishedAt", "<", threshold).get();
    const stats: IngestionStats = {deleted: snapshot.size};
    const runId = db.collection("ingestion_runs").doc().id;
    await startRun(runId, "cleanupOldNewsFeed", stats);

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    await finishRun(runId, "ok", stats, []);
  },
);

async function syncFinnhubData(options: {includeProfiles: boolean}): Promise<void> {
  const companies = await getActiveCompanies();
  const runType = options.includeProfiles ? "syncFinnhubProfiles" : "syncFinnhubQuotes";
  const stats: IngestionStats = {
    totalCompanies: companies.length,
    quoteSuccess: 0,
    quoteError: 0,
    quoteUnsupported: 0,
    profileSuccess: 0,
    profileError: 0,
    profileUnsupported: 0,
  };
  const errors: string[] = [];
  const runId = db.collection("ingestion_runs").doc().id;
  await startRun(runId, runType, stats);

  const apiKey = finnhubApiKey.value();

  try {
    const batches = chunk(companies, 10);
    for (const batch of batches) {
      for (const company of batch) {
        try {
          const snapshotRef = db.collection("market_snapshots").doc(company.symbol);
          const existing = await snapshotRef.get();
          const existingData = existing.exists ? existing.data() as Partial<MarketSnapshotDoc> : null;
          const now = Timestamp.now();
          let quoteStatus: MarketSnapshotDoc["quoteStatus"] = "missing";
          let quote: FinnhubQuoteResponse = {};

          try {
            quote = await fetchJson<FinnhubQuoteResponse>(
              `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(company.symbol)}&token=${apiKey}`,
              1,
            );
            quoteStatus = isQuoteSupported(quote) ? "ok" : "unsupported";
          } catch (error) {
            if (isForbiddenError(error)) {
              quoteStatus = "unsupported";
            } else {
              throw error;
            }
          }

          const payload: Partial<MarketSnapshotDoc> = {
            symbol: company.symbol,
            name: company.name,
            tier: company.tier,
            displayOrder: company.displayOrder,
            currentPrice: quoteStatus === "ok" ? safeNumber(quote.c) : existingData?.currentPrice ?? null,
            changeAmount: quoteStatus === "ok" ? safeNumber(quote.d) : existingData?.changeAmount ?? null,
            percentChange: quoteStatus === "ok" ? safeNumber(quote.dp) : existingData?.percentChange ?? null,
            dayHigh: quoteStatus === "ok" ? safeNumber(quote.h) : existingData?.dayHigh ?? null,
            dayLow: quoteStatus === "ok" ? safeNumber(quote.l) : existingData?.dayLow ?? null,
            dayOpen: quoteStatus === "ok" ? safeNumber(quote.o) : existingData?.dayOpen ?? null,
            previousClose: quoteStatus === "ok" ? safeNumber(quote.pc) : existingData?.previousClose ?? null,
            quoteStatus,
            quoteFetchedAt: now,
            lastGoodQuoteAt: quoteStatus === "ok" ? timestampFromUnix(quote.t) ?? now : existingData?.lastGoodQuoteAt ?? null,
            errorMessage: quoteStatus === "ok" ? null : unsupportedMessage(company.symbol),
            updatedAt: FieldValue.serverTimestamp(),
          };

          if (options.includeProfiles && existingData?.profileStatus !== "unsupported") {
            try {
              const profile = await fetchJson<FinnhubProfileResponse>(
                `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(company.symbol)}&token=${apiKey}`,
                1,
              );
              const profileStatus = profile.name || profile.logo || profile.weburl ? "ok" : "unsupported";
              payload.marketCurrency = profileStatus === "ok" ? profile.currency ?? null : existingData?.marketCurrency ?? null;
              payload.exchange = profileStatus === "ok" ? profile.exchange ?? null : existingData?.exchange ?? null;
              payload.finnhubName = profileStatus === "ok" ? profile.name ?? null : existingData?.finnhubName ?? null;
              payload.logoUrl = profileStatus === "ok" ? profile.logo ?? null : existingData?.logoUrl ?? null;
              payload.websiteUrl = profileStatus === "ok" ? profile.weburl ?? null : existingData?.websiteUrl ?? null;
              payload.ipoDate = profileStatus === "ok" ? profile.ipo ?? null : existingData?.ipoDate ?? null;
              payload.finnhubIndustry = profileStatus === "ok" ? profile.finnhubIndustry ?? null : existingData?.finnhubIndustry ?? null;
              payload.profileStatus = profileStatus;
              payload.profileFetchedAt = now;
              payload.lastGoodProfileAt = profileStatus === "ok" ? now : existingData?.lastGoodProfileAt ?? null;
              if (profileStatus === "ok") {
                stats.profileSuccess += 1;
              } else {
                stats.profileUnsupported += 1;
                payload.errorMessage = unsupportedMessage(company.symbol);
              }
            } catch (error) {
              if (isForbiddenError(error)) {
                payload.profileStatus = "unsupported";
                payload.profileFetchedAt = now;
                payload.errorMessage = unsupportedMessage(company.symbol);
                stats.profileUnsupported += 1;
              } else {
                payload.profileStatus = "error";
                payload.profileFetchedAt = now;
                payload.errorMessage = toErrorMessage(error);
                stats.profileError += 1;
              }
            }
          }

          await snapshotRef.set(payload, {merge: true});
          const isSupportedByFinnhub =
            payload.quoteStatus === "ok" || payload.profileStatus === "ok" ?
              true :
              payload.quoteStatus === "unsupported" &&
                (!options.includeProfiles || payload.profileStatus === "unsupported") ?
                false :
                existingData?.quoteStatus === "ok" || existingData?.profileStatus === "ok" ?
                  true :
                  null;
          await db.collection("companies").doc(company.symbol).set({
            isSupportedByFinnhub,
            updatedAt: FieldValue.serverTimestamp(),
          }, {merge: true});

          if (quoteStatus === "ok") {
            stats.quoteSuccess += 1;
          } else {
            stats.quoteUnsupported += 1;
          }
        } catch (error) {
          stats.quoteError += 1;
          errors.push(`${company.symbol}: ${toErrorMessage(error)}`);
          await db.collection("market_snapshots").doc(company.symbol).set({
            symbol: company.symbol,
            name: company.name,
            tier: company.tier,
            displayOrder: company.displayOrder,
            quoteStatus: "error",
            profileStatus: options.includeProfiles ? "error" : "missing",
            quoteFetchedAt: Timestamp.now(),
            updatedAt: FieldValue.serverTimestamp(),
            errorMessage: toErrorMessage(error),
          }, {merge: true});
        }
      }
      await sleep(1000);
    }

    await finishRun(runId, errors.length > 0 ? "partial" : "ok", stats, errors);
  } catch (error) {
    errors.push(toErrorMessage(error));
    await finishRun(runId, "error", stats, errors);
    throw error;
  }
}

async function syncGnewsData(): Promise<void> {
  const companies = await getActiveCompanies();
  const stats: IngestionStats = {
    totalCompanies: companies.length,
    totalBatches: 0,
    requestSuccess: 0,
    requestError: 0,
    fallbackSuccess: 0,
    fallbackError: 0,
    articlesCreated: 0,
    articlesUpdated: 0,
    articlesSkipped: 0,
    emptyResponses: 0,
  };
  const errors: string[] = [];
  const runId = db.collection("ingestion_runs").doc().id;
  await startRun(runId, "syncGnewsFeed", stats);

  try {
    const apiKey = gnewsApiKey.value();
    const batches = chunk(companies, GNEWS_BATCH_SIZE);
    stats.totalBatches = batches.length;

    for (const batch of batches) {
      const primaryQuery = buildGnewsQuery(batch);
      const fallbackQuery = buildFallbackGnewsQuery(batch);
      const ingestBatchId = createHash("sha1")
        .update(`${runId}:${primaryQuery}:${fallbackQuery}`)
        .digest("hex");

      try {
        let ingestQuery = primaryQuery;
        let queryStrategy: "primary" | "fallback" = "primary";
        let response = await fetchGnewsBatch(apiKey, primaryQuery, batch.map((company) => company.symbol));
        stats.requestSuccess += 1;
        let articles = response.articles ?? [];

        if (articles.length === 0 && fallbackQuery !== primaryQuery) {
          try {
            ingestQuery = fallbackQuery;
            queryStrategy = "fallback";
            response = await fetchGnewsBatch(apiKey, fallbackQuery, batch.map((company) => company.symbol));
            stats.fallbackSuccess += 1;
            articles = response.articles ?? [];
          } catch (error) {
            stats.fallbackError += 1;
            errors.push(
              `fallback [${batch.map((company) => company.symbol).join(", ")}] len=${fallbackQuery.length}: ${toErrorMessage(error)}`,
            );
          }
        }

        if (articles.length === 0) {
          stats.emptyResponses += 1;
        }

        for (const article of articles) {
          const normalized = normalizeGnewsArticle(
            article,
            batch,
            ingestBatchId,
            ingestQuery,
            queryStrategy,
          );
          if (!normalized) {
            stats.articlesSkipped += 1;
            continue;
          }

          const ref = db.collection("news_feed").doc(normalized.articleKey);
          const existing = await ref.get();
          const existingData = existing.exists ? existing.data() as Partial<NewsFeedDoc> : null;
          const merged: NewsFeedDoc = {
            ...normalized,
            matchedSymbols: mergeStringArrays(existingData?.matchedSymbols, normalized.matchedSymbols),
            matchedCompanyNames: mergeStringArrays(existingData?.matchedCompanyNames, normalized.matchedCompanyNames),
            matchedSearchTerms: mergeStringArrays(existingData?.matchedSearchTerms, normalized.matchedSearchTerms),
            createdAt: existing.exists ? existingData?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          await ref.set(merged, {merge: true});
          if (existing.exists) {
            stats.articlesUpdated += 1;
          } else {
            stats.articlesCreated += 1;
          }
        }
      } catch (error) {
        stats.requestError += 1;
        errors.push(
          `primary [${batch.map((company) => company.symbol).join(", ")}] len=${primaryQuery.length}: ${toErrorMessage(error)}`,
        );
      }
    }

    await finishRun(runId, errors.length > 0 ? "partial" : "ok", stats, errors);
  } catch (error) {
    errors.push(toErrorMessage(error));
    await finishRun(runId, "error", stats, errors);
    throw error;
  }
}

function parseCompaniesXml(): ParsedCompany[] {
  const xml = readFileSync(XML_PATH, "utf8");
  const matches = [...xml.matchAll(/<Company>([\s\S]*?)<\/Company>/g)];

  return matches.flatMap((match, index) => {
    const block = match[1];
    const name = extractTag(block, "Name");
    const symbol = extractTag(block, "Symbol").toUpperCase();
    const searchTerm = extractTag(block, "SearchTerm");
    const tier = extractTag(block, "Tier");

    if (!name || !symbol || !searchTerm || !tier) {
      logger.error("Skipping malformed company block", {index, name, symbol});
      return [];
    }

    return [{
      name,
      symbol,
      searchTerm,
      tier,
      tierNormalized: TIER_VALUES.has(tier) ? tier : "Unknown",
      displayOrder: index + 1,
    }];
  });
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return decodeXmlEntities(match?.[1]?.trim() ?? "");
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function isAuthorizedAdminRequest(
  req: {headers: Record<string, string | string[] | undefined>; query?: Record<string, unknown>; body?: unknown},
  expectedKey: string,
): boolean {
  const headerValue = req.headers["x-admin-key"];
  const queryValue = req.query?.key;
  const bodyValue = typeof req.body === "object" && req.body !== null && "key" in req.body ?
    (req.body as {key?: unknown}).key :
    undefined;
  const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue ?? queryValue ?? bodyValue;
  return typeof candidate === "string" && candidate.length > 0 && candidate === expectedKey;
}

function normalizeNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeCryptoReferencePatch(
  patch: UpdateCryptoReferenceRequest["patch"],
): Partial<Omit<CryptoReferenceDoc, "forecastModel" | "updatedBy" | "updatedAt" | "lastReviewedAt">> {
  const nextPatch: Partial<Omit<CryptoReferenceDoc, "forecastModel" | "updatedBy" | "updatedAt" | "lastReviewedAt">> = {};
  if (!patch) {
    return nextPatch;
  }

  if ("rsa2048RequiredLogicalQubits" in patch) {
    nextPatch.rsa2048RequiredLogicalQubits = patch.rsa2048RequiredLogicalQubits;
  }
  if ("forecastAnnualGrowthFactor" in patch) {
    nextPatch.forecastAnnualGrowthFactor = patch.forecastAnnualGrowthFactor;
  }
  if ("methodologyVersion" in patch) {
    nextPatch.methodologyVersion = patch.methodologyVersion;
  }
  if ("targetRuntimeHours" in patch) {
    nextPatch.targetRuntimeHours = patch.targetRuntimeHours;
  }
  if ("currentMaxAchievedLogicalQubitsOverride" in patch) {
    nextPatch.currentMaxAchievedLogicalQubitsOverride = patch.currentMaxAchievedLogicalQubitsOverride;
  }
  if ("sourceLinks" in patch) {
    nextPatch.sourceLinks = patch.sourceLinks;
  }
  if ("notes" in patch) {
    nextPatch.notes = patch.notes;
  }

  return nextPatch;
}

function validateMergedCryptoReference(
  current: CryptoReferenceDoc,
  patch: Partial<Omit<CryptoReferenceDoc, "forecastModel" | "updatedBy" | "updatedAt" | "lastReviewedAt">>,
  changedBy: string,
): CryptoReferenceDoc {
  const now = Timestamp.now();
  const next: CryptoReferenceDoc = {
    rsa2048RequiredLogicalQubits: validateInteger(
      patch.rsa2048RequiredLogicalQubits ?? current.rsa2048RequiredLogicalQubits,
      "rsa2048RequiredLogicalQubits",
      1,
      100000,
    ),
    forecastAnnualGrowthFactor: validateNumber(
      patch.forecastAnnualGrowthFactor ?? current.forecastAnnualGrowthFactor,
      "forecastAnnualGrowthFactor",
      1,
      5,
      false,
    ),
    forecastModel: "compound-logical-qubit-growth",
    methodologyVersion: validateRequiredString(
      patch.methodologyVersion ?? current.methodologyVersion,
      "methodologyVersion",
    ),
    targetRuntimeHours: validateInteger(
      patch.targetRuntimeHours ?? current.targetRuntimeHours,
      "targetRuntimeHours",
      1,
      168,
    ),
    currentMaxAchievedLogicalQubitsOverride: validateNullableInteger(
      patch.currentMaxAchievedLogicalQubitsOverride ?? current.currentMaxAchievedLogicalQubitsOverride ?? null,
      "currentMaxAchievedLogicalQubitsOverride",
      0,
    ),
    sourceLinks: validateSourceLinks(patch.sourceLinks ?? current.sourceLinks ?? []),
    notes: validateNullableString(patch.notes ?? current.notes ?? null, "notes"),
    updatedBy: changedBy,
    lastReviewedAt: now,
    updatedAt: now,
  };

  return next;
}

function validateInteger(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new HttpStatusError(400, `${field} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function validateNullableInteger(value: unknown, field: string, min: number): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    throw new HttpStatusError(400, `${field} must be null or an integer >= ${min}`);
  }
  return value;
}

function validateNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
  allowMin: boolean,
): number {
  const valid =
    typeof value === "number" &&
    Number.isFinite(value) &&
    (allowMin ? value >= min : value > min) &&
    value <= max;
  if (!valid) {
    throw new HttpStatusError(400, `${field} must be ${allowMin ? ">=" : ">"} ${min} and <= ${max}`);
  }
  return value;
}

function validateRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpStatusError(400, `${field} must be a non-empty string`);
  }
  return value.trim();
}

function validateNullableString(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new HttpStatusError(400, `${field} must be a string or null`);
  }
  return value.trim() || null;
}

function validateSourceLinks(value: unknown): SourceLink[] {
  if (!Array.isArray(value)) {
    throw new HttpStatusError(400, "sourceLinks must be an array");
  }
  if (value.length > 10) {
    throw new HttpStatusError(400, "sourceLinks must contain at most 10 items");
  }

  return value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new HttpStatusError(400, `sourceLinks[${index}] must be an object`);
    }

    const sourceLink = entry as Partial<SourceLink>;
    const label = validateRequiredString(sourceLink.label, `sourceLinks[${index}].label`);
    const url = validateHttpsUrl(sourceLink.url, `sourceLinks[${index}].url`);
    const note = validateRequiredString(sourceLink.note, `sourceLinks[${index}].note`);
    return {label, url, note};
  });
}

function validateHttpsUrl(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpStatusError(400, `${field} must be a non-empty https URL`);
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
    return parsed.toString();
  } catch {
    throw new HttpStatusError(400, `${field} must be a valid https URL`);
  }
}

function getChangedCryptoReferenceFields(previous: CryptoReferenceDoc, next: CryptoReferenceDoc): string[] {
  const changed: string[] = [];
  const fields: Array<keyof Omit<CryptoReferenceDoc, "updatedAt" | "lastReviewedAt" | "updatedBy">> = [
    "rsa2048RequiredLogicalQubits",
    "forecastAnnualGrowthFactor",
    "forecastModel",
    "methodologyVersion",
    "targetRuntimeHours",
    "currentMaxAchievedLogicalQubitsOverride",
    "sourceLinks",
    "notes",
  ];

  fields.forEach((field) => {
    if (JSON.stringify(previous[field]) !== JSON.stringify(next[field])) {
      changed.push(field);
    }
  });

  if (previous.updatedBy !== next.updatedBy) {
    changed.push("updatedBy");
  }

  return changed;
}

function buildDefaultGlobalMetricsMethodology(): GlobalMetricsMethodologyDoc {
  return {
    rsa_2048_required_lq: 1400,
    annual_growth_factor_central: 1.8,
    annual_growth_factor_low: 1.5,
    annual_growth_factor_high: 2.0,
    q_day_target_runtime_hours: 24,
    include_only_curated_records: true,
    allowed_task_names: buildDefaultGlobalMetricsTaskNames(),
    allowed_platform_names: [
      "ibm",
      "google",
      "quantinuum",
      "microsoft",
      "ionq",
      "rigetti",
      "intel",
      "fujitsu",
      "d-wave",
      "dwave",
    ],
    reject_theoretical_records: true,
    methodology_version: "metriq-curated-v1",
    methodology_note: DEFAULT_GLOBAL_METRICS_METHOD_NOTE,
    updatedAt: Timestamp.now(),
  };
}

function validateGlobalMetricsMethodology(
  value: Partial<GlobalMetricsMethodologyDoc>,
): GlobalMetricsMethodologyDoc {
  const methodologyNote = normalizeGlobalMetricsMethodologyNote(
    validateRequiredString(
      value.methodology_note,
      "methodology_note",
    ),
  );

  return {
    rsa_2048_required_lq: validateInteger(
      value.rsa_2048_required_lq,
      "rsa_2048_required_lq",
      1,
      100000,
    ),
    annual_growth_factor_central: validateNumber(
      value.annual_growth_factor_central,
      "annual_growth_factor_central",
      1,
      5,
      false,
    ),
    annual_growth_factor_low: validateNumber(
      value.annual_growth_factor_low,
      "annual_growth_factor_low",
      1,
      5,
      false,
    ),
    annual_growth_factor_high: validateNumber(
      value.annual_growth_factor_high,
      "annual_growth_factor_high",
      1,
      5,
      false,
    ),
    q_day_target_runtime_hours: validateInteger(
      value.q_day_target_runtime_hours,
      "q_day_target_runtime_hours",
      1,
      168,
    ),
    include_only_curated_records: validateBoolean(
      value.include_only_curated_records,
      "include_only_curated_records",
    ),
    allowed_task_names: normalizeAllowedTaskNames(
      validateStringArray(value.allowed_task_names, "allowed_task_names"),
    ),
    allowed_platform_names: validateStringArray(value.allowed_platform_names, "allowed_platform_names"),
    reject_theoretical_records: validateBoolean(
      value.reject_theoretical_records,
      "reject_theoretical_records",
    ),
    methodology_version: validateRequiredString(
      value.methodology_version,
      "methodology_version",
    ),
    methodology_note: methodologyNote,
    updatedAt: Timestamp.now(),
  };
}

function buildDefaultGlobalRiskMethodology(): GlobalRiskMethodologyDoc {
  return {
    encryptedTrafficShare: 0.95,
    pqProtectedShare: 0.13,
    utilityWeights: {
      aq: 0.7,
      quantumVolume: 0.3,
    },
    hardwareScaleWeights: {
      physicalQubits: 1,
    },
    gateQualityWeights: {
      twoQubitFidelity: 0.5,
      readoutFidelity: 0.2,
      coherenceT2: 0.3,
    },
    runtimeWeights: {
      singleQubitGateSpeed: 0.35,
      twoQubitGateSpeed: 0.65,
    },
    faultToleranceWeights: {
      errorCorrectionMitigation: 0.35,
      surfaceCode: 0.3,
      faultTolerantQecLogicalErrorRate: 0.35,
    },
    hndlWeights: {
      faultTolerance: 0.45,
      runtimePracticality: 0.2,
      gateQuality: 0.15,
      hardwareScale: 0.1,
      utilityFrontier: 0.1,
    },
    methodologyVersion: "global-risk-signals-v1",
    methodologyNote: "Global frontier risk model using curated Metriq utility, scale, quality, runtime, and fault-tolerance signals.",
    updatedAt: Timestamp.now(),
  };
}

function validateWeightMap(
  value: unknown,
  field: string,
  expectedKeys: string[],
): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpStatusError(400, `${field} must be an object`);
  }

  const record = value as Record<string, unknown>;
  const validated = Object.fromEntries(
    expectedKeys.map((key) => [
      key,
      validateNumber(record[key], `${field}.${key}`, 0, 1, true),
    ]),
  );

  return validated;
}

function validateGlobalRiskMethodology(
  value: Partial<GlobalRiskMethodologyDoc>,
): GlobalRiskMethodologyDoc {
  const encryptedTrafficShare = validateNumber(
    value.encryptedTrafficShare,
    "encryptedTrafficShare",
    0,
    1,
    true,
  );
  const pqProtectedShare = validateNumber(
    value.pqProtectedShare,
    "pqProtectedShare",
    0,
    1,
    true,
  );

  return {
    encryptedTrafficShare,
    pqProtectedShare,
    utilityWeights: validateWeightMap(
      value.utilityWeights,
      "utilityWeights",
      ["aq", "quantumVolume"],
    ) as GlobalRiskMethodologyDoc["utilityWeights"],
    hardwareScaleWeights: validateWeightMap(
      value.hardwareScaleWeights,
      "hardwareScaleWeights",
      ["physicalQubits"],
    ) as GlobalRiskMethodologyDoc["hardwareScaleWeights"],
    gateQualityWeights: validateWeightMap(
      value.gateQualityWeights,
      "gateQualityWeights",
      ["twoQubitFidelity", "readoutFidelity", "coherenceT2"],
    ) as GlobalRiskMethodologyDoc["gateQualityWeights"],
    runtimeWeights: validateWeightMap(
      value.runtimeWeights,
      "runtimeWeights",
      ["singleQubitGateSpeed", "twoQubitGateSpeed"],
    ) as GlobalRiskMethodologyDoc["runtimeWeights"],
    faultToleranceWeights: validateWeightMap(
      value.faultToleranceWeights,
      "faultToleranceWeights",
      ["errorCorrectionMitigation", "surfaceCode", "faultTolerantQecLogicalErrorRate"],
    ) as GlobalRiskMethodologyDoc["faultToleranceWeights"],
    hndlWeights: validateWeightMap(
      value.hndlWeights,
      "hndlWeights",
      ["faultTolerance", "runtimePracticality", "gateQuality", "hardwareScale", "utilityFrontier"],
    ) as GlobalRiskMethodologyDoc["hndlWeights"],
    methodologyVersion: validateRequiredString(value.methodologyVersion, "methodologyVersion"),
    methodologyNote: validateRequiredString(value.methodologyNote, "methodologyNote"),
    updatedAt: Timestamp.now(),
  };
}

function validateBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new HttpStatusError(400, `${field} must be a boolean`);
  }
  return value;
}

function validateStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new HttpStatusError(400, `${field} must be an array of strings`);
  }
  return value.map((entry, index) => validateRequiredString(entry, `${field}[${index}]`));
}

async function syncMetriqMetricsData(
  reason: "scheduled-sync" | "manual-sync",
): Promise<{
  metrics: GlobalMetricsDoc | null;
  frontier: GlobalMetriqFrontierDoc;
  riskSignals: GlobalRiskSignalsDoc | null;
  errors: string[];
}> {
  const runId = db.collection("ingestion_runs").doc().id;
  const stats: IngestionStats = {
    tasksFetched: 0,
    tasksSucceeded: 0,
    productionSignalsSelected: 0,
    diagnosticSignalsSelected: 0,
    selectedValue: 0,
  };
  const errors: string[] = [];
  await startRun(runId, "syncMetriqMetrics", stats);

  try {
    const metricsMethodology = await getGlobalMetricsMethodology();
    const riskMethodology = await getGlobalRiskMethodology();
    const now = Timestamp.now();
    const frontier = await fetchMetriqFrontierData(metricsMethodology, stats, now);
    await publishGlobalMetriqFrontier(frontier, reason);
    let metrics: GlobalMetricsDoc | null = null;
    let riskSignals: GlobalRiskSignalsDoc | null = null;

    try {
      metrics = buildGlobalMetricsDoc(frontier.productionSignals, metricsMethodology, now);
      stats.selectedValue = metrics.current_sota_lq;
      await publishGlobalMetrics(metrics, reason);
    } catch (error) {
      errors.push(`global/metrics: ${toErrorMessage(error)}`);
      await markGlobalDocsStale(["metrics"]);
    }

    try {
      riskSignals = buildGlobalRiskSignalsDoc(
        frontier.productionSignals,
        riskMethodology,
        frontier,
        now,
      );
      await publishGlobalRiskSignals(riskSignals, reason);
    } catch (error) {
      errors.push(`global/risk_signals: ${toErrorMessage(error)}`);
      await markGlobalDocsStale(["risk_signals"]);
    }

    const runStatus =
      errors.length === 0 ? "ok" :
        (metrics || riskSignals) ? "partial" :
          "error";
    await finishRun(runId, runStatus, stats, errors);

    return {
      metrics,
      frontier,
      riskSignals,
      errors,
    };
  } catch (error) {
    errors.push(toErrorMessage(error));
    await markGlobalDocsStale(["metrics", "metriq_frontier", "risk_signals"]);
    await finishRun(runId, "error", stats, errors);
    throw error;
  }
}

async function getGlobalMetricsMethodology(): Promise<GlobalMetricsMethodologyDoc> {
  const snapshot = await db.collection("global").doc("metrics_methodology").get();
  if (!snapshot.exists) {
    return buildDefaultGlobalMetricsMethodology();
  }
  return validateGlobalMetricsMethodology({
    ...buildDefaultGlobalMetricsMethodology(),
    ...(snapshot.data() as Partial<GlobalMetricsMethodologyDoc>),
  });
}

async function getGlobalRiskMethodology(): Promise<GlobalRiskMethodologyDoc> {
  const snapshot = await db.collection("global").doc("risk_methodology").get();
  if (!snapshot.exists) {
    return buildDefaultGlobalRiskMethodology();
  }
  return validateGlobalRiskMethodology({
    ...buildDefaultGlobalRiskMethodology(),
    ...(snapshot.data() as Partial<GlobalRiskMethodologyDoc>),
  });
}

async function fetchMetriqFrontierData(
  methodology: GlobalMetricsMethodologyDoc,
  stats: IngestionStats,
  now: Timestamp,
): Promise<GlobalMetriqFrontierDoc> {
  const productionSignals: Partial<Record<MetriqTaskKey, FrontierSignal>> = {};
  const diagnosticSignals: Partial<Record<MetriqTaskKey, FrontierSignal>> = {};
  const excludedSignals: FrontierExclusion[] = [];
  const benchmarkRows = await fetchBenchmarkRows();
  const platformsIndex = await fetchPlatformsIndex();

  for (const config of METRIQ_TASK_CONFIGS) {
    stats.tasksFetched += 1;

    try {
      const signal = fetchMetriqTaskSignal(config, methodology, benchmarkRows, platformsIndex);
      if (!signal) {
        excludedSignals.push({
          taskId: config.taskId,
          taskKey: config.key,
          taskName: config.label,
          signalTier: config.signalTier,
          required: Boolean(config.required),
          reason: "No curated result matched the configured task filters.",
        });
        continue;
      }

      stats.tasksSucceeded += 1;
      if (config.signalTier === "production") {
        productionSignals[config.key] = signal;
        stats.productionSignalsSelected += 1;
      } else {
        diagnosticSignals[config.key] = signal;
        stats.diagnosticSignalsSelected += 1;
      }
    } catch (error) {
      excludedSignals.push({
        taskId: config.taskId,
        taskKey: config.key,
        taskName: config.label,
        signalTier: config.signalTier,
        required: Boolean(config.required),
        reason: toErrorMessage(error),
      });
      logger.warn("Skipping Metriq task after fetch or curation failure", {
        taskId: config.taskId,
        taskKey: config.key,
        signalTier: config.signalTier,
        required: Boolean(config.required),
        error: toErrorMessage(error),
      });
    }
  }

  if (!productionSignals.aq) {
    const synthesizedAq = synthesizeAqSignalFromCoverage(productionSignals, methodology, benchmarkRows);
    if (synthesizedAq) {
      productionSignals.aq = synthesizedAq;
      stats.productionSignalsSelected += 1;
      stats.tasksSucceeded += 1;
    } else {
      excludedSignals.push({
        taskId: 128,
        taskKey: "aq",
        taskName: "Algorithmic Qubits",
        signalTier: "production",
        required: true,
        reason: "Unable to synthesize AQ proxy from benchmark-family evidence.",
      });
    }
  }

  return {
    productionSignals,
    diagnosticSignals,
    excludedSignals,
    methodologyVersion: methodology.methodology_version,
    source: "metriq-curated",
    sourceUrlBase: METRIQ_BENCHMARK_LATEST_URL,
    lastSuccessfulSync: now,
    lastAttemptedSync: now,
    isStale: false,
    staleAfterHours: METRICS_STALE_AFTER_HOURS,
  };
}

function fetchMetriqTaskSignal(
  config: MetriqTaskConfig,
  methodology: GlobalMetricsMethodologyDoc,
  benchmarkRows: MetriqBenchmarkRow[],
  platformsIndex: MetriqPlatformIndexEntry[],
): FrontierSignal | null {
  const selectedResult = selectBestBenchmarkResult(config, methodology, benchmarkRows, platformsIndex);
  if (!selectedResult) {
    return null;
  }

  const signal: FrontierSignal = {
    taskId: config.taskId,
    taskName: config.label,
    acceptedMetricName: selectedResult.metricName,
    metricValue: selectedResult.metricValue,
    selectionRule: config.selectionRule,
    normalizationStrategy: config.normalizationStrategy,
    normalizationParams: buildFrontierNormalizationParams(config),
    normalizedScore: normalizeMetriqSignal(selectedResult.metricValue, config),
    sourceLabel: selectedResult.sourceLabel,
    submissionId: selectedResult.submissionId,
    platformId: selectedResult.platformId,
    evaluatedAt: selectedResult.evaluatedAtMs ?
      Timestamp.fromMillis(selectedResult.evaluatedAtMs) :
      null,
    attributionStatus: selectedResult.attributionStatus,
    status: config.signalTier === "production" ? "selected" : "diagnostic",
    exclusionReason: null,
    rawSnapshot: selectedResult.rawSnapshot,
  };

  logger.info("Selected Metriq frontier signal", {
    taskId: config.taskId,
    taskKey: config.key,
    signalTier: config.signalTier,
    sourceLabel: signal.sourceLabel,
    metricValue: signal.metricValue,
    normalizedScore: signal.normalizedScore,
  });

  return signal;
}

function buildFrontierNormalizationParams(
  config: MetriqTaskConfig,
): FrontierSignal["normalizationParams"] {
  const params: FrontierSignal["normalizationParams"] = {};
  if (typeof config.referenceValue === "number") {
    params.referenceValue = config.referenceValue;
  }
  if (typeof config.lowerReference === "number") {
    params.lowerReference = config.lowerReference;
  }
  if (typeof config.upperReference === "number") {
    params.upperReference = config.upperReference;
  }
  return params;
}

function selectBestBenchmarkResult(
  config: MetriqTaskConfig,
  methodology: GlobalMetricsMethodologyDoc,
  benchmarkRows: MetriqBenchmarkRow[],
  platformsIndex: MetriqPlatformIndexEntry[],
): BenchmarkSignalCandidate | null {
  if (
    methodology.include_only_curated_records &&
    methodology.allowed_task_names.length > 0 &&
    !isTaskAllowedByMethodology(config.label, config, methodology.allowed_task_names)
  ) {
    return null;
  }

  if (config.key === "physicalQubits") {
    return selectPhysicalQubitsCandidate(config, methodology, platformsIndex);
  }

  const candidates = benchmarkRows.flatMap((row) => {
    const benchmarkName = getBenchmarkName(row);
    if (!isBenchmarkFamilyAllowed(config, benchmarkName)) {
      return [];
    }

    const results = (row.results && typeof row.results === "object") ? row.results : {};
    const provider = stringifyNullable(row.provider) ?? "unknown-provider";
    const device = stringifyNullable(row.device) ?? "unknown-device";
    const sourceLabel = `${provider} / ${device}`;
    const comparable = `${sourceLabel} ${benchmarkName}`;
    if (
      methodology.include_only_curated_records &&
      methodology.allowed_platform_names.length > 0 &&
      !matchesCuratedAllowlist(device, comparable, methodology.allowed_platform_names)
    ) {
      return [];
    }
    if (methodology.reject_theoretical_records && looksTheoreticalRecord(comparable.toLowerCase())) {
      return [];
    }

    const metricCandidates: BenchmarkSignalCandidate[] = [];
    for (const [metricName, raw] of Object.entries(results)) {
      const rawMetricValue = parseMetricNumberFromUnknown(raw);
      if (rawMetricValue === null) {
        continue;
      }
      const metricValue = adjustMetricValueForTask(config, metricName, rawMetricValue);
      if (metricValue === null) {
        continue;
      }
      if (!metricMatchesTask(metricName, benchmarkName, config)) {
        continue;
      }
      const evaluatedAtMs = parseDateMs(row.timestamp);
      if (evaluatedAtMs === null) {
        continue;
      }
      const isAttributed = provider !== "unknown-provider" && device !== "unknown-device";
      if (config.requirePlatformAttribution && !isAttributed) {
        continue;
      }
      if (!config.allowPaperOnly && !isAttributed) {
        continue;
      }
      metricCandidates.push({
        metricName,
        metricValue,
        sourceLabel,
        evaluatedAtMs,
        rawSnapshot: sanitizeRecord(row),
        attributionStatus: isAttributed ? "direct" : "provider-only",
        platformId: isAttributed ? `${provider}:${device}` : null,
        submissionId: stringifyNullable(row.suite_id) ?? stringifyNullable(row.app_version),
      });
    }
    return metricCandidates;
  });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => {
    if (config.selectionRule === "min") {
      return left.metricValue - right.metricValue || right.evaluatedAtMs - left.evaluatedAtMs;
    }
    return right.metricValue - left.metricValue || right.evaluatedAtMs - left.evaluatedAtMs;
  });

  return candidates[0];
}

async function fetchBenchmarkRows(): Promise<MetriqBenchmarkRow[]> {
  const rows = await fetchJson<unknown[]>(METRIQ_BENCHMARK_LATEST_URL, 2, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!Array.isArray(rows)) {
    throw new HttpStatusError(502, "benchmark.latest.json did not return an array");
  }
  return rows.filter((row): row is MetriqBenchmarkRow => Boolean(row && typeof row === "object"));
}

async function fetchPlatformsIndex(): Promise<MetriqPlatformIndexEntry[]> {
  const payload = await fetchJson<unknown>(METRIQ_PLATFORMS_INDEX_URL, 2, {
    headers: {
      Accept: "application/json",
    },
  });
  if (Array.isArray(payload)) {
    return payload.filter((row): row is MetriqPlatformIndexEntry => Boolean(row && typeof row === "object"));
  }
  if (payload && typeof payload === "object") {
    const wrappedRows = firstDefinedRecordArray(payload as Record<string, unknown>, ["platforms", "data", "rows"]);
    return wrappedRows;
  }
  return [];
}

function firstDefinedRecordArray(record: Record<string, unknown>, keys: string[]): MetriqPlatformIndexEntry[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((entry): entry is MetriqPlatformIndexEntry => Boolean(entry && typeof entry === "object"));
    }
  }
  return [];
}

function selectPhysicalQubitsCandidate(
  config: MetriqTaskConfig,
  methodology: GlobalMetricsMethodologyDoc,
  platformsIndex: MetriqPlatformIndexEntry[],
): BenchmarkSignalCandidate | null {
  const candidates = platformsIndex.flatMap((entry) => {
    const provider = stringifyNullable(entry.provider) ?? "unknown-provider";
    const device = stringifyNullable(entry.device) ?? "unknown-device";
    const comparable = `${provider} ${device}`.toLowerCase();
    if (
      methodology.include_only_curated_records &&
      methodology.allowed_platform_names.length > 0 &&
      !matchesCuratedAllowlist(device.toLowerCase(), comparable, methodology.allowed_platform_names)
    ) {
      return [];
    }

    const current = entry.current && typeof entry.current === "object" ? entry.current : {};
    const metricValue =
      parseMetricNumberFromUnknown((current as Record<string, unknown>).qubits) ??
      parseMetricNumberFromUnknown((current as Record<string, unknown>).num_qubits) ??
      parseMetricNumberFromUnknown((current as Record<string, unknown>).physical_qubits);
    if (metricValue === null) {
      return [];
    }
    const isAttributed = provider !== "unknown-provider" && device !== "unknown-device";
    const attributionStatus: FrontierAttributionStatus = isAttributed ? "direct" : "provider-only";
    if (config.requirePlatformAttribution && !isAttributed) {
      return [];
    }
    return [{
      metricName: "physical_qubits",
      metricValue,
      sourceLabel: `${provider} / ${device}`,
      evaluatedAtMs: Date.now(),
      rawSnapshot: sanitizeRecord(entry),
      attributionStatus,
      platformId: isAttributed ? `${provider}:${device}` : null,
      submissionId: stringifyNullable((current as Record<string, unknown>).timestamp),
    }];
  });
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((left, right) => right.metricValue - left.metricValue);
  return candidates[0];
}

function getBenchmarkName(row: MetriqBenchmarkRow): string {
  const paramsBenchmark = row.params && typeof row.params === "object" ?
    stringifyNullable((row.params as Record<string, unknown>).benchmark_name) :
    null;
  return (paramsBenchmark ?? stringifyNullable(row.job_type) ?? "unknown").toLowerCase();
}

function isBenchmarkFamilyAllowed(config: MetriqTaskConfig, benchmarkName: string): boolean {
  const families = BENCHMARK_FAMILY_BY_TASK[config.key];
  if (!families || families.length === 0) {
    return true;
  }
  return families.some((family) => benchmarkName.includes(family));
}

function synthesizeAqSignalFromCoverage(
  frontierSignals: Partial<Record<MetriqTaskKey, FrontierSignal>>,
  methodology: GlobalMetricsMethodologyDoc,
  benchmarkRows: MetriqBenchmarkRow[],
): FrontierSignal | null {
  const aqConfig = METRIQ_TASK_CONFIGS.find((entry) => entry.key === "aq");
  if (!aqConfig) {
    return null;
  }
  const usable = [
    frontierSignals.quantumVolume?.normalizedScore,
    frontierSignals.physicalQubits?.normalizedScore,
    frontierSignals.twoQubitFidelity?.normalizedScore,
    frontierSignals.readoutFidelity?.normalizedScore,
    frontierSignals.logicalErrorRate?.normalizedScore,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (usable.length < 3) {
    return null;
  }
  const normalizedProxy = clampPercent(usable.reduce((sum, value) => sum + value, 0) / usable.length);
  const aqProxy = Math.max(1, Math.round((normalizedProxy / 100) * 256));
  const newestMs = benchmarkRows
    .map((row) => parseDateMs(row.timestamp) ?? 0)
    .reduce((max, value) => Math.max(max, value), 0);
  return {
    taskId: 128,
    taskName: "Algorithmic Qubits (benchmark-family proxy)",
    acceptedMetricName: "aq_proxy",
    metricValue: aqProxy,
    selectionRule: "max",
    normalizationStrategy: "log-upper",
    normalizationParams: {
      referenceValue: 256,
    },
    normalizedScore: normalizeMetriqSignal(aqProxy, aqConfig),
    sourceLabel: "Benchmark-family synthesized proxy (coverage-gated)",
    submissionId: methodology.methodology_version,
    platformId: "benchmark-family",
    evaluatedAt: newestMs > 0 ? Timestamp.fromMillis(newestMs) : null,
    attributionStatus: "provider-only",
    status: "selected",
    exclusionReason: null,
    rawSnapshot: {
      normalizedProxy,
      source: METRIQ_BENCHMARK_LATEST_URL,
    },
  };
}

function buildGlobalMetricsDoc(
  frontierSignals: Partial<Record<MetriqTaskKey, FrontierSignal>>,
  methodology: GlobalMetricsMethodologyDoc,
  now: Timestamp,
): GlobalMetricsDoc {
  const aqSignal = frontierSignals.aq;
  if (!aqSignal) {
    throw new HttpStatusError(502, "AQ frontier signal is required to build global metrics");
  }

  const utilityFrontierPercent = clampPercent(
    weightedAverage([
      frontierSignals.aq ? {score: frontierSignals.aq.normalizedScore ?? 0, weight: 0.7} : null,
      frontierSignals.quantumVolume ? {score: frontierSignals.quantumVolume.normalizedScore ?? 0, weight: 0.3} : null,
    ]),
  );

  const faultToleranceBridgePercent = clampPercent(
    weightedAverage([
      frontierSignals.logicalErrorRate ? {score: frontierSignals.logicalErrorRate.normalizedScore ?? 0, weight: 0.35} : null,
      frontierSignals.surfaceCode ? {score: frontierSignals.surfaceCode.normalizedScore ?? 0, weight: 0.30} : null,
      frontierSignals.faultTolerantQecLogicalErrorRate ?
        {score: frontierSignals.faultTolerantQecLogicalErrorRate.normalizedScore ?? 0, weight: 0.35} :
        null,
    ]),
  );

  const currentSotaLq = Math.max(
    1,
    Math.round(
      aqSignal.metricValue *
      (0.5 + 1.5 * (faultToleranceBridgePercent / 100)) *
      (0.8 + 0.2 * (utilityFrontierPercent / 100)),
    ),
  );
  const requiredLq = methodology.rsa_2048_required_lq;
  const yearsToLow = computeYearsToQDay(currentSotaLq, requiredLq, methodology.annual_growth_factor_low);
  const yearsToCentral = computeYearsToQDay(currentSotaLq, requiredLq, methodology.annual_growth_factor_central);
  const yearsToHigh = computeYearsToQDay(currentSotaLq, requiredLq, methodology.annual_growth_factor_high);

  return {
    current_sota_lq: currentSotaLq,
    current_sota_source_label: aqSignal.sourceLabel,
    current_sota_submission_id: aqSignal.submissionId,
    current_sota_platform_id: aqSignal.platformId,
    rsa_2048_required_lq: requiredLq,
    rsa_2048_delta: Math.max(0, requiredLq - currentSotaLq),
    rsa_2048_status_percent: requiredLq > 0 ? (currentSotaLq / requiredLq) * 100 : 0,
    q_day_target_runtime_hours: methodology.q_day_target_runtime_hours,
    years_to_qday_central: yearsToCentral,
    years_to_qday_low: yearsToLow,
    years_to_qday_high: yearsToHigh,
    q_day_year_central: currentUtcYear() + yearsToCentral,
    q_day_year_low: currentUtcYear() + yearsToLow,
    q_day_year_high: currentUtcYear() + yearsToHigh,
    q_day_estimate_date_central: Timestamp.fromMillis(now.toMillis() + yearsToCentral * 365.25 * 24 * 60 * 60 * 1000),
    annual_growth_factor_central: methodology.annual_growth_factor_central,
    annual_growth_factor_low: methodology.annual_growth_factor_low,
    annual_growth_factor_high: methodology.annual_growth_factor_high,
    methodology_version: methodology.methodology_version,
    methodology_note: normalizeGlobalMetricsMethodologyNote(methodology.methodology_note),
    source: "metriq-curated",
    source_url: METRIQ_BENCHMARK_LATEST_URL,
    leader_metric_basis: "effective-logical-qubit-proxy derived from AQ frontier and curated fault-tolerance bridge metrics",
    composite_readiness_percent: weightedAverage([
      {score: utilityFrontierPercent, weight: 0.5},
      {score: faultToleranceBridgePercent, weight: 0.5},
    ]),
    utility_frontier_percent: utilityFrontierPercent,
    fault_tolerance_bridge_percent: faultToleranceBridgePercent,
    frontier_dependency_version: methodology.methodology_version,
    frontier_signals: frontierSignals,
    is_stale: false,
    stale_after_hours: METRICS_STALE_AFTER_HOURS,
    selected_record: {
      isSota: true,
      sotaValueRaw: String(aqSignal.metricValue),
      sotaValueParsed: aqSignal.metricValue,
      title: aqSignal.sourceLabel,
      platformName: firstDefinedString(aqSignal.rawSnapshot, ["platformName"]) ?? null,
      taskName: aqSignal.taskName,
      rawSnapshot: aqSignal.rawSnapshot,
    },
    last_successful_sync: now,
    last_attempted_sync: now,
  };
}

function buildGlobalRiskSignalsDoc(
  frontierSignals: Partial<Record<MetriqTaskKey, FrontierSignal>>,
  methodology: GlobalRiskMethodologyDoc,
  frontier: GlobalMetriqFrontierDoc,
  now: Timestamp,
): GlobalRiskSignalsDoc {
  const utilityFrontier = buildRiskAxis(
    "Utility Frontier",
    [
      frontierSignals.aq ? {signal: frontierSignals.aq, weight: methodology.utilityWeights.aq} : null,
      frontierSignals.quantumVolume ? {signal: frontierSignals.quantumVolume, weight: methodology.utilityWeights.quantumVolume} : null,
    ],
    2,
  );

  const hardwareScale = buildRiskAxis(
    "Hardware Scale",
    [
      frontierSignals.physicalQubits ? {signal: frontierSignals.physicalQubits, weight: methodology.hardwareScaleWeights.physicalQubits} : null,
    ],
    1,
  );

  const gateQuality = buildRiskAxis(
    "Gate Quality",
    [
      frontierSignals.twoQubitFidelity ? {signal: frontierSignals.twoQubitFidelity, weight: methodology.gateQualityWeights.twoQubitFidelity} : null,
      frontierSignals.readoutFidelity ? {signal: frontierSignals.readoutFidelity, weight: methodology.gateQualityWeights.readoutFidelity} : null,
      frontierSignals.coherenceT2 ? {signal: frontierSignals.coherenceT2, weight: methodology.gateQualityWeights.coherenceT2} : null,
    ],
    2,
  );

  const runtimePracticality = buildRiskAxis(
    "Runtime Practicality",
    [
      frontierSignals.singleQubitGateSpeed ? {signal: frontierSignals.singleQubitGateSpeed, weight: methodology.runtimeWeights.singleQubitGateSpeed} : null,
      frontierSignals.twoQubitGateSpeed ? {signal: frontierSignals.twoQubitGateSpeed, weight: methodology.runtimeWeights.twoQubitGateSpeed} : null,
    ],
    2,
  );

  const faultTolerance = buildRiskAxis(
    "Fault Tolerance",
    [
      frontierSignals.logicalErrorRate ? {signal: frontierSignals.logicalErrorRate, weight: methodology.faultToleranceWeights.errorCorrectionMitigation} : null,
      frontierSignals.surfaceCode ? {signal: frontierSignals.surfaceCode, weight: methodology.faultToleranceWeights.surfaceCode} : null,
      frontierSignals.faultTolerantQecLogicalErrorRate ?
        {signal: frontierSignals.faultTolerantQecLogicalErrorRate, weight: methodology.faultToleranceWeights.faultTolerantQecLogicalErrorRate} :
        null,
    ],
    2,
  );

  const cryptanalyticRelevance: RiskAxis = {
    label: "Cryptanalytic Relevance",
    value: null,
    status: "unavailable",
    detail: "No direct production-safe cryptanalytic benchmark currently admitted.",
    sourceTasks: [],
  };

  const harvestableShare = methodology.encryptedTrafficShare * (1 - methodology.pqProtectedShare);
  const cryptanalyticReadinessCore = clampPercent(weightedAverage([
    utilityFrontier.value !== null ? {score: utilityFrontier.value, weight: methodology.hndlWeights.utilityFrontier} : null,
    hardwareScale.value !== null ? {score: hardwareScale.value, weight: methodology.hndlWeights.hardwareScale} : null,
    gateQuality.value !== null ? {score: gateQuality.value, weight: methodology.hndlWeights.gateQuality} : null,
    runtimePracticality.value !== null ? {score: runtimePracticality.value, weight: methodology.hndlWeights.runtimePracticality} : null,
    faultTolerance.value !== null ? {score: faultTolerance.value, weight: methodology.hndlWeights.faultTolerance} : null,
  ]));
  const hndlPressure = clampPercent(harvestableShare * cryptanalyticReadinessCore);
  const hndlStatus =
    hndlPressure >= 60 ? "CRITICAL" :
      hndlPressure >= 35 ? "HIGH" :
        hndlPressure >= 15 ? "MEDIUM" :
          "LOW";

  return {
    threatMatrixAxes: {
      utilityFrontier,
      hardwareScale,
      gateQuality,
      runtimePracticality,
      faultTolerance,
      cryptanalyticRelevance,
    },
    harvestableShare,
    cryptanalyticReadinessCore,
    hndlPressure,
    hndlStatus,
    methodologyVersion: methodology.methodologyVersion,
    methodologyNote: methodology.methodologyNote,
    isStale: frontier.isStale,
    staleAfterHours: RISK_SIGNALS_STALE_AFTER_HOURS,
    lastSuccessfulSync: now,
    lastAttemptedSync: now,
  };
}

function buildRiskAxis(
  label: string,
  values: Array<{signal: FrontierSignal; weight: number} | null>,
  minimumDirectCount: number,
): RiskAxis {
  const usable = values.filter((value): value is {signal: FrontierSignal; weight: number} => value !== null);
  if (usable.length === 0) {
    return {
      label,
      value: null,
      status: "unavailable",
      detail: "No curated frontier signals are currently available.",
      sourceTasks: [],
    };
  }

  const value = clampPercent(weightedAverage(
    usable.map((entry) => ({
      score: entry.signal.normalizedScore ?? 0,
      weight: entry.weight,
    })),
  ));

  return {
    label,
    value,
    status: usable.length >= minimumDirectCount ? "direct" : "modelled",
    detail: `${usable.length} curated signal${usable.length === 1 ? "" : "s"} contributed to this axis.`,
    sourceTasks: usable.map((entry) => entry.signal.taskId),
  };
}

async function publishGlobalMetriqFrontier(
  frontier: GlobalMetriqFrontierDoc,
  reason: "scheduled-sync" | "manual-sync",
): Promise<void> {
  const currentRef = db.collection("global").doc("metriq_frontier");
  const historyRef = db.collection("global_metriq_frontier_history").doc();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(currentRef);
    const previous = snapshot.exists ? snapshot.data() as GlobalMetriqFrontierDoc : null;
    const historyDoc: GlobalMetriqFrontierHistoryDoc = {
      historyId: historyRef.id,
      publishedAt: frontier.lastSuccessfulSync,
      previous,
      next: frontier,
      reason,
    };

    transaction.set(currentRef, frontier);
    transaction.set(historyRef, historyDoc);
  });
}

async function publishGlobalMetrics(
  metrics: GlobalMetricsDoc,
  reason: "scheduled-sync" | "manual-sync",
): Promise<void> {
  const currentRef = db.collection("global").doc("metrics");
  const historyRef = db.collection("global_metrics_history").doc();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(currentRef);
    const previous = snapshot.exists ? snapshot.data() as GlobalMetricsDoc : null;
    const historyDoc: GlobalMetricsHistoryDoc = {
      historyId: historyRef.id,
      publishedAt: metrics.last_successful_sync,
      previous,
      next: metrics,
      reason,
    };

    transaction.set(currentRef, metrics);
    transaction.set(historyRef, historyDoc);
  });
}

async function publishGlobalRiskSignals(
  riskSignals: GlobalRiskSignalsDoc,
  reason: "scheduled-sync" | "manual-sync",
): Promise<void> {
  const currentRef = db.collection("global").doc("risk_signals");
  const historyRef = db.collection("global_risk_signals_history").doc();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(currentRef);
    const previous = snapshot.exists ? snapshot.data() as GlobalRiskSignalsDoc : null;
    const historyDoc: GlobalRiskSignalsHistoryDoc = {
      historyId: historyRef.id,
      publishedAt: riskSignals.lastSuccessfulSync,
      previous,
      next: riskSignals,
      reason,
    };

    transaction.set(currentRef, riskSignals);
    transaction.set(historyRef, historyDoc);
  });
}

async function markGlobalDocsStale(docIds: string[]): Promise<void> {
  const now = Timestamp.now();
  await Promise.all(docIds.map(async (docId) => {
    const ref = db.collection("global").doc(docId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return;
    }

    await ref.set({
      lastAttemptedSync: now,
      last_attempted_sync: now,
      isStale: true,
      is_stale: true,
      staleAfterHours: docId === "risk_signals" ? RISK_SIGNALS_STALE_AFTER_HOURS : METRICS_STALE_AFTER_HOURS,
      stale_after_hours: docId === "risk_signals" ? RISK_SIGNALS_STALE_AFTER_HOURS : METRICS_STALE_AFTER_HOURS,
    }, {merge: true});
  }));
}

function computeYearsToQDay(currentSotaLq: number, requiredLq: number, growthFactor: number): number {
  if (currentSotaLq <= 0) {
    throw new HttpStatusError(502, "Current SOTA logical qubits must be greater than zero");
  }
  if (currentSotaLq >= requiredLq) {
    return 0;
  }
  return Math.log(requiredLq / currentSotaLq) / Math.log(growthFactor);
}

function parseMetricNumber(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMetricNumberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    return parseMetricNumber(value);
  }
  return null;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function firstDefinedString(record: Record<string, unknown>, keys: string[]): string | null {
  return firstString(record, keys);
}

function normalizeComparableText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildDefaultGlobalMetricsTaskNames(): string[] {
  return METRIQ_TASK_CONFIGS.map((config) => config.label);
}

function normalizeAllowedTaskNames(values: string[]): string[] {
  const deduped = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  if (deduped.length === 0) {
    return buildDefaultGlobalMetricsTaskNames();
  }

  if (
    deduped.length === 1 &&
    normalizeComparableText(deduped[0]) === "logical qubits"
  ) {
    return buildDefaultGlobalMetricsTaskNames();
  }

  return deduped;
}

function normalizeGlobalMetricsMethodologyNote(value: string): string {
  return LEGACY_GLOBAL_METRICS_METHOD_NOTES.has(value) ?
    DEFAULT_GLOBAL_METRICS_METHOD_NOTE :
    value;
}

function matchesCuratedAllowlist(
  primaryField: string,
  fallbackField: string,
  allowlist: string[],
): boolean {
  return allowlist
    .map((entry) => normalizeComparableText(entry))
    .some((normalizedEntry) =>
      primaryField.includes(normalizedEntry) ||
      (!primaryField && fallbackField.includes(normalizedEntry)),
    );
}

function isTaskAllowedByMethodology(
  taskName: string,
  config: MetriqTaskConfig,
  allowlist: string[],
): boolean {
  const normalizedTaskName = normalizeComparableText(taskName);
  const normalizedLabel = normalizeComparableText(config.label);
  return allowlist
    .map((entry) => normalizeComparableText(entry))
    .some((entry) =>
      normalizedTaskName.includes(entry) ||
      entry.includes(normalizedTaskName) ||
      normalizedLabel.includes(entry) ||
      entry.includes(normalizedLabel),
    );
}

function metricMatchesTask(metricName: string, taskName: string, config: MetriqTaskConfig): boolean {
  const normalizedMetric = normalizeComparableText(metricName);
  const acceptedMetrics = (config.acceptedMetricNames ?? []).map((name) => normalizeComparableText(name));
  if (acceptedMetrics.length > 0) {
    const acceptedMatch = acceptedMetrics.some((accepted) =>
      normalizedMetric === accepted ||
      normalizedMetric.includes(accepted) ||
      accepted.includes(normalizedMetric),
    );
    if (acceptedMatch) {
      return true;
    }
  }

  const normalizedTask = normalizeComparableText(taskName);
  const normalizedLabel = normalizeComparableText(config.label);
  const normalizedAliases = (config.metricAliases ?? []).map((alias) => normalizeComparableText(alias));
  return [normalizedTask, normalizedLabel, ...normalizedAliases]
    .filter(Boolean)
    .some((candidate) =>
      normalizedMetric === candidate ||
      normalizedMetric.includes(candidate) ||
      candidate.includes(normalizedMetric),
    );
}

function adjustMetricValueForTask(config: MetriqTaskConfig, metricName: string, value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const normalizedMetric = normalizeComparableText(metricName);
  if (config.key === "singleQubitGateSpeed" || config.key === "twoQubitGateSpeed") {
    if (normalizedMetric.includes("clops")) {
      return value <= 0 ? null : 1 / value;
    }
  }
  if (config.key === "logicalErrorRate" || config.key === "faultTolerantQecLogicalErrorRate") {
    if (normalizedMetric.includes("fidelity")) {
      return value <= 0 ? null : 1 / value;
    }
  }
  return value;
}

function looksTheoreticalRecord(value: string): boolean {
  const markers = [
    "theoretical",
    "simulated",
    "simulation",
    "idealized",
    "modeled",
    "model",
    "projected",
    "hypothetical",
    "estimated",
  ];
  return markers.some((marker) => value.includes(marker));
}

function normalizeMetriqSignal(value: number, config: MetriqTaskConfig): number | null {
  switch (config.normalizationStrategy) {
  case "log-upper":
    return typeof config.referenceValue === "number" ?
      logNormalizedPercent(value, config.referenceValue) :
      null;
  case "linear":
    return typeof config.lowerReference === "number" && typeof config.upperReference === "number" ?
      linearNormalizedPercent(value, config.lowerReference, config.upperReference) :
      null;
  case "inverse-log":
    return typeof config.lowerReference === "number" && typeof config.upperReference === "number" ?
      inverseLogNormalizedPercent(value, config.lowerReference, config.upperReference) :
      null;
  case "inverse-linear":
    return typeof config.lowerReference === "number" && typeof config.upperReference === "number" ?
      inverseLinearNormalizedPercent(value, config.lowerReference, config.upperReference) :
      null;
  default:
    return null;
  }
}

function logNormalizedPercent(value: number, reference: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return clampPercent((Math.log10(1 + value) / Math.log10(1 + reference)) * 100);
}

function inverseLogNormalizedPercent(value: number, worst: number, best: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  const numerator = Math.log10(worst) - Math.log10(value);
  const denominator = Math.log10(worst) - Math.log10(best);
  return clampPercent((numerator / denominator) * 100);
}

function linearNormalizedPercent(value: number, lower: number, upper: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return clampPercent(((value - lower) / (upper - lower)) * 100);
}

function inverseLinearNormalizedPercent(value: number, worst: number, best: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return clampPercent(((worst - value) / (worst - best)) * 100);
}

function weightedAverage(values: Array<{score: number; weight: number} | null>): number {
  const usable = values.filter((value): value is {score: number; weight: number} => value !== null);
  const totalWeight = usable.reduce((sum, value) => sum + value.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }
  return usable.reduce((sum, value) => sum + value.score * value.weight, 0) / totalWeight;
}

function stringifyNullable(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function parseDateMs(value: unknown): number | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
}

function currentUtcYear(): number {
  return new Date().getUTCFullYear();
}

async function getActiveCompanies(): Promise<ParsedCompany[]> {
  const snapshot = await db.collection("companies")
    .where("isActive", "==", true)
    .orderBy("displayOrder", "asc")
    .get();
  return snapshot.docs.map((doc) => doc.data() as ParsedCompany);
}

async function startRun(runId: string, jobType: string, stats: IngestionStats): Promise<void> {
  await db.collection("ingestion_runs").doc(runId).set({
    runId,
    jobType,
    startedAt: FieldValue.serverTimestamp(),
    completedAt: null,
    status: "running",
    stats,
    errors: [],
  });
}

async function finishRun(
  runId: string,
  status: "ok" | "partial" | "error",
  stats: IngestionStats,
  errors: string[],
): Promise<void> {
  await db.collection("ingestion_runs").doc(runId).set({
    completedAt: FieldValue.serverTimestamp(),
    status,
    stats,
    errors,
  }, {merge: true});
}

async function fetchJson<T>(url: string, retries: number, init?: RequestInit): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const timeoutSignal = AbortSignal.timeout(25000);
      const combinedSignal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
      const response = await fetch(url, {
        ...init,
        signal: combinedSignal,
      });
      if (!response.ok) {
        throw new HttpStatusError(response.status, `Request failed with status ${response.status}`);
      }
      return await response.json() as T;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const jitterMs = Math.floor(Math.random() * 400);
        await sleep(((attempt + 1) * 2000) + jitterMs);
      }
    }
  }
  throw lastError;
}

function isForbiddenError(error: unknown): error is HttpStatusError {
  return error instanceof HttpStatusError && error.status === 403;
}

function unsupportedMessage(symbol: string): string {
  return `Finnhub plan does not provide access to symbol ${symbol}`;
}

function isQuoteSupported(quote: FinnhubQuoteResponse): boolean {
  return typeof quote.c === "number" && Number.isFinite(quote.c) && quote.c > 0;
}

function safeNumber(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function timestampFromUnix(unixSeconds: number | undefined): Timestamp | null {
  if (!unixSeconds || !Number.isFinite(unixSeconds)) {
    return null;
  }
  return Timestamp.fromMillis(unixSeconds * 1000);
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function buildGnewsQuery(companies: ParsedCompany[]): string {
  return companies.map((company) => `("${company.searchTerm}")`).join(" OR ");
}

function buildFallbackGnewsQuery(companies: ParsedCompany[]): string {
  return companies.map((company) => {
    const simplifiedName = company.name
      .replace(/,?\s+(Inc\.|Corporation|Corp\.|Ltd\.|Limited|plc|N\.V\.|AG|SE|Co\., Ltd\.)$/i, "")
      .trim();
    return `("${simplifiedName}" AND quantum)`;
  }).join(" OR ");
}

async function fetchGnewsBatch(
  apiKey: string,
  query: string,
  symbols: string[],
): Promise<GnewsResponse> {
  logger.info("Requesting GNews batch", {
    symbols,
    queryLength: query.length,
    query,
  });
  return fetchJson<GnewsResponse>(
    `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&sortby=publishedAt&max=10&apikey=${apiKey}`,
    1,
  );
}

function normalizeGnewsArticle(
  article: GnewsArticle,
  batch: ParsedCompany[],
  ingestBatchId: string,
  ingestQuery: string,
  queryStrategy: "primary" | "fallback",
): NewsFeedDoc | null {
  if (!article.title || !article.url || !article.publishedAt) {
    return null;
  }

  const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
  const scored = batch.map((company) => ({
    company,
    score: scoreArticle(company, text),
  })).filter((entry) => entry.score >= 3).sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.company.displayOrder - right.company.displayOrder;
  });

  if (scored.length === 0) {
    return null;
  }

  const primary = scored[0].company;
  const topMatchScore = scored[0].score;
  const normalizedUrl = normalizeUrl(article.url);
  return {
    articleKey: createHash("sha1").update(normalizedUrl).digest("hex"),
    title: article.title,
    description: article.description ?? null,
    url: article.url,
    normalizedUrl,
    imageUrl: article.image ?? null,
    sourceName: article.source?.name ?? null,
    publishedAt: Timestamp.fromDate(new Date(article.publishedAt)),
    matchedSymbols: scored.map((entry) => entry.company.symbol),
    matchedCompanyNames: scored.map((entry) => entry.company.name),
    matchedSearchTerms: scored.map((entry) => entry.company.searchTerm),
    primarySymbol: primary.symbol,
    primaryTier: primary.tierNormalized,
    queryStrategy,
    matchStrength: queryStrategy === "fallback" || topMatchScore < 6 ? "fallback" : "strong",
    topMatchScore,
    ingestBatchId,
    ingestQuery,
    provider: "gnews",
    language: "en",
  };
}

function scoreArticle(company: ParsedCompany, articleText: string): number {
  let score = 0;
  if (articleText.includes(company.name.toLowerCase())) {
    score += 5;
  }

  const simplifiedName = company.name
    .toLowerCase()
    .replace(/,?\s+(inc\.|corporation|corp\.|ltd\.|limited|plc|n\.v\.|ag|se|co\., ltd\.)$/i, "")
    .trim();
  if (simplifiedName !== company.name.toLowerCase() && articleText.includes(simplifiedName)) {
    score += 3;
  }

  const standaloneSymbol = new RegExp(`\\b${escapeRegex(company.symbol.toLowerCase())}\\b`);
  if (standaloneSymbol.test(articleText)) {
    score += 4;
  }

  if (articleText.includes(company.searchTerm.toLowerCase())) {
    score += 3;
  }

  const tokens = company.searchTerm.toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2 && !COMMON_QUERY_TOKENS.has(token));
  tokens.forEach((token) => {
    if (articleText.includes(token)) {
      score += 1;
    }
  });

  return score;
}

function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  const params = [...url.searchParams.entries()]
    .filter(([key]) => !key.startsWith("utm_") &&
      key !== "fbclid" &&
      key !== "gclid" &&
      key !== "mc_cid" &&
      key !== "mc_eid");
  url.search = "";
  params.forEach(([key, value]) => url.searchParams.append(key, value));
  return url.toString();
}

function mergeStringArrays(existing?: string[], next?: string[]): string[] {
  return [...new Set([...(existing ?? []), ...(next ?? [])])];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
