'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Building2, Database, Gauge, HandCoins, Info, Mail, TrendingUp, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTerminalData } from '@/hooks/use-terminal-data';
import type {
  CompanyDoc,
  FrontierExclusion,
  FrontierSignal,
  GlobalMetriqFrontierDoc,
  GlobalMetricsDoc,
  GlobalRiskSignalsDoc,
  MarketSnapshotDoc,
  NewsFeedDoc,
  RiskAxis,
} from '@/lib/types/firestore';

type LeaderboardRow = CompanyDoc & {
  snapshot?: MarketSnapshotDoc;
};

type FeedThreatLevel = 'critical' | 'high' | 'medium';

type TechnicalThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type SourceLink = {
  label: string;
  url: string;
  note: string;
};

type ScientificMetric = {
  symbol: string;
  modality: string;
  logicalQubits: number | null;
  algorithmicQubits: number | null;
  twoQubitFidelity: number | null;
  coherenceUs: number | null;
  benchmarkNote: string;
  sourceLinks: SourceLink[];
};

type TechnicalLeaderboardRow = LeaderboardRow & {
  modality: string;
  lqLogical: number | null;
  aqAlgorithmic: number | null;
  gateFidelity: number | null;
  coherenceUs: number | null;
  threat: TechnicalThreatLevel;
  audit: {
    signalCount: number;
    criticalSignalCount: number;
    riskScore: number;
    sourceWindow: number;
    benchmarkNote: string;
    metricCoverage: string;
    sourceLinks: SourceLink[];
  };
};

const COMMON_COMPANY_TERMS = new Set([
  'inc',
  'corp',
  'corporation',
  'company',
  'computing',
  'limited',
  'holdings',
  'international',
  'technologies',
  'technology',
  'group',
  'systems',
  'co',
  'ltd',
  'plc',
  'nv',
  'se',
]);

const SCIENTIFIC_METRICS: Record<string, ScientificMetric> = {
  IBM: {
    symbol: 'IBM',
    modality: 'Superconducting Transmon',
    logicalQubits: null,
    algorithmicQubits: null,
    twoQubitFidelity: 99.7,
    coherenceUs: 350,
    benchmarkNote: 'IBM Heron / Nighthawk public metrics: best two-qubit error 1e-3 to 3e-3 and ~350 µs coherence on latest fleet announcements.',
    sourceLinks: [
      {
        label: 'IBM Quantum System Two at RIKEN',
        url: 'https://newsroom.ibm.com/2025-06-23-ibm-and-riken-unveil-first-ibm-quantum-system-two-outside-of-the-u-s',
        note: 'Reports Heron two-qubit error around 3e-3, with best 1e-3.',
      },
      {
        label: 'IBM Quantum Nighthawk / Heron r3',
        url: 'https://quantum.cloud.ibm.com/announcements/en/product-updates/2026-01-05-nighthawk',
        note: 'Reports median T1 of 350 µs and low EPLG on current IBM fleet.',
      },
    ],
  },
  HON: {
    symbol: 'HON',
    modality: 'Trapped Ion (Quantinuum H-Series)',
    logicalQubits: 12,
    algorithmicQubits: null,
    twoQubitFidelity: 99.921,
    coherenceUs: null,
    benchmarkNote: 'Honeywell exposure is represented via Quantinuum hardware disclosures: 12 entangled logical qubits and 99.921% two-qubit fidelity on Helios.',
    sourceLinks: [
      {
        label: 'Microsoft + Quantinuum logical qubits',
        url: 'https://blogs.microsoft.com/blog/2024/09/10/microsoft-announces-the-best-performing-logical-qubits-on-record-and-will-provide-priority-access-to-reliable-quantum-hardware-in-azure-quantum/',
        note: 'Reports creation and entanglement of 12 highly reliable logical qubits on Quantinuum hardware.',
      },
      {
        label: 'Quantinuum Helios fidelity',
        url: 'https://www.quantinuum.com/blog/introducing-helios-the-most-accurate-quantum-computer-in-the-world',
        note: 'Reports 99.921% two-qubit fidelity across all qubit pairs.',
      },
    ],
  },
  IONQ: {
    symbol: 'IONQ',
    modality: 'Trapped Ion',
    logicalQubits: null,
    algorithmicQubits: 64,
    twoQubitFidelity: 99.99,
    coherenceUs: null,
    benchmarkNote: 'IonQ publishes Algorithmic Qubits as its system-level utility metric; latest official public value is #AQ 64 for Tempo.',
    sourceLinks: [
      {
        label: 'IonQ Algorithmic Qubits',
        url: 'https://ionq.com/algorithmic-qubits',
        note: 'Defines #AQ and publishes #AQ 64 for IonQ Tempo.',
      },
      {
        label: 'IonQ two-qubit fidelity record',
        url: 'https://www.ionq.com/news/ionq-achieves-landmark-result-setting-new-world-record-in-quantum-computing',
        note: 'Reports two-qubit gate fidelity exceeding 99.99%.',
      },
    ],
  },
  RGTI: {
    symbol: 'RGTI',
    modality: 'Superconducting Transmon',
    logicalQubits: null,
    algorithmicQubits: null,
    twoQubitFidelity: 99.5,
    coherenceUs: null,
    benchmarkNote: 'Rigetti publicly reports median two-qubit gate fidelity milestones for Ankaa-3 and modular chiplet systems.',
    sourceLinks: [
      {
        label: 'Rigetti Ankaa-3 launch',
        url: 'https://investors.rigetti.com/news-releases/news-release-details/rigetti-computing-launches-84-qubit-ankaatm-3-system-achieves',
        note: 'Reports 99.5% median two-qubit gate fidelity on Ankaa-3.',
      },
      {
        label: 'Rigetti modular 36-qubit system',
        url: 'https://investors.rigetti.com/news-releases/news-release-details/rigetti-demonstrates-industrys-largest-multi-chip-quantum/',
        note: 'Reports 99.5% median two-qubit fidelity on the modular 36-qubit system.',
      },
    ],
  },
  QBTS: {
    symbol: 'QBTS',
    modality: 'Quantum Annealing',
    logicalQubits: null,
    algorithmicQubits: null,
    twoQubitFidelity: null,
    coherenceUs: null,
    benchmarkNote: 'D-Wave annealers do not publish gate-model 2Q fidelity in the same way as circuit-model systems; comparable public metrics are qubit count, connectivity, noise, and coherence improvements.',
    sourceLinks: [
      {
        label: 'D-Wave Advantage2 GA',
        url: 'https://ir.dwavequantum.com/news/news-details/2025/D-Wave-Announces-General-Availability-of-Advantage2-Quantum-Computer-Its-Most-Advanced-and-Performant-System/default.aspx',
        note: 'Reports 4,400+ qubits, 20-way connectivity, 75% lower noise, and doubled coherence.',
      },
    ],
  },
  GOOGL: {
    symbol: 'GOOGL',
    modality: 'Superconducting Transmon',
    logicalQubits: 1,
    algorithmicQubits: null,
    twoQubitFidelity: null,
    coherenceUs: 100,
    benchmarkNote: 'Google publicly reports below-threshold logical-qubit scaling and T1 near 100 µs on Willow; no single official 2Q fidelity value was used here.',
    sourceLinks: [
      {
        label: 'Google Willow',
        url: 'https://blog.google/innovation-and-ai/technology/research/google-willow-quantum-chip/',
        note: 'Reports Willow T1 approaching 100 µs and below-threshold error correction progress.',
      },
      {
        label: 'Google logical qubit milestone',
        url: 'https://blog.google/company-news/inside-google/message-ceo/our-progress-toward-quantum-error-correction/',
        note: 'Reports one logical qubit built from larger physical codes outperforming smaller encoded versions.',
      },
    ],
  },
  INTC: {
    symbol: 'INTC',
    modality: 'Silicon Spin',
    logicalQubits: null,
    algorithmicQubits: null,
    twoQubitFidelity: null,
    coherenceUs: null,
    benchmarkNote: 'Intel publicly reports 99.9% gate fidelity for silicon spin qubits but does not provide a public two-qubit gate fidelity figure suitable for this column.',
    sourceLinks: [
      {
        label: 'Intel silicon spin milestone',
        url: 'https://newsroom.intel.com/new-technologies/intel-quantum-research-published-in-nature',
        note: 'Reports 99.9% gate fidelity for silicon spin qubits manufactured with CMOS processes.',
      },
    ],
  },
  '6702.T': {
    symbol: '6702.T',
    modality: 'Diamond Spin',
    logicalQubits: null,
    algorithmicQubits: null,
    twoQubitFidelity: 99.9,
    coherenceUs: null,
    benchmarkNote: 'Fujitsu and QuTech reported sub-0.1% error probability in a universal gate set for diamond spin qubits, implying >99.9% fidelity.',
    sourceLinks: [
      {
        label: 'Fujitsu high-precision quantum gates',
        url: 'https://www.fujitsu.com/global/about/resources/news/press-releases/2025/0324-02.html',
        note: 'Reports over 99.9% fidelity in both single- and two-qubit operations for diamond spin qubits.',
      },
    ],
  },
};

type QDayAssessment = {
  currentLeaderLq: number;
  currentLeaderSourceLabel: string;
  requiredLogicalQubits: number;
  deltaToRsaBreach: number;
  statusPercent: number;
  annualGrowthFactorCentral: number;
  annualGrowthFactorLow: number;
  annualGrowthFactorHigh: number;
  countdownYears: number;
  countdownDays: number;
  yearsToQDayCentral: number;
  yearsToQDayLow: number;
  yearsToQDayHigh: number;
  earliestYearsToQDay: number;
  latestYearsToQDay: number;
  qDayYearCentral: number;
  targetRuntimeHours: number;
  leaderMetricBasis: string;
  compositeReadinessPercent: number;
  utilityFrontierPercent: number;
  faultToleranceBridgePercent: number;
  severity: TechnicalThreatLevel;
  lastSuccessfulSyncLabel: string;
  methodologyVersion: string;
  methodologyNote: string;
  isStale: boolean;
};

type RiskAssessment = {
  axes: RiskAxis[];
  harvestableShare: number;
  cryptanalyticReadinessCore: number;
  hndlPressure: number;
  hndlStatus: TechnicalThreatLevel;
  methodologyVersion: string;
  methodologyNote: string;
  lastSuccessfulSyncLabel: string;
  isStale: boolean;
};

type IntelligenceStatus = 'LIVE' | 'STALE' | 'PARTIAL' | 'DEGRADED' | 'UNAVAILABLE';

type EvidenceHealth = {
  frontierStatus: IntelligenceStatus;
  frontierSyncLabel: string;
  metricsStatus: IntelligenceStatus;
  metricsSyncLabel: string;
  riskStatus: IntelligenceStatus;
  riskSyncLabel: string;
  productionCount: number;
  diagnosticCount: number;
  excludedCount: number;
  directAxisCount: number;
  modelledAxisCount: number;
  unavailableAxisCount: number;
};

type FrontierSignalRow = {
  signalKey: string;
  signal: FrontierSignal;
  influences: string[];
};

type RejectedSignalGroup = {
  label: string;
  entries: FrontierExclusion[];
};

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return 'N/A';
  }

  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatUtcTimestamp(input?: { toDate?: () => Date } | null) {
  if (!input?.toDate) {
    return 'UNKNOWN TIME';
  }

  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(input.toDate()).replace(',', '') + ' UTC';
}

function formatIsoDate(input?: { toDate?: () => Date } | null) {
  if (!input?.toDate) {
    return new Date().toISOString().slice(0, 10);
  }

  return input.toDate().toISOString().slice(0, 10);
}

function formatMetricValue(value: number) {
  if (!Number.isFinite(value)) {
    return 'N/A';
  }

  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
  }

  if (Math.abs(value) >= 1) {
    return Number(value.toFixed(3)).toString();
  }

  return value.toExponential(2);
}

function healthStatusClass(status: IntelligenceStatus) {
  switch (status) {
    case 'LIVE':
      return 'border-emerald-600 bg-emerald-600/10 text-emerald-300';
    case 'STALE':
      return 'border-amber-500 bg-amber-500/10 text-amber-300';
    case 'PARTIAL':
      return 'border-yellow-500 bg-yellow-500/10 text-yellow-300';
    case 'DEGRADED':
      return 'border-red-500 bg-red-500/10 text-red-300';
    default:
      return 'border-slate-600 bg-slate-600/10 text-slate-300';
  }
}

function attributionBadgeClass(status: FrontierSignal['attributionStatus']) {
  switch (status) {
    case 'direct':
      return 'border-emerald-600 bg-emerald-600/10 text-emerald-300';
    case 'provider-only':
      return 'border-amber-500 bg-amber-500/10 text-amber-300';
    case 'platform-ref-only':
      return 'border-cyan-600 bg-cyan-600/10 text-cyan-300';
    default:
      return 'border-slate-600 bg-slate-600/10 text-slate-300';
  }
}

function formatAttributionStatus(status: FrontierSignal['attributionStatus']) {
  switch (status) {
    case 'provider-only':
      return 'PROVIDER ONLY';
    case 'platform-ref-only':
      return 'PLATFORM REF';
    default:
      return status.toUpperCase();
  }
}

function deriveDocumentStatus(
  isAvailable: boolean,
  isStale: boolean | undefined,
): IntelligenceStatus {
  if (!isAvailable) {
    return 'UNAVAILABLE';
  }

  return isStale ? 'STALE' : 'LIVE';
}

function buildEvidenceHealth(
  globalMetriqFrontier: GlobalMetriqFrontierDoc | null,
  qDay: QDayAssessment | null,
  riskAssessment: RiskAssessment | null,
): EvidenceHealth {
  const axes = riskAssessment?.axes ?? [];

  return {
    frontierStatus: deriveDocumentStatus(Boolean(globalMetriqFrontier), globalMetriqFrontier?.isStale),
    frontierSyncLabel: formatIsoDate(globalMetriqFrontier?.lastSuccessfulSync ?? null),
    metricsStatus: deriveDocumentStatus(Boolean(qDay), qDay?.isStale),
    metricsSyncLabel: qDay?.lastSuccessfulSyncLabel ?? 'UNAVAILABLE',
    riskStatus: deriveDocumentStatus(Boolean(riskAssessment), riskAssessment?.isStale),
    riskSyncLabel: riskAssessment?.lastSuccessfulSyncLabel ?? 'UNAVAILABLE',
    productionCount: Object.keys(globalMetriqFrontier?.productionSignals ?? {}).length,
    diagnosticCount: Object.keys(globalMetriqFrontier?.diagnosticSignals ?? {}).length,
    excludedCount: globalMetriqFrontier?.excludedSignals?.length ?? 0,
    directAxisCount: axes.filter((axis) => axis.status === 'direct').length,
    modelledAxisCount: axes.filter((axis) => axis.status === 'modelled').length,
    unavailableAxisCount: axes.filter((axis) => axis.status === 'unavailable').length,
  };
}

function getSignalInfluences(signalKey: string) {
  switch (signalKey) {
    case 'aq':
      return ['Q-DAY', 'UTILITY', 'HNDL'];
    case 'quantumVolume':
      return ['UTILITY', 'HNDL'];
    case 'physicalQubits':
      return ['HARDWARE', 'HNDL'];
    case 'twoQubitFidelity':
    case 'readoutFidelity':
    case 'coherenceT2':
      return ['GATE QUALITY', 'HNDL'];
    case 'logicalErrorRate':
    case 'surfaceCode':
    case 'faultTolerantQecLogicalErrorRate':
      return ['Q-DAY', 'FAULT TOLERANCE', 'HNDL'];
    case 'singleQubitGateSpeed':
    case 'twoQubitGateSpeed':
      return ['RUNTIME', 'HNDL'];
    default:
      return ['DIAGNOSTIC'];
  }
}

function buildFrontierSignalRows(globalMetriqFrontier: GlobalMetriqFrontierDoc | null): FrontierSignalRow[] {
  return Object.entries(globalMetriqFrontier?.productionSignals ?? {})
    .map(([signalKey, signal]) => ({
      signalKey,
      signal,
      influences: getSignalInfluences(signalKey),
    }))
    .sort((left, right) =>
      (right.signal.normalizedScore ?? -1) - (left.signal.normalizedScore ?? -1) ||
      left.signal.taskId - right.signal.taskId,
    );
}

function buildDiagnosticSignalRows(globalMetriqFrontier: GlobalMetriqFrontierDoc | null): FrontierSignalRow[] {
  return Object.entries(globalMetriqFrontier?.diagnosticSignals ?? {})
    .map(([signalKey, signal]) => ({
      signalKey,
      signal,
      influences: getSignalInfluences(signalKey),
    }))
    .sort((left, right) => left.signal.taskId - right.signal.taskId);
}

function classifyExclusionReason(reason: string) {
  const normalized = reason.toLowerCase();
  if (normalized.includes('allowlist') || normalized.includes('not included')) {
    return 'Allowlist';
  }
  if (normalized.includes('theoretical') || normalized.includes('simulated')) {
    return 'Theoretical';
  }
  if (normalized.includes('attribut') || normalized.includes('platform')) {
    return 'Attribution';
  }
  if (normalized.includes('metric') || normalized.includes('matched')) {
    return 'Metric Match';
  }
  if (normalized.includes('fetch') || normalized.includes('response') || normalized.includes('parse')) {
    return 'Fetch / Parse';
  }
  return 'Other';
}

function buildRejectedSignalGroups(excludedSignals: FrontierExclusion[]): RejectedSignalGroup[] {
  const grouped = excludedSignals.reduce<Map<string, FrontierExclusion[]>>((result, entry) => {
    const key = classifyExclusionReason(entry.reason);
    const existing = result.get(key) ?? [];
    existing.push(entry);
    result.set(key, existing);
    return result;
  }, new Map());

  return [...grouped.entries()]
    .map(([label, entries]) => ({
      label,
      entries: entries.sort((left, right) => left.taskId - right.taskId),
    }))
    .sort((left, right) => right.entries.length - left.entries.length || left.label.localeCompare(right.label));
}

function deriveThreatLevel(article: NewsFeedDoc): FeedThreatLevel {
  const haystack = `${article.title} ${article.description ?? ''} ${article.sourceName ?? ''}`.toLowerCase();

  if (
    haystack.includes('critical') ||
    haystack.includes('breakthrough') ||
    haystack.includes('q-day') ||
    haystack.includes('cryptanalysis') ||
    haystack.includes('error correction') ||
    haystack.includes('willow')
  ) {
    return 'critical';
  }

  if (
    haystack.includes('alert') ||
    haystack.includes('post-quantum') ||
    haystack.includes('qkd') ||
    haystack.includes('migration') ||
    haystack.includes('adoption') ||
    haystack.includes('standard') ||
    haystack.includes('nist')
  ) {
    return 'high';
  }

  return 'medium';
}

function isSponsoredArticle(article: NewsFeedDoc) {
  const haystack = `${article.title} ${article.description ?? ''} ${article.sourceName ?? ''}`.toLowerCase();
  return haystack.includes('sponsor') || haystack.includes('sponsored') || haystack.includes('pqshield');
}

function getFeedPrefix(level: FeedThreatLevel, sponsored: boolean) {
  if (sponsored) {
    return 'PARTNER SPOTLIGHT';
  }

  switch (level) {
    case 'critical':
      return 'CRITICAL';
    case 'high':
      return 'ALERT';
    default:
      return 'UPDATE';
  }
}

function getFeedTone(level: FeedThreatLevel, sponsored: boolean) {
  if (sponsored) {
    return {
      card: 'border-amber-600/80',
      icon: 'text-amber-400',
      badge: 'border-amber-500 text-amber-300',
    };
  }

  switch (level) {
    case 'critical':
      return {
        card: 'border-red-500/80',
        icon: 'text-red-400',
        badge: 'border-red-500 text-red-300',
      };
    case 'high':
      return {
        card: 'border-amber-500/80',
        icon: 'text-amber-400',
        badge: 'border-amber-500 text-amber-300',
      };
    default:
      return {
        card: 'border-cyan-700/80',
        icon: 'text-cyan-300',
        badge: 'border-cyan-600 text-cyan-300',
      };
  }
}

function getCompanyAlias(company: CompanyDoc) {
  return company.name
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part && !COMMON_COMPANY_TERMS.has(part))
    .slice(0, 2);
}

function getArticleSignalSummary(company: CompanyDoc, articles: NewsFeedDoc[]) {
  const aliases = getCompanyAlias(company);
  const related = articles.filter((article) => {
    const haystack = `${article.title} ${article.description ?? ''}`.toLowerCase();
    return (
      article.primarySymbol === company.symbol ||
      aliases.some((alias) => haystack.includes(alias)) ||
      haystack.includes(company.symbol.toLowerCase())
    );
  });

  const criticalSignalCount = related.filter((article) => deriveThreatLevel(article) === 'critical').length;
  const highSignalCount = related.filter((article) => deriveThreatLevel(article) === 'high').length;
  const fallbackSignalCount = related.filter((article) => article.queryStrategy === 'fallback').length;

  return {
    signalCount: related.length,
    criticalSignalCount,
    highSignalCount,
    fallbackSignalCount,
  };
}

function formatFidelity(value: number | null) {
  if (typeof value !== 'number') {
    return 'N/A';
  }

  return `${value.toFixed(2)}%`;
}

function formatCoherence(value: number | null) {
  if (typeof value !== 'number') {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function threatClass(level: TechnicalThreatLevel) {
  switch (level) {
    case 'CRITICAL':
      return 'border-red-500 bg-red-500/15 text-red-300';
    case 'HIGH':
      return 'border-amber-500 bg-amber-500/15 text-amber-300';
    case 'MEDIUM':
      return 'border-yellow-500 bg-yellow-500/15 text-yellow-300';
    default:
      return 'border-cyan-600 bg-cyan-600/10 text-cyan-300';
  }
}

function formatIntegerMetric(value: number | null) {
  if (typeof value !== 'number') {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatCountdown(years: number, days: number) {
  return {
    years: `${years}y`,
    days: `${days}d`,
  };
}

function getMetricCoverage(metric: ScientificMetric) {
  const fields = [
    metric.logicalQubits,
    metric.algorithmicQubits,
    metric.twoQubitFidelity,
    metric.coherenceUs,
  ];
  const available = fields.filter((value) => typeof value === 'number').length;
  return `${available}/4 public metrics disclosed`;
}

function TerminalWarning({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-4">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-300">{title}</p>
      <p className="mt-2 text-sm text-amber-100">{message}</p>
    </div>
  );
}

function MarketTicker({ tickers }: { tickers: MarketSnapshotDoc[] }) {
  if (tickers.length === 0) {
    return <p className="font-mono text-sm text-gray-500">NO LIVE MARKET DATA</p>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-1">
      {tickers.map((ticker) => (
        <div key={ticker.symbol} className="min-w-max rounded-md border border-cyan-900 bg-black/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-cyan-300">{ticker.symbol}</span>
            <span className="font-mono text-sm text-white">{formatCurrency(ticker.currentPrice)}</span>
          </div>
          <div className="mt-1">
            <Badge variant="outline" className={ticker.percentChange && ticker.percentChange >= 0 ? 'border-emerald-500 text-emerald-300' : 'border-red-500 text-red-300'}>
              {formatPercent(ticker.percentChange)}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function buildTechnicalRow(row: LeaderboardRow, articles: NewsFeedDoc[]): TechnicalLeaderboardRow {
  const metric = SCIENTIFIC_METRICS[row.symbol];
  const signals = getArticleSignalSummary(row, articles);

  const riskScore =
    (row.snapshot?.quoteStatus === 'unsupported' ? 2 : 0) +
    (row.snapshot?.quoteStatus === 'error' ? 2.5 : 0) +
    (typeof row.snapshot?.percentChange === 'number' && row.snapshot.percentChange <= -3 ? 1.5 : 0) +
    (typeof row.snapshot?.percentChange === 'number' && row.snapshot.percentChange <= -1 && row.snapshot.percentChange > -3 ? 0.75 : 0) +
    signals.criticalSignalCount * 2 +
    signals.highSignalCount * 1 +
    signals.fallbackSignalCount * 0.5 +
    (row.tierNormalized === 'Quantum Security' ? 1 : 0);

  const threat: TechnicalThreatLevel =
    riskScore >= 6 ? 'CRITICAL' :
      riskScore >= 4 ? 'HIGH' :
        riskScore >= 2 ? 'MEDIUM' :
          'LOW';

  return {
    ...row,
    modality: metric?.modality ?? row.tierNormalized,
    lqLogical: metric?.logicalQubits ?? null,
    aqAlgorithmic: metric?.algorithmicQubits ?? null,
    gateFidelity: metric?.twoQubitFidelity ?? null,
    coherenceUs: metric?.coherenceUs ?? null,
    threat,
    audit: {
      signalCount: signals.signalCount,
      criticalSignalCount: signals.criticalSignalCount,
      riskScore,
      sourceWindow: articles.length,
      benchmarkNote: metric?.benchmarkNote ?? 'No source-backed scientific benchmark is currently loaded for this company.',
      metricCoverage: metric ? getMetricCoverage(metric) : '0/4 public metrics disclosed',
      sourceLinks: metric?.sourceLinks ?? [],
    },
  };
}

function buildRiskAssessment(globalRiskSignals: GlobalRiskSignalsDoc | null): RiskAssessment | null {
  if (!globalRiskSignals) {
    return null;
  }

  return {
    axes: [
      globalRiskSignals.threatMatrixAxes.utilityFrontier,
      globalRiskSignals.threatMatrixAxes.hardwareScale,
      globalRiskSignals.threatMatrixAxes.gateQuality,
      globalRiskSignals.threatMatrixAxes.runtimePracticality,
      globalRiskSignals.threatMatrixAxes.faultTolerance,
      globalRiskSignals.threatMatrixAxes.cryptanalyticRelevance,
    ],
    harvestableShare: globalRiskSignals.harvestableShare,
    cryptanalyticReadinessCore: globalRiskSignals.cryptanalyticReadinessCore,
    hndlPressure: globalRiskSignals.hndlPressure,
    hndlStatus: globalRiskSignals.hndlStatus,
    methodologyVersion: globalRiskSignals.methodologyVersion,
    methodologyNote: globalRiskSignals.methodologyNote,
    lastSuccessfulSyncLabel: formatIsoDate(globalRiskSignals.lastSuccessfulSync ?? null),
    isStale: globalRiskSignals.isStale,
  };
}

function buildQDayAssessment(globalMetrics: GlobalMetricsDoc | null): QDayAssessment | null {
  if (!globalMetrics) {
    return null;
  }

  const totalDays = Math.max(0, Math.round(globalMetrics.years_to_qday_central * 365.25));
  const countdownYears = Math.floor(totalDays / 365.25);
  const countdownDays = Math.max(0, totalDays - Math.round(countdownYears * 365.25));
  const yearsToThreshold = globalMetrics.years_to_qday_central;
  const severity: TechnicalThreatLevel =
    yearsToThreshold <= 2 ? 'CRITICAL' :
      yearsToThreshold <= 5 ? 'HIGH' :
        yearsToThreshold <= 10 ? 'MEDIUM' :
          'LOW';
  const earliestYearsToQDay = Math.min(
    globalMetrics.years_to_qday_low,
    globalMetrics.years_to_qday_central,
    globalMetrics.years_to_qday_high,
  );
  const latestYearsToQDay = Math.max(
    globalMetrics.years_to_qday_low,
    globalMetrics.years_to_qday_central,
    globalMetrics.years_to_qday_high,
  );

  return {
    currentLeaderLq: globalMetrics.current_sota_lq,
    currentLeaderSourceLabel:
      globalMetrics.current_sota_source_label ??
      globalMetrics.selected_record?.title ??
      'Unknown frontier source',
    requiredLogicalQubits: globalMetrics.rsa_2048_required_lq,
    deltaToRsaBreach: globalMetrics.rsa_2048_delta,
    statusPercent: globalMetrics.rsa_2048_status_percent,
    annualGrowthFactorCentral: globalMetrics.annual_growth_factor_central,
    annualGrowthFactorLow: globalMetrics.annual_growth_factor_low,
    annualGrowthFactorHigh: globalMetrics.annual_growth_factor_high,
    countdownYears,
    countdownDays,
    yearsToQDayCentral: globalMetrics.years_to_qday_central,
    yearsToQDayLow: globalMetrics.years_to_qday_low,
    yearsToQDayHigh: globalMetrics.years_to_qday_high,
    earliestYearsToQDay,
    latestYearsToQDay,
    qDayYearCentral: globalMetrics.q_day_year_central,
    targetRuntimeHours: globalMetrics.q_day_target_runtime_hours,
    leaderMetricBasis:
      globalMetrics.leader_metric_basis ??
      'current frontier treated as a logical-qubit input',
    compositeReadinessPercent: globalMetrics.composite_readiness_percent ?? 0,
    utilityFrontierPercent: globalMetrics.utility_frontier_percent ?? 0,
    faultToleranceBridgePercent: globalMetrics.fault_tolerance_bridge_percent ?? 0,
    severity,
    lastSuccessfulSyncLabel: formatIsoDate(globalMetrics.last_successful_sync ?? null),
    methodologyVersion: globalMetrics.methodology_version,
    methodologyNote: globalMetrics.methodology_note,
    isStale: globalMetrics.is_stale,
  };
}

function RadarChart({ axes }: { axes: RiskAxis[] }) {
  const size = 360;
  const center = size / 2;
  const radius = 120;
  const levels = [20, 40, 60, 80, 100];
  const angleStep = (Math.PI * 2) / axes.length;
  const availablePoints = axes.flatMap((axis, index) => {
    if (axis.value === null) {
      return [];
    }

    const angle = -Math.PI / 2 + index * angleStep;
    const r = radius * (axis.value / 100);
    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;
    return [{
      axis,
      x,
      y,
      point: `${x},${y}`,
    }];
  });
  const polygonPoints = availablePoints.map((point) => point.point).join(' ');
  const shouldRenderFilledPolygon = availablePoints.length === axes.length;
  const shouldRenderPolyline = availablePoints.length >= 2;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-[22rem] w-full max-w-[26rem]">
      {levels.map((level) => {
        const points = axes.map((_, index) => {
          const angle = -Math.PI / 2 + index * angleStep;
          const r = radius * (level / 100);
          const x = center + Math.cos(angle) * r;
          const y = center + Math.sin(angle) * r;
          return `${x},${y}`;
        }).join(' ');

        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke={level === 100 ? 'rgba(148,163,184,0.65)' : 'rgba(34,211,238,0.24)'}
            strokeWidth={1.5}
          />
        );
      })}

      {axes.map((axis, index) => {
        const angle = -Math.PI / 2 + index * angleStep;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        const labelX = center + Math.cos(angle) * (radius + 26);
        const labelY = center + Math.sin(angle) * (radius + 26);

        return (
          <g key={axis.label}>
            <line
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke={axis.status === 'unavailable' ? 'rgba(148,163,184,0.35)' : 'rgba(34,211,238,0.35)'}
              strokeWidth={1.2}
              strokeDasharray={axis.status === 'unavailable' ? '4 4' : undefined}
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              className={axis.status === 'unavailable' ? 'fill-slate-600 text-[11px]' : 'fill-slate-400 text-[11px]'}
            >
              {axis.label}
            </text>
          </g>
        );
      })}

      {shouldRenderFilledPolygon ? (
        <polygon points={polygonPoints} fill="rgba(34,211,238,0.18)" stroke="rgb(34,211,238)" strokeWidth={2.5} />
      ) : shouldRenderPolyline ? (
        <polyline points={polygonPoints} fill="none" stroke="rgb(34,211,238)" strokeWidth={2.5} />
      ) : null}

      {availablePoints.map((point) => (
        <circle
          key={point.axis.label}
          cx={point.x}
          cy={point.y}
          r={point.axis.status === 'modelled' ? 4.5 : 5.5}
          fill={point.axis.status === 'modelled' ? 'rgba(34,211,238,0.7)' : 'rgb(103,232,249)'}
        />
      ))}
    </svg>
  );
}

function qDaySeverityClass(level: TechnicalThreatLevel) {
  switch (level) {
    case 'CRITICAL':
      return 'border-red-500 bg-red-500/15 text-red-300';
    case 'HIGH':
      return 'border-amber-500 bg-amber-500/15 text-amber-300';
    case 'MEDIUM':
      return 'border-yellow-500 bg-yellow-500/15 text-yellow-300';
    default:
      return 'border-cyan-600 bg-cyan-600/10 text-cyan-300';
  }
}

function provenanceBadgeClass(kind: 'direct' | 'normalized' | 'modeled') {
  switch (kind) {
    case 'direct':
      return 'border-emerald-600 bg-emerald-600/10 text-emerald-300';
    case 'normalized':
      return 'border-cyan-600 bg-cyan-600/10 text-cyan-300';
    case 'modeled':
    default:
      return 'border-amber-500 bg-amber-500/10 text-amber-300';
  }
}

function ProvenanceLegend({
  items,
  className = '',
}: {
  items: Array<{ label: string; kind: 'direct' | 'normalized' | 'modeled' }>;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {items.map((item) => (
        <Badge key={`${item.kind}-${item.label}`} variant="outline" className={provenanceBadgeClass(item.kind)}>
          {item.label}
        </Badge>
      ))}
    </div>
  );
}

function EvidenceHealthStrip({
  health,
  errors,
}: {
  health: EvidenceHealth;
  errors: string[];
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-[repeat(3,minmax(0,1fr))_1.2fr]">
      <div className="rounded-2xl border border-cyan-900 bg-black/35 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.18em] text-cyan-300">FRONTIER EVIDENCE</p>
          <Badge variant="outline" className={healthStatusClass(health.frontierStatus)}>
            {health.frontierStatus}
          </Badge>
        </div>
        <p className="mt-3 font-mono text-sm text-gray-400">Last sync: {health.frontierSyncLabel}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-gray-300">
          <div>
            <p className="font-mono text-[11px] tracking-[0.14em] text-gray-500">PROD</p>
            <p className="mt-1 font-mono text-xl text-white">{health.productionCount}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-[0.14em] text-gray-500">DIAG</p>
            <p className="mt-1 font-mono text-xl text-white">{health.diagnosticCount}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-[0.14em] text-gray-500">REJECTED</p>
            <p className="mt-1 font-mono text-xl text-white">{health.excludedCount}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-900 bg-black/35 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.18em] text-cyan-300">Q-DAY MODEL</p>
          <Badge variant="outline" className={healthStatusClass(health.metricsStatus)}>
            {health.metricsStatus}
          </Badge>
        </div>
        <p className="mt-3 font-mono text-sm text-gray-400">Last sync: {health.metricsSyncLabel}</p>
        <p className="mt-4 text-sm leading-relaxed text-gray-400">
          Effective logical-qubit proxy derived from curated frontier signals and normalized readiness inputs.
        </p>
      </div>

      <div className="rounded-2xl border border-cyan-900 bg-black/35 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.18em] text-cyan-300">HNDL MODEL</p>
          <Badge variant="outline" className={healthStatusClass(health.riskStatus)}>
            {health.riskStatus}
          </Badge>
        </div>
        <p className="mt-3 font-mono text-sm text-gray-400">Last sync: {health.riskSyncLabel}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-gray-300">
          <div>
            <p className="font-mono text-[11px] tracking-[0.14em] text-gray-500">DIRECT</p>
            <p className="mt-1 font-mono text-xl text-white">{health.directAxisCount}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-[0.14em] text-gray-500">MODELLED</p>
            <p className="mt-1 font-mono text-xl text-white">{health.modelledAxisCount}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-[0.14em] text-gray-500">N/A</p>
            <p className="mt-1 font-mono text-xl text-white">{health.unavailableAxisCount}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-900 bg-cyan-950/10 p-4">
        <p className="font-mono text-xs tracking-[0.18em] text-cyan-300">EVIDENCE POSTURE</p>
        {errors.length > 0 ? (
          <div className="mt-3 space-y-2 text-sm text-amber-100">
            <Badge variant="outline" className={healthStatusClass('DEGRADED')}>
              DEGRADED INPUTS
            </Badge>
            {errors.map((error) => (
              <p key={error} className="leading-relaxed text-amber-100/80">{error}</p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-gray-400">
            Curated frontier signals, modeled outputs, and watch status are all available. Use the evidence tables below to inspect admitted and rejected records.
          </p>
        )}
      </div>
    </div>
  );
}

function FrontierEvidencePanel({
  frontier,
  error,
}: {
  frontier: GlobalMetriqFrontierDoc | null;
  error: string | null;
}) {
  if (error) {
    return <TerminalWarning title="Frontier Evidence Unavailable" message={error} />;
  }

  if (!frontier) {
    return <TerminalWarning title="Frontier Evidence Unavailable" message="global/metriq_frontier has not been published yet." />;
  }

  const rows = buildFrontierSignalRows(frontier);

  return (
    <>
      <ProvenanceLegend
        className="mb-5"
        items={[
          { label: 'DIRECT BENCHMARK INPUT', kind: 'direct' },
          { label: 'NORMALIZED SCORE', kind: 'normalized' },
          { label: 'ADMITTED PRODUCTION SIGNAL', kind: 'modeled' },
        ]}
      />
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="border-b border-cyan-900 text-xs uppercase tracking-[0.2em] text-cyan-300">
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3 text-center">Normalized</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Attribution</th>
                <th className="px-4 py-3">Evaluated</th>
                <th className="px-4 py-3">Influence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ signalKey, signal, influences }) => (
                <tr key={signalKey} className="border-b border-cyan-950/70 align-top text-xs">
                  <td className="px-4 py-4">
                    <p className="font-mono text-sm text-white">{signal.taskName}</p>
                    <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-gray-500">
                      TASK {signal.taskId} · {signal.selectionRule.toUpperCase()}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-mono text-sm text-cyan-300">{formatMetricValue(signal.metricValue)}</p>
                    <p className="mt-1 text-gray-400">{signal.acceptedMetricName}</p>
                    <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-gray-500">
                      {signal.normalizationStrategy.toUpperCase()}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <p className="font-mono text-lg text-white">
                      {typeof signal.normalizedScore === 'number' ? signal.normalizedScore.toFixed(1) : 'N/A'}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-200">{signal.sourceLabel}</p>
                    {signal.submissionId || signal.platformId ? (
                      <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-gray-500">
                        SUB {signal.submissionId ?? 'N/A'} · PLATFORM {signal.platformId ?? 'N/A'}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="outline" className={attributionBadgeClass(signal.attributionStatus)}>
                      {formatAttributionStatus(signal.attributionStatus)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-mono text-[11px] tracking-[0.08em] text-gray-400">
                      {formatUtcTimestamp(signal.evaluatedAt)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {influences.map((influence) => (
                        <Badge key={`${signalKey}-${influence}`} variant="outline" className="border-cyan-800 bg-cyan-950/20 text-cyan-200">
                          {influence}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4 text-sm text-gray-500">
          No production frontier signals are currently published.
        </p>
      )}
      <p className="mt-5 font-mono text-xs leading-relaxed text-gray-500">
        Methodology: {frontier.methodologyVersion}. Selected rows are the admitted production signals currently feeding global Q-Day and HNDL outputs.
      </p>
    </>
  );
}

function RejectedSignalsPanel({
  frontier,
  error,
}: {
  frontier: GlobalMetriqFrontierDoc | null;
  error: string | null;
}) {
  if (error) {
    return <TerminalWarning title="Rejected Signals Unavailable" message={error} />;
  }

  if (!frontier) {
    return <TerminalWarning title="Rejected Signals Unavailable" message="global/metriq_frontier has not been published yet." />;
  }

  const diagnosticRows = buildDiagnosticSignalRows(frontier);
  const rejectedGroups = buildRejectedSignalGroups(frontier.excludedSignals ?? []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-cyan-900 bg-cyan-950/10 p-5">
          <p className="font-mono text-xs tracking-[0.2em] text-cyan-300">DIAGNOSTIC SIGNALS</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="font-mono text-3xl text-white">{diagnosticRows.length}</p>
            <Badge variant="outline" className="border-cyan-600 bg-cyan-600/10 text-cyan-300">
              OBSERVED
            </Badge>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-gray-400">
            Observed and retained for analysis, but not currently admitted to production-safe outputs.
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-900 bg-black/30">
          <div className="border-b border-cyan-950 px-5 py-4">
            <p className="font-mono text-xs tracking-[0.2em] text-cyan-300">DIAGNOSTIC TASK LIST</p>
          </div>
          {diagnosticRows.length ? (
            <div className="divide-y divide-cyan-950">
              {diagnosticRows.map(({ signalKey, signal, influences }) => (
                <div key={signalKey} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]">
                  <div className="min-w-0">
                    <p className="font-mono text-base leading-snug text-white">{signal.taskName}</p>
                    <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-gray-500">
                      TASK {signal.taskId} · {signal.normalizationStrategy.toUpperCase()}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-cyan-300">
                      {formatMetricValue(signal.metricValue)} {signal.acceptedMetricName}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-400">{signal.sourceLabel}</p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                    <Badge variant="outline" className="border-slate-600 bg-slate-600/10 text-slate-300">
                      DIAGNOSTIC
                    </Badge>
                    {influences.map((influence) => (
                      <Badge key={`${signalKey}-${influence}`} variant="outline" className="border-cyan-800 bg-cyan-950/20 text-cyan-200">
                        {influence}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-gray-500">No diagnostic signals are currently published.</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.2em] text-cyan-300">REJECTED SIGNALS</p>
          <Badge variant="outline" className="border-amber-500 bg-amber-500/10 text-amber-300">
            {(frontier.excludedSignals ?? []).length} REJECTED
          </Badge>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          Rejected entries document what the framework refused to admit into the current frontier profile and why.
        </p>
        <div className="mt-4 space-y-4">
          {rejectedGroups.length ? rejectedGroups.map((group) => (
            <div key={group.label} className="rounded-2xl border border-amber-900/70 bg-amber-950/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/60 pb-3">
                <div>
                  <p className="font-mono text-sm text-amber-200">{group.label}</p>
                  <p className="mt-1 text-xs text-amber-100/60">
                    {group.entries.length} rejected {group.entries.length === 1 ? 'task' : 'tasks'} in this category
                  </p>
                </div>
                <Badge variant="outline" className="border-amber-700 bg-amber-700/10 text-amber-200">
                  {group.entries.length}
                </Badge>
              </div>
              <div className="mt-4 divide-y divide-amber-900/50">
                {group.entries.map((entry) => (
                  <div
                    key={`${group.label}-${entry.taskKey}-${entry.taskId}`}
                    className="grid gap-4 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_auto]"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-base leading-snug text-white">{entry.taskName}</p>
                      <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-gray-500">
                        TASK {entry.taskId} · {entry.signalTier.toUpperCase()} · KEY {entry.taskKey.toUpperCase()}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm leading-relaxed text-amber-100/80">{entry.reason}</p>
                    </div>
                    <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                      {entry.required ? (
                        <Badge variant="outline" className="border-red-500 bg-red-500/10 text-red-300">
                          REQUIRED
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className="border-amber-800 bg-amber-950/40 text-amber-200">
                        {group.label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )) : (
            <p className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4 text-sm text-gray-500">
              No rejected signals are currently published.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function HardwareLeaderboard({
  rows,
  onInspect,
}: {
  rows: TechnicalLeaderboardRow[];
  onInspect: (row: TechnicalLeaderboardRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1220px] text-left text-sm">
        <thead>
          <tr className="border-b border-cyan-900 text-xs uppercase tracking-[0.2em] text-cyan-300">
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3 text-center">
              <div>LQ</div>
              <div>(Logical)</div>
              <div className="text-cyan-400">↓</div>
            </th>
            <th className="px-4 py-3 text-center">
              <div>#AQ</div>
              <div>(Algorithmic)</div>
            </th>
            <th className="px-4 py-3 text-center">
              <div>Gate Fidelity</div>
              <div>(2-Q)</div>
            </th>
            <th className="px-4 py-3 text-center">
              <div>Coherence</div>
              <div>(μs)</div>
            </th>
            <th className="px-4 py-3">Modality</th>
            <th className="px-4 py-3">Threat</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            return (
              <tr
                key={row.symbol}
                className="cursor-pointer border-b border-cyan-950/80 text-xs hover:bg-cyan-950/20"
                onClick={() => onInspect(row)}
              >
                <td className="px-4 py-5 font-mono text-[1.05rem] font-bold text-white">{row.name}</td>
                <td className="px-4 py-5 text-center font-mono text-[1.1rem] text-cyan-300">{formatIntegerMetric(row.lqLogical)}</td>
                <td className="px-4 py-5 text-center font-mono text-[1.1rem] text-cyan-300">{formatIntegerMetric(row.aqAlgorithmic)}</td>
                <td className="px-4 py-5 text-center font-mono text-[1.1rem] text-cyan-300">{formatFidelity(row.gateFidelity)}</td>
                <td className="px-4 py-5 text-center font-mono text-[1.1rem] text-cyan-300">{formatCoherence(row.coherenceUs)}</td>
                <td className="px-4 py-5 font-mono text-[1rem] text-gray-100">{row.modality}</td>
                <td className="px-4 py-5">
                  <Badge variant="outline" className={threatClass(row.threat)}>
                    {row.threat}
                  </Badge>
                </td>
                <td className="px-4 py-5">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      className="font-mono text-cyan-300 hover:bg-cyan-950/30 hover:text-cyan-200"
                      onClick={(event) => {
                        event.stopPropagation();
                        onInspect(row);
                      }}
                    >
                      <Info className="h-4 w-4" />
                      Source
                    </Button>
                    <Button
                      type="button"
                      asChild
                      className="rounded-xl border border-cyan-500 bg-white font-mono text-cyan-500 hover:bg-cyan-50"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <a
                        href={`mailto:analyst@xqbts.dev?subject=${encodeURIComponent(`Request Audit: ${row.name}`)}&body=${encodeURIComponent(
                          `Please review ${row.name} (${row.symbol}) for a PQC migration audit.\n\nCurrent leaderboard metrics:\nLQ: ${formatIntegerMetric(row.lqLogical)}\nAQ: ${formatIntegerMetric(row.aqAlgorithmic)}\nGate Fidelity: ${formatFidelity(row.gateFidelity)}\nCoherence: ${formatCoherence(row.coherenceUs)} us\nModality: ${row.modality}\nThreat: ${row.threat}`,
                        )}`}
                      >
                        Request Audit
                      </a>
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AuditModal({ row, onClose }: { row: TechnicalLeaderboardRow | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {row ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-3xl rounded-[1.75rem] border border-cyan-800 bg-slate-950/95 p-8 shadow-[0_0_60px_rgba(8,145,178,0.18)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs tracking-[0.24em] text-cyan-300">TECHNICAL SOURCE TRACE</p>
                <h3 className="mt-3 font-mono text-2xl font-bold text-white">{row.name}</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Publicly disclosed scientific metrics only. `N/A` means the company or modality does not publish a defensible value for that column. Threat remains an operator heuristic derived from live market/news inputs over the latest {row.audit.sourceWindow} articles.
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-cyan-300 hover:bg-cyan-950/40" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-cyan-900 bg-black/40 p-4">
                <p className="font-mono text-xs tracking-[0.2em] text-gray-500">LQ</p>
                <p className="mt-2 font-mono text-3xl text-cyan-300">{formatIntegerMetric(row.lqLogical)}</p>
                <p className="mt-3 text-sm text-gray-400">
                  {row.audit.metricCoverage}. Values shown only when directly disclosed by the vendor or an official partner announcement.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-900 bg-black/40 p-4">
                <p className="font-mono text-xs tracking-[0.2em] text-gray-500">AQ</p>
                <p className="mt-2 font-mono text-3xl text-cyan-300">{formatIntegerMetric(row.aqAlgorithmic)}</p>
                <p className="mt-3 text-sm text-gray-400">
                  Algorithmic qubits are only shown when the vendor explicitly publishes an AQ-style benchmark, such as IonQ.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-900 bg-black/40 p-4">
                <p className="font-mono text-xs tracking-[0.2em] text-gray-500">THREAT</p>
                <p className="mt-2 font-mono text-3xl text-cyan-300">{row.threat}</p>
                <p className="mt-3 text-sm text-gray-400">
                  Operator heuristic score {row.audit.riskScore.toFixed(1)} from unsupported coverage, price stress, and high-severity news activity.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-cyan-900 bg-black/40 p-4">
                <p className="font-mono text-xs tracking-[0.2em] text-cyan-300">INPUTS</p>
                <div className="mt-4 space-y-3 text-sm text-gray-300">
                  <p><span className="text-gray-500">Tier:</span> {row.tierNormalized}</p>
                  <p><span className="text-gray-500">Modality:</span> {row.modality}</p>
                  <p><span className="text-gray-500">Quote status:</span> {row.snapshot?.quoteStatus ?? 'missing'}</p>
                  <p><span className="text-gray-500">Price change:</span> {formatPercent(row.snapshot?.percentChange)}</p>
                  <p><span className="text-gray-500">Signal count:</span> {row.audit.signalCount}</p>
                  <p><span className="text-gray-500">Critical signals:</span> {row.audit.criticalSignalCount}</p>
                  <p><span className="text-gray-500">Benchmark note:</span> {row.audit.benchmarkNote}</p>
                </div>
              </div>
              <div className="rounded-xl border border-cyan-900 bg-black/40 p-4">
                <p className="font-mono text-xs tracking-[0.2em] text-cyan-300">SCIENTIFIC SOURCES</p>
                <div className="mt-4 space-y-3 text-sm text-gray-300">
                  <p><span className="text-gray-500">Logical qubits:</span> {formatIntegerMetric(row.lqLogical)}</p>
                  <p><span className="text-gray-500">Algorithmic qubits:</span> {formatIntegerMetric(row.aqAlgorithmic)}</p>
                  <p><span className="text-gray-500">Displayed fidelity:</span> {formatFidelity(row.gateFidelity)}</p>
                  <p><span className="text-gray-500">Displayed coherence:</span> {formatCoherence(row.coherenceUs)} μs</p>
                  {row.audit.sourceLinks.length ? (
                    <div className="space-y-2 pt-2">
                      {row.audit.sourceLinks.map((source) => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="block rounded-lg border border-cyan-900 bg-cyan-950/10 p-3 hover:border-cyan-700"
                        >
                          <p className="font-mono text-cyan-300">{source.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-gray-400">{source.note}</p>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No official benchmark source loaded yet.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function NewsFeed({ articles }: { articles: NewsFeedDoc[] }) {
  if (articles.length === 0) {
    return <p className="font-mono text-sm text-gray-500">NO RECENT ARTICLES</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-800/70 bg-amber-950/15 p-4">
        <p className="font-mono text-xs tracking-[0.18em] text-amber-300">OPERATOR HEURISTIC</p>
        <p className="mt-2 text-sm leading-relaxed text-amber-100/80">
          Feed severity is derived from article text and watchlist matching. It is a secondary operator signal and not part of the core frontier methodology.
        </p>
      </div>
      {articles.map((article) => {
        const threatLevel = deriveThreatLevel(article);
        const sponsored = isSponsoredArticle(article);
        const prefix = getFeedPrefix(threatLevel, sponsored);
        const tone = getFeedTone(threatLevel, sponsored);
        const Icon = sponsored ? Zap : threatLevel === 'critical' ? AlertTriangle : Activity;

        return (
          <div key={article.articleKey} className={`rounded-[1.75rem] border bg-black/40 p-7 ${tone.card}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-4">
                  <Icon className={`mt-1 h-7 w-7 shrink-0 ${tone.icon}`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-mono text-[1.05rem] font-bold uppercase tracking-[0.05em] text-white underline-offset-4 hover:text-cyan-300 hover:underline"
                      >
                        {prefix}: {article.title}
                      </a>
                      {sponsored ? (
                        <Badge variant="outline" className="border-amber-500 bg-amber-500/20 text-amber-200">
                          SPONSORED
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className={tone.badge}>
                        {threatLevel}
                      </Badge>
                    </div>
                    <p className="mt-3 max-w-5xl text-[1.05rem] leading-relaxed text-gray-300">
                      {article.description ?? 'No summary available.'}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-6 font-mono text-sm tracking-[0.08em] text-gray-500">
                      <span>{formatUtcTimestamp(article.publishedAt)}</span>
                      <span>{article.sourceName ?? 'Unknown source'}</span>
                    </div>
                  </div>
                </div>
              </div>
              {sponsored ? (
                <Button className="shrink-0 rounded-xl bg-amber-500 px-7 font-mono text-base text-black hover:bg-amber-400">
                  Learn More
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function QuantumThreatTerminal() {
  const [emailInput, setEmailInput] = useState('');
  const [selectedAuditRow, setSelectedAuditRow] = useState<TechnicalLeaderboardRow | null>(null);
  const {
    companies,
    marketSnapshots,
    newsFeed,
    globalMetriqFrontier,
    globalMetrics,
    globalRiskSignals,
    loading,
    configError,
    companyError,
    marketError,
    newsError,
    globalMetriqFrontierError,
    globalMetricsError,
    globalRiskSignalsError,
  } = useTerminalData();

  const ticker = useMemo(
    () => [...marketSnapshots]
      .filter((snapshot) => snapshot.quoteStatus === 'ok')
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .slice(0, 12),
    [marketSnapshots],
  );

  const leaderboardRows = useMemo(() => {
    const snapshotsBySymbol = new Map(marketSnapshots.map((snapshot) => [snapshot.symbol, snapshot]));
    return companies.map((company) => ({
      ...company,
      snapshot: snapshotsBySymbol.get(company.symbol),
    }));
  }, [companies, marketSnapshots]);

  const hardwareRows = useMemo(
    () => leaderboardRows
      .map((row) => buildTechnicalRow(row, newsFeed))
      .filter((row) => SCIENTIFIC_METRICS[row.symbol])
      .sort((left, right) =>
        (right.lqLogical ?? -1) - (left.lqLogical ?? -1) ||
        (right.aqAlgorithmic ?? -1) - (left.aqAlgorithmic ?? -1) ||
        (right.gateFidelity ?? -1) - (left.gateFidelity ?? -1) ||
        (right.coherenceUs ?? -1) - (left.coherenceUs ?? -1) ||
        left.displayOrder - right.displayOrder),
    [leaderboardRows, newsFeed],
  );

  const riskAssessment = useMemo(
    () => buildRiskAssessment(globalRiskSignals),
    [globalRiskSignals],
  );
  const qDay = useMemo(
    () => buildQDayAssessment(globalMetrics),
    [globalMetrics],
  );
  const evidenceHealth = useMemo(
    () => buildEvidenceHealth(globalMetriqFrontier, qDay, riskAssessment),
    [globalMetriqFrontier, qDay, riskAssessment],
  );
  const newestQuote = ticker[0]?.quoteFetchedAt;
  const marketLiveLabel = newestQuote?.toDate && (Date.now() - newestQuote.toDate().getTime()) < 10 * 60 * 1000 ? 'LIVE' : 'STALE';
  const coreStatusLabel: IntelligenceStatus =
    globalMetriqFrontierError || globalMetricsError || globalRiskSignalsError ? 'DEGRADED' :
      !globalMetriqFrontier || !qDay || !riskAssessment ? 'PARTIAL' :
        (globalMetriqFrontier.isStale || qDay.isStale || riskAssessment.isStale) ? 'STALE' :
          'LIVE';
  const degradedErrors = [
    globalMetriqFrontierError,
    globalMetricsError,
    globalRiskSignalsError,
  ].filter((value): value is string => Boolean(value));
  const countdown = qDay ? formatCountdown(qDay.countdownYears, qDay.countdownDays) : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(17,94,89,0.28),_transparent_45%),linear-gradient(180deg,_#020617,_#000000_38%,_#020617)] text-white">
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 border-b border-cyan-950 bg-black/85 backdrop-blur-sm"
      >
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-cyan-300" />
              <div>
                <h1 className="font-mono text-xl font-bold text-cyan-300">XQBTS Terminal</h1>
                <p className="font-mono text-xs tracking-[0.2em] text-gray-500">[QUANTUM THREAT TERMINAL v0.2]</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="outline"
                className="border-cyan-900 bg-black text-cyan-300 hover:bg-cyan-950/40 hover:text-cyan-200"
              >
                <Link href="/whitepaper">Whitepaper</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-cyan-900 bg-black text-cyan-300 hover:bg-cyan-950/40 hover:text-cyan-200"
              >
                <Link href="/contact">Contact</Link>
              </Button>
              <Badge variant="outline" className={healthStatusClass(coreStatusLabel)}>
                CORE {coreStatusLabel}
              </Badge>
            </div>
          </div>

          <div className="mt-4 border-y border-cyan-950 py-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-mono text-xs tracking-[0.2em] text-gray-500">WATCHLIST / MARKET SNAPSHOT</p>
              <Badge variant="outline" className={healthStatusClass(marketLiveLabel)}>
                {marketLiveLabel}
              </Badge>
            </div>
            {marketError ? <TerminalWarning title="Market Feed Unavailable" message={marketError} /> : <MarketTicker tickers={ticker} />}
          </div>
        </div>
      </motion.header>

      <div className="mx-auto max-w-7xl px-6 py-8">
          {configError ? (
            <TerminalWarning title="Firebase Config Missing" message={configError} />
          ) : null}

          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="border-cyan-700 bg-cyan-700/10 text-cyan-300">
                INTELLIGENCE CORE
              </Badge>
              <p className="font-mono text-xs tracking-[0.18em] text-gray-500">
                CURATED FRONTIER EVIDENCE, Q-DAY READINESS, AND HNDL EXPOSURE
              </p>
            </div>
            <div className="mt-4">
              <EvidenceHealthStrip health={evidenceHealth} errors={degradedErrors} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.8fr_0.9fr]">
            <Card className="border-cyan-900 bg-black/40">
              <CardContent className="p-8">
                <p className="font-mono text-xs tracking-[0.24em] text-gray-500">ESTIMATED Q-DAY COUNTDOWN</p>
                {qDay && countdown ? (
                  <>
                    <ProvenanceLegend
                      className="mt-5"
                      items={[
                        { label: 'MODELLED ESTIMATE', kind: 'modeled' },
                        { label: 'NORMALIZED INPUT SCORES', kind: 'normalized' },
                      ]}
                    />
                    <div className="mt-6 flex flex-wrap items-end gap-6">
                      <div className="font-mono text-7xl font-bold text-cyan-300">{countdown.years}</div>
                      <div className="font-mono text-7xl font-bold text-cyan-300">{countdown.days}</div>
                    </div>
                    <p className="mt-6 font-mono text-sm text-gray-500">
                      Forecast model: years = ln(required LQ / current frontier eLQ) / ln(growth factor). Central growth factor: {qDay.annualGrowthFactorCentral.toFixed(1)}. Target runtime: RSA-2048 factorization in {qDay.targetRuntimeHours}h.
                    </p>
                    <p className="mt-3 font-mono text-sm text-gray-500">
                      Range: {qDay.earliestYearsToQDay.toFixed(1)}y-{qDay.latestYearsToQDay.toFixed(1)}y | Central year: {Math.round(qDay.qDayYearCentral)} | Growth assumptions: {qDay.annualGrowthFactorLow.toFixed(1)}x / {qDay.annualGrowthFactorCentral.toFixed(1)}x / {qDay.annualGrowthFactorHigh.toFixed(1)}x per year.
                    </p>
                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">COMPOSITE READINESS</p>
                          <Badge variant="outline" className={provenanceBadgeClass('normalized')}>SCORE</Badge>
                        </div>
                        <p className="mt-3 font-mono text-2xl text-white">{qDay.compositeReadinessPercent.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">UTILITY FRONTIER</p>
                          <Badge variant="outline" className={provenanceBadgeClass('normalized')}>SCORE</Badge>
                        </div>
                        <p className="mt-3 font-mono text-2xl text-white">{qDay.utilityFrontierPercent.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">FAULT-TOLERANCE BRIDGE</p>
                          <Badge variant="outline" className={provenanceBadgeClass('normalized')}>SCORE</Badge>
                        </div>
                        <p className="mt-3 font-mono text-2xl text-white">{qDay.faultToleranceBridgePercent.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="mt-8 border-t border-cyan-950 pt-8">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className={qDaySeverityClass(qDay.severity)}>
                          {qDay.severity}
                        </Badge>
                        {qDay.isStale ? (
                          <Badge variant="outline" className="border-amber-500 bg-amber-500/10 text-amber-300">
                            STALE
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-8 font-mono text-sm text-gray-400">
                        Last successful sync: {qDay.lastSuccessfulSyncLabel} | Methodology: {qDay.methodologyVersion}
                      </p>
                      <p className="mt-3 font-mono text-xs leading-relaxed text-gray-500">
                        Source frontier: {qDay.currentLeaderSourceLabel} | Basis: {qDay.leaderMetricBasis}
                      </p>
                      <p className="mt-3 font-mono text-xs leading-relaxed text-gray-500">
                        Display class: modeled countdown derived from direct benchmark inputs and normalized frontier scores. It is not a direct measured breach-date signal.
                      </p>
                      <p className="mt-3 max-w-4xl font-mono text-xs leading-relaxed text-gray-500">
                        {qDay.methodologyNote}
                      </p>
                      {globalMetricsError ? (
                        <p className="mt-3 text-sm text-red-300">Top metrics unavailable: {globalMetricsError}</p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="mt-6">
                    <TerminalWarning
                      title="Top Metrics Unavailable"
                      message={globalMetricsError ?? 'global/metrics has not been published yet.'}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-cyan-500/70 bg-cyan-950/35">
              <CardContent className="p-8">
                <p className="inline-block bg-cyan-400/20 px-2 py-1 font-mono text-xs font-bold tracking-[0.24em] text-cyan-300">
                  THE RSA-2048 DELTA
                </p>
                <ProvenanceLegend
                  className="mt-5"
                  items={[
                    { label: 'MODELLED ESTIMATE', kind: 'modeled' },
                    { label: 'DIRECT AQ FRONTIER INPUT', kind: 'direct' },
                  ]}
                />
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="font-mono text-xs tracking-[0.2em] text-gray-400">CURRENT FRONTIER (eLQ PROXY)</p>
                    <p className="mt-3 font-mono text-5xl font-bold text-cyan-300">{formatIntegerMetric(qDay?.currentLeaderLq ?? null)}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs tracking-[0.2em] text-gray-400">DELTA TO RSA BREACH</p>
                    <p className="mt-3 font-mono text-5xl font-bold text-cyan-300">{formatIntegerMetric(qDay?.deltaToRsaBreach ?? null)}</p>
                  </div>
                </div>
                <p className="mt-8 font-mono text-sm text-gray-400">
                  REQUIRED: {formatIntegerMetric(qDay?.requiredLogicalQubits ?? null)} LQ | STATUS: {(qDay?.statusPercent ?? 0).toFixed(2)}%
                </p>
                <p className="mt-3 font-mono text-xs leading-relaxed text-gray-500">
                  Modeled eLQ proxy based on curated Metriq AQ, quality, scale, and error-correction signals. This is not a direct published logical-qubit count.
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full border border-cyan-700 bg-black/70">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300"
                    style={{ width: `${Math.min(qDay?.statusPercent ?? 0, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
            <Card className="border-cyan-900 bg-black/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-300">
                  <Gauge className="h-5 w-5" />
                  THREAT MATRIX RADAR
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Global frontier capability profile derived from curated Metriq benchmark families.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {riskAssessment ? (
                  <>
                    <ProvenanceLegend
                      className="mb-5"
                      items={[
                        { label: 'DIRECT BENCHMARK AXIS', kind: 'direct' },
                        { label: 'MODELLED AXIS', kind: 'modeled' },
                        { label: 'NORMALIZED SCORE', kind: 'normalized' },
                      ]}
                    />
                    <RadarChart axes={riskAssessment.axes} />
                    <div className="grid gap-3 md:grid-cols-2">
                      {riskAssessment.axes.map((axis) => (
                        <div key={axis.label} className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-mono text-xs tracking-[0.18em] text-cyan-300">{axis.label}</p>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  axis.status === 'direct' ? 'border-cyan-600 text-cyan-300' :
                                    axis.status === 'modelled' ? 'border-amber-500 text-amber-300' :
                                      'border-slate-600 text-slate-400'
                                }
                              >
                                {axis.status === 'unavailable' ? 'N/A' : axis.status.toUpperCase()}
                              </Badge>
                              <p className="font-mono text-lg text-white">
                                {typeof axis.value === 'number' ? axis.value.toFixed(0) : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <p className="mt-3 text-xs leading-relaxed text-gray-500">{axis.detail}</p>
                          {axis.sourceTasks.length ? (
                            <p className="mt-2 font-mono text-[11px] tracking-[0.08em] text-slate-500">
                              SOURCE TASKS: {axis.sourceTasks.join(', ')}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <p className="mt-5 font-mono text-xs leading-relaxed text-gray-500">
                      Methodology: {riskAssessment.methodologyVersion}. {riskAssessment.methodologyNote}
                    </p>
                    <p className="mt-3 font-mono text-xs leading-relaxed text-gray-500">
                      Axis values are normalized frontier scores, not raw lab units. Status badges indicate whether each axis is based on direct benchmark coverage, partially modelled coverage, or unavailable evidence.
                    </p>
                  </>
                ) : (
                  <TerminalWarning
                    title="Risk Signals Unavailable"
                    message={globalRiskSignalsError ?? 'global/risk_signals has not been published yet.'}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-700 bg-amber-950/20">
              <CardHeader>
                <CardTitle className="font-mono text-xl text-amber-300">
                  HNDL STATUS (HARVEST NOW, DECRYPT LATER)
                </CardTitle>
                <CardDescription className="text-amber-100/70">
                  Global exposure-pressure model derived from curated frontier signals, not organization telemetry.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {riskAssessment ? (
                  <>
                    <ProvenanceLegend
                      items={[
                        { label: 'MODELLED INDEX', kind: 'modeled' },
                        { label: 'NORMALIZED AXES', kind: 'normalized' },
                      ]}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="font-mono text-xs tracking-[0.2em] text-amber-200/70">HARVESTABLE SHARE</p>
                        <p className="mt-3 font-mono text-5xl font-bold text-amber-300">
                          {(riskAssessment.harvestableShare * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-xs tracking-[0.2em] text-amber-200/70">CRYPTANALYTIC READINESS CORE</p>
                        <p className="mt-3 font-mono text-5xl font-bold text-amber-300">
                          {riskAssessment.cryptanalyticReadinessCore.toFixed(1)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-xs tracking-[0.2em] text-amber-200/70">HNDL PRESSURE INDEX</p>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={threatClass(riskAssessment.hndlStatus)}>
                            {riskAssessment.hndlStatus}
                          </Badge>
                          {riskAssessment.isStale ? (
                            <Badge variant="outline" className="border-amber-500 bg-amber-500/10 text-amber-300">
                              STALE
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 flex items-end gap-4">
                        <p className="font-mono text-4xl font-bold text-amber-300">{riskAssessment.hndlPressure.toFixed(1)}</p>
                        <p className="pb-1 font-mono text-sm text-amber-100/70">/ 100</p>
                      </div>
                      <div className="mt-4 h-3 overflow-hidden rounded-full border border-amber-700 bg-black/70">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                          style={{ width: `${riskAssessment.hndlPressure}%` }}
                        />
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-amber-100/80">
                        HNDL is a modelled exposure-pressure index: vulnerable encrypted share x quantum cryptanalytic readiness. It is not direct byte-volume telemetry.
                      </p>
                      <p className="mt-2 font-mono text-xs leading-relaxed text-amber-100/70">
                        Harvestable share is a methodology input. Cryptanalytic readiness is derived from normalized benchmark axes published by the backend.
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-xs tracking-[0.2em] text-amber-200/70">EXPOSURE PRESSURE VISUALIZATION</p>
                    </div>
                    <div className="grid grid-cols-6 gap-2 md:grid-cols-12">
                      {Array.from({ length: 12 }).map((_, index) => {
                        const active = index < Math.round((riskAssessment.hndlPressure / 100) * 12);
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0.45, y: 4 }}
                            animate={active ? { opacity: [0.55, 1, 0.55], y: [0, -1, 0] } : { opacity: [0.18, 0.38, 0.18] }}
                            transition={{
                              duration: active ? 1.9 : 3.2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: index * 0.08,
                            }}
                            className={`flex h-16 items-center justify-center rounded-lg border text-center font-mono text-2xl ${active ? 'border-amber-600 bg-amber-700/20 text-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.14)]' : 'border-amber-900/60 bg-black/40 text-amber-200/40'}`}
                          >
                            <motion.span
                              animate={active ? { scale: [0.92, 1.08, 0.92] } : { scale: [0.94, 1, 0.94] }}
                              transition={{
                                duration: active ? 1.5 : 2.8,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: index * 0.08,
                              }}
                            >
                              ◌
                            </motion.span>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-amber-800 bg-black/55 p-5">
                      <p className="font-mono text-lg leading-relaxed text-amber-200">
                        Last successful sync: {riskAssessment.lastSuccessfulSyncLabel}. Methodology: {riskAssessment.methodologyVersion}.
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-amber-100/80">
                        {riskAssessment.methodologyNote}
                      </p>
                    </div>
                  </>
                ) : (
                  <TerminalWarning
                    title="Risk Signals Unavailable"
                    message={globalRiskSignalsError ?? 'global/risk_signals has not been published yet.'}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6">
            <Card className="border-cyan-900 bg-black/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-300">
                  <Database className="h-5 w-5" />
                  FRONTIER EVIDENCE
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Admitted production-safe benchmark signals currently feeding the core frontier, Q-Day, and HNDL outputs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FrontierEvidencePanel frontier={globalMetriqFrontier} error={globalMetriqFrontierError} />
              </CardContent>
            </Card>

            <Card className="border-amber-800/70 bg-black/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                  DIAGNOSTIC AND REJECTED SIGNALS
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Observed diagnostic tasks and inadmissible records excluded by the current curation policy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RejectedSignalsPanel frontier={globalMetriqFrontier} error={globalMetriqFrontierError} />
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="border-amber-700 bg-amber-700/10 text-amber-300">
                WATCHLIST
              </Badge>
              <p className="font-mono text-xs tracking-[0.18em] text-gray-500">
                SECONDARY MARKET, COMPANY, AND NEWS HEURISTICS FOR OPERATOR CONTEXT
              </p>
            </div>

            <Card className="border-cyan-900 bg-black/40">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="flex items-center gap-2 text-cyan-300">
                    <TrendingUp className="h-5 w-5" />
                    WATCHLIST / COMPANY MONITOR
                  </CardTitle>
                  <Badge variant="outline" className="border-amber-700 bg-amber-700/10 text-amber-300">
                    OPERATOR HEURISTIC
                  </Badge>
                </div>
                <CardDescription className="text-gray-500">
                  Publicly disclosed hardware metrics plus market and feed-derived watchlist scoring. The company threat badge is not part of the core global frontier model.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {companyError ? <TerminalWarning title="Company Feed Unavailable" message={companyError} /> : null}
                {loading && companies.length === 0 ? <p className="font-mono text-sm text-gray-500">LOADING TECHNICAL LEADERBOARD...</p> : null}
                <HardwareLeaderboard rows={hardwareRows} onInspect={setSelectedAuditRow} />
              </CardContent>
            </Card>

            <Card className="border-cyan-900 bg-black/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-300">
                  <Activity className="h-5 w-5" />
                  WATCHLIST NEWS FLOW
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Operator-facing feed severity and company mentions. This layer is secondary to the core frontier evidence model.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {newsError ? <TerminalWarning title="News Feed Unavailable" message={newsError} /> : <NewsFeed articles={newsFeed.slice(0, 10)} />}
              </CardContent>
            </Card>

            <Card className="border-emerald-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_38%),linear-gradient(180deg,_rgba(6,78,59,0.18),_rgba(0,0,0,0.35))]">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="flex items-center gap-2 text-emerald-300">
                    <HandCoins className="h-5 w-5" />
                    Fund XQBTS
                  </CardTitle>
                  <Badge variant="outline" className="border-emerald-700 bg-emerald-700/10 text-emerald-300">
                    OWNER: 3DDev SMC PVT
                  </Badge>
                </div>
                <CardDescription className="max-w-3xl text-gray-300/80">
                  Back the product while it is still early: a live quantum-threat terminal with a public
                  methodology, frontier evidence model, and a clear path to premium intelligence workflows.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="max-w-3xl text-sm leading-7 text-gray-200">
                    Funding helps expand source coverage, ship enterprise-grade reporting and alerting,
                    and accelerate the commercial buildout of XQBTS Terminal. If you want to back the
                    roadmap, discuss strategic sponsorship, or open a pilot conversation, use the contact
                    path below.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button asChild className="bg-emerald-500 font-mono text-black hover:bg-emerald-400">
                      <Link href="/contact">Open Contact Page</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="border-emerald-700 bg-black/60 text-emerald-300 hover:bg-emerald-950/40 hover:text-emerald-200"
                    >
                      <a href="mailto:info.3ddev@gmail.com?subject=XQBTS%20Funding%20Inquiry">
                        <Mail className="h-4 w-4" />
                        info.3ddev@gmail.com
                      </a>
                    </Button>
                  </div>
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-emerald-900/70 bg-black/35 p-4">
                      <p className="font-mono text-[11px] tracking-[0.18em] text-emerald-300">OWNER</p>
                      <p className="mt-3 flex items-center gap-2 text-sm leading-6 text-gray-200">
                        <Building2 className="h-4 w-4 text-emerald-300" />
                        3DDev SMC PVT
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-900/70 bg-black/35 p-4">
                      <p className="font-mono text-[11px] tracking-[0.18em] text-emerald-300">FOCUS</p>
                      <p className="mt-3 text-sm leading-6 text-gray-200">Funding, strategic backing, and pilots</p>
                    </div>
                    <div className="rounded-xl border border-emerald-900/70 bg-black/35 p-4">
                      <p className="font-mono text-[11px] tracking-[0.18em] text-emerald-300">WHY NOW</p>
                      <p className="mt-3 text-sm leading-6 text-gray-200">Live product, differentiated methodology, early category position</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-900/80 bg-black/45 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-emerald-300">WHY BACK THIS BUILD</p>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-200">
                    <li>Operationalizes benchmark curation into a real product instead of a static report.</li>
                    <li>Combines quantum frontier tracking, Q-Day estimation, and HNDL monitoring in one surface.</li>
                    <li>Creates room for premium enterprise workflows on top of a working public intelligence layer.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-cyan-900 bg-black/40">
              <CardHeader>
                <CardTitle className="text-cyan-300">Signal Signup</CardTitle>
                <CardDescription className="text-gray-500">
                  Placeholder capture retained from the current terminal shell.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setEmailInput('');
                  }}
                  className="flex flex-col gap-3 md:flex-row"
                >
                  <Input
                    type="email"
                    placeholder="analyst@company.com"
                    value={emailInput}
                    onChange={(event) => setEmailInput(event.target.value)}
                    className="border-cyan-900 bg-black/70 text-white"
                  />
                  <Button className="bg-cyan-600 font-mono text-black hover:bg-cyan-500">Subscribe</Button>
                </form>
              </CardContent>
            </Card>
          </div>
      </div>

      <AuditModal row={selectedAuditRow} onClose={() => setSelectedAuditRow(null)} />
    </div>
  );
}
