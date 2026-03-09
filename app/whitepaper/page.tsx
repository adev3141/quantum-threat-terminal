import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  Database,
  FileText,
  History,
  LineChart,
  Newspaper,
  Shield,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WhitepaperGuard } from '@/components/whitepaper-guard'

export const metadata: Metadata = {
  title: 'Whitepaper | XQBTS Terminal',
  description:
    'Implementation-grounded whitepaper for the XQBTS operational quantum-threat intelligence platform.',
}

const tableOfContents = [
  { id: 'abstract', label: 'Abstract' },
  { id: 'architecture', label: 'System Architecture' },
  { id: 'cadence', label: 'Ingestion Cadence' },
  { id: 'curation', label: 'Metriq Curation Policy' },
  { id: 'normalization', label: 'Normalization Framework' },
  { id: 'qday', label: 'Q-Day Readiness Model' },
  { id: 'hndl', label: 'HNDL Pressure Model' },
  { id: 'watchlist', label: 'Watchlist Layer' },
  { id: 'publication', label: 'Publication and Access' },
  { id: 'limitations', label: 'Limitations and Non-Claims' },
]

const syncCadence = [
  {
    job: 'syncMetriqMetrics',
    cadence: 'Every 24 hours',
    purpose: 'Fetch curated Metriq task results, build the frontier document, and publish global metrics and global risk signals.',
    writes: '`global/metriq_frontier`, `global/metrics`, `global/risk_signals`, and matching history collections',
  },
  {
    job: 'syncFinnhubQuotes',
    cadence: 'Every 5 minutes',
    purpose: 'Refresh watchlist quote data for active companies.',
    writes: '`market_snapshots` and `companies.isSupportedByFinnhub`',
  },
  {
    job: 'syncFinnhubProfiles',
    cadence: 'Every 24 hours',
    purpose: 'Refresh profile metadata for supported watchlist companies.',
    writes: '`market_snapshots` and `companies.isSupportedByFinnhub`',
  },
  {
    job: 'syncGnewsFeed',
    cadence: 'Every 6 hours',
    purpose: 'Fetch batched company news and score article-to-company relevance.',
    writes: '`news_feed`',
  },
  {
    job: 'cleanupOldNewsFeed',
    cadence: 'Every 24 hours',
    purpose: 'Delete news records older than 30 days.',
    writes: '`news_feed` deletions and internal ingestion run stats',
  },
]

const publicDataContracts = [
  {
    collection: '`global/metrics`',
    access: 'Public read-only',
    role: 'Published Q-Day readiness output, frontier-derived readiness percentages, and selected AQ provenance.',
  },
  {
    collection: '`global/metrics_methodology`',
    access: 'Public read-only',
    role: 'Current Q-Day methodology assumptions and curation rules.',
  },
  {
    collection: '`global/metriq_frontier`',
    access: 'Public read-only',
    role: 'Selected production signals, diagnostic signals, exclusions, sync status, and Metriq provenance.',
  },
  {
    collection: '`global/risk_methodology`',
    access: 'Public read-only',
    role: 'Current HNDL model weights and exposure assumptions.',
  },
  {
    collection: '`global/risk_signals`',
    access: 'Public read-only',
    role: 'Published threat-matrix axes, HNDL pressure, and HNDL status.',
  },
  {
    collection: '`companies`, `market_snapshots`, `news_feed`',
    access: 'Public read-only',
    role: 'Watchlist registry, market data, and matched news feed consumed by the terminal.',
  },
  {
    collection:
      '`global_metrics_history`, `global_metrics_methodology_history`, `global_metriq_frontier_history`, `global_risk_methodology_history`, `global_risk_signals_history`',
    access: 'Public read-only',
    role: 'Historical snapshots for published data and methodology changes.',
  },
  {
    collection: '`risk_reference`, `crypto_reference`, `crypto_reference_history`, `ingestion_runs`',
    access: 'Not public',
    role: 'Legacy or internal-only admin and operational records.',
  },
]

const productionSignals = [
  ['`aq`', '128', 'Algorithmic Qubits', '`max`', '`log-upper`', 'Reference 256', 'Required anchor for `global/metrics`; also feeds utility frontier in `global/risk_signals`.'],
  ['`physicalQubits`', '159', 'Number of physical qubits', '`max`', '`log-upper`', 'Reference 100000', 'Feeds hardware-scale axis.'],
  ['`twoQubitFidelity`', '53', '2-qubit Clifford gate fidelity', '`max`', '`linear`', 'Lower 98, upper 99.99', 'Feeds gate-quality axis.'],
  ['`logicalErrorRate`', '60', 'Error correction and mitigation', '`min`', '`inverse-log`', 'Worst 1e-1, best 1e-6', 'Feeds the fault-tolerance bridge and fault-tolerance axis.'],
  ['`surfaceCode`', '189', 'Surface code', '`max`', '`linear`', 'Lower 3, upper 31', 'Feeds the fault-tolerance bridge and fault-tolerance axis.'],
  ['`readoutFidelity`', '198', 'Single-qubit measurement fidelity', '`max`', '`linear`', 'Lower 90, upper 99.99', 'Feeds gate-quality axis.'],
  ['`coherenceT2`', '50', 'Coherence time (T2)', '`max`', '`log-upper`', 'Reference 1000 microseconds', 'Feeds gate-quality axis.'],
  ['`quantumVolume`', '34', 'Quantum volume', '`max`', '`log-upper`', 'Reference 1048576', 'Feeds utility frontier in both core models.'],
  ['`faultTolerantQecLogicalErrorRate`', '141', 'Fault-tolerant quantum error correction (QEC)', '`min`', '`inverse-log`', 'Worst 1e-1, best 1e-6', 'Feeds the fault-tolerance bridge and fault-tolerance axis.'],
  ['`singleQubitGateSpeed`', '223', 'Single-qubit gate speed', '`min`', '`inverse-log`', 'Worst 1e-3, best 1e-6', 'Feeds runtime-practicality axis.'],
  ['`twoQubitGateSpeed`', '224', '2-qubit gate speed', '`min`', '`inverse-log`', 'Worst 1e-2, best 1e-6', 'Feeds runtime-practicality axis.'],
]

const diagnosticSignals = [
  ['`qecDecoding`', '192', 'QEC decoding', '`min`', '`none`', 'Accepted metrics: `Latency (s)`, `Time per round (s)`'],
  ['`shorOrderFinding`', '175', "Shor's order-finding", '`max`', '`none`', 'Accepted metric: `Fidelity`'],
  ['`integerFactoring`', '4', 'Integer factoring', '`max`', '`none`', 'Accepted metric: `Factorized integer`'],
]

const riskAxisRows = [
  ['Utility Frontier', '`aq` x 0.7, `quantumVolume` x 0.3', '2 signals', 'Status is `direct` only when both utility signals are present.'],
  ['Hardware Scale', '`physicalQubits` x 1.0', '1 signal', 'Single-signal axis can still be `direct`.'],
  ['Gate Quality', '`twoQubitFidelity` x 0.5, `readoutFidelity` x 0.2, `coherenceT2` x 0.3', '2 signals', 'If only one signal is available, the axis is `modelled`.'],
  ['Runtime Practicality', '`singleQubitGateSpeed` x 0.35, `twoQubitGateSpeed` x 0.65', '2 signals', 'If only one speed metric is available, the axis is `modelled`.'],
  ['Fault Tolerance', '`logicalErrorRate` x 0.35, `surfaceCode` x 0.3, `faultTolerantQecLogicalErrorRate` x 0.35', '2 signals', 'If fewer than two usable signals exist, the axis is `modelled` or `unavailable`.'],
  ['Cryptanalytic Relevance', 'No production input', '0 signals', 'Hard-coded to `unavailable` with the note that no direct production-safe cryptanalytic benchmark is currently admitted.'],
]

const rejectionMarkers = [
  'theoretical',
  'simulated',
  'simulation',
  'idealized',
  'modeled',
  'model',
  'projected',
  'hypothetical',
  'estimated',
]

function PaperSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <Card className="border-cyan-900 bg-black/45 shadow-[0_0_0_1px_rgba(8,145,178,0.08),0_24px_80px_rgba(6,182,212,0.08)]">
        <CardHeader className="border-b border-cyan-950/80">
          <p className="font-mono text-[11px] tracking-[0.24em] text-cyan-300">{eyebrow}</p>
          <CardTitle className="text-2xl text-white">{title}</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7 text-gray-400">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">{children}</CardContent>
      </Card>
    </section>
  )
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-cyan-950/40 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-200">
      {children}
    </code>
  )
}

function FormulaBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-cyan-950 bg-[#020617] p-4 font-mono text-sm leading-7 text-cyan-100">
      {children}
    </pre>
  )
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: ReactNode[][]
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-cyan-950/80 bg-black/60">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-cyan-950/20">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="border-b border-cyan-950 px-4 py-3 font-mono text-[11px] tracking-[0.18em] text-cyan-300 uppercase"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${columns.length}`} className="align-top">
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="border-t border-cyan-950/70 px-4 py-4 text-gray-200">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AsideCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card className="border-cyan-950 bg-black/60">
      <CardHeader>
        <CardTitle className="text-base text-white">{title}</CardTitle>
        <CardDescription className="text-sm leading-6 text-gray-400">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function WhitepaperPage() {
  return (
    <WhitepaperGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(17,94,89,0.28),_transparent_40%),linear-gradient(180deg,_#020617,_#000000_32%,_#020617)] text-white">
        <header className="sticky top-0 z-40 border-b border-cyan-950 bg-black/85 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-cyan-300" />
              <div>
                <h1 className="font-mono text-xl font-bold text-cyan-300">XQBTS Whitepaper</h1>
                <p className="font-mono text-xs tracking-[0.2em] text-gray-500">
                  [IMPLEMENTATION-GROUNDED OPERATIONAL FRAMEWORK]
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="outline"
                className="border-cyan-900 bg-black text-cyan-300 hover:bg-cyan-950/40 hover:text-cyan-200"
              >
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Terminal
                </Link>
              </Button>
              <Badge variant="outline" className="border-emerald-700 bg-emerald-700/10 text-emerald-300">
                March 9, 2026
              </Badge>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              <Card className="border-cyan-900 bg-black/45 shadow-[0_0_0_1px_rgba(8,145,178,0.08),0_24px_80px_rgba(6,182,212,0.08)]">
                <CardHeader className="border-b border-cyan-950/80">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-cyan-700 bg-cyan-700/10 text-cyan-300">
                      Operational Quantum-Threat Intelligence Framework
                    </Badge>
                    <Badge variant="outline" className="border-cyan-950 text-gray-300">
                      Current terminal implementation
                    </Badge>
                    <Badge variant="outline" className="border-cyan-950 text-gray-300">
                      Public read-only output model
                    </Badge>
                  </div>
                  <CardTitle className="max-w-4xl text-4xl leading-tight text-white">
                    XQBTS Terminal: a Firestore-backed operational framework for curated frontier tracking,
                    Q-Day readiness estimation, and HNDL pressure monitoring
                  </CardTitle>
                  <CardDescription className="max-w-4xl text-base leading-7 text-gray-400">
                    This document describes the behavior currently implemented in the XQBTS platform. All
                    formulas, thresholds, schedules, collection names, and control surfaces below are drawn
                    from the application code, Firestore rules, and terminal data contracts currently used by
                    the product.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                      <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">CORE SOURCES</p>
                      <p className="mt-3 text-sm leading-6 text-gray-300">
                        Metriq for frontier benchmark data, Finnhub for market snapshots and profiles, and
                        GNews for the watchlist feed.
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                      <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">CORE PUBLIC OUTPUTS</p>
                      <p className="mt-3 text-sm leading-6 text-gray-300">
                        <InlineCode>global/metriq_frontier</InlineCode>, <InlineCode>global/metrics</InlineCode>,
                        and <InlineCode>global/risk_signals</InlineCode>.
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                      <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">DESIGN POSITION</p>
                      <p className="mt-3 text-sm leading-6 text-gray-300">
                        An operational intelligence framework with explicit methodology and evidence
                        controls, not a claim of exact cryptanalytic prediction.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

            <PaperSection
              id="abstract"
              eyebrow="01 / ABSTRACT"
              title="Abstract"
              description="The platform combines a curated benchmark frontier, a versioned methodology layer, public read-only publication paths, and a separate watchlist layer for market and news monitoring."
            >
              <p className="text-base leading-8 text-gray-300">
                XQBTS Terminal is implemented as a Next.js application backed by Firebase Firestore and
                Cloud Functions. Its core model ingests a configured set of Metriq tasks, filters those
                results through an explicit curation policy, normalizes admitted production signals onto a
                0-100 scale, and publishes two derived global outputs: a Q-Day readiness document and a
                global HNDL pressure document.
              </p>
              <p className="text-base leading-8 text-gray-300">
                The system also operates a watchlist layer. That layer maintains a registry of tracked
                quantum-relevant companies, refreshes market snapshots from Finnhub, matches company news
                from GNews, and exposes those public feeds to the terminal UI. The watchlist layer is not
                used by the core Q-Day or HNDL computations. The core model functions are built from
                curated frontier signals and methodology documents only.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-950 bg-emerald-950/10 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-emerald-300">WHAT THE PLATFORM DOES</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-300">
                    <li>Publishes a curated frontier document with admitted, diagnostic, and excluded signals.</li>
                    <li>Publishes a Q-Day readiness model driven by AQ and curated fault-tolerance bridge metrics.</li>
                    <li>Publishes an HNDL pressure model driven by weighted frontier axes and exposure assumptions.</li>
                    <li>Maintains public read-only history collections for outputs and methodologies.</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-amber-950 bg-amber-950/10 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-amber-300">WHAT THE PLATFORM DOES NOT CLAIM</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-300">
                    <li>It does not publish a direct production-safe cryptanalytic benchmark in the core risk model.</li>
                    <li>It does not ingest enterprise traffic telemetry or direct PQ deployment telemetry.</li>
                    <li>It does not use watchlist news or market moves as inputs to the core frontier model.</li>
                    <li>It does not present company-level heuristic scores as part of the core methodology.</li>
                  </ul>
                </div>
              </div>
            </PaperSection>

            <PaperSection
              id="architecture"
              eyebrow="02 / SYSTEM ARCHITECTURE"
              title="System Architecture"
              description="The implementation is organized as a registry and ingestion plane, a methodology plane, a publication plane, and a presentation plane."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-cyan-300" />
                    <p className="font-mono text-sm tracking-[0.18em] text-cyan-300">REGISTRY AND SOURCE PLANE</p>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    The company registry is seeded from an XML file. Source integrations use Metriq for
                    benchmark tasks, Finnhub for market quotes and company profiles, and GNews for batched
                    article search. Source access is controlled by Firebase secrets.
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-cyan-300" />
                    <p className="font-mono text-sm tracking-[0.18em] text-cyan-300">METHODOLOGY PLANE</p>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    Two public read-only methodology documents define the model behavior:
                    <InlineCode>global/metrics_methodology</InlineCode> and{' '}
                    <InlineCode>global/risk_methodology</InlineCode>. Admin update endpoints validate input,
                    persist the next methodology, and append methodology history records with{' '}
                    <InlineCode>changedBy</InlineCode> and <InlineCode>reason</InlineCode>.
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <div className="flex items-center gap-3">
                    <History className="h-5 w-5 text-cyan-300" />
                    <p className="font-mono text-sm tracking-[0.18em] text-cyan-300">PUBLICATION PLANE</p>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    After each Metriq sync, the platform publishes the current frontier document and, if
                    derivation succeeds, publishes the current Q-Day and HNDL documents. Each publication
                    also writes a history document containing previous and next values.
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <div className="flex items-center gap-3">
                    <LineChart className="h-5 w-5 text-cyan-300" />
                    <p className="font-mono text-sm tracking-[0.18em] text-cyan-300">PRESENTATION PLANE</p>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    The terminal subscribes to active companies, market snapshots, the latest news feed,
                    and the three global core documents. The home page renders the intelligence core and
                    the watchlist as separate surfaces.
                  </p>
                </div>
              </div>
              <FormulaBlock>
                {'1. ingest source data\n2. filter source records through methodology rules\n3. select one best result per configured task\n4. normalize admitted production signals\n5. derive global metrics and global risk signals\n6. publish current docs and append history\n7. render public documents in the terminal'}
              </FormulaBlock>
            </PaperSection>

            <PaperSection
              id="cadence"
              eyebrow="03 / INGESTION CADENCE"
              title="Operational Cadence and Control Surfaces"
              description="The platform mixes scheduled background jobs with admin-triggered manual endpoints."
            >
              <DataTable
                columns={['Job', 'Cadence', 'Purpose', 'Primary writes']}
                rows={syncCadence.map((row) => [
                  <span key={`${row.job}-job`} className="font-mono text-cyan-300">
                    {row.job}
                  </span>,
                  row.cadence,
                  row.purpose,
                  <span key={`${row.job}-writes`} className="font-mono text-xs leading-6 text-gray-300">
                    {row.writes}
                  </span>,
                ])}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">SOURCE ACCESS</p>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    External integrations are protected by Firebase secrets named{' '}
                    <InlineCode>FINNHUB_API_KEY</InlineCode>, <InlineCode>GNEWS_API_KEY</InlineCode>, and{' '}
                    <InlineCode>ADMIN_TRIGGER_KEY</InlineCode>.
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">MANUAL OPERATIONS</p>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    Manual sync and methodology update endpoints require HTTP{' '}
                    <InlineCode>POST</InlineCode> and validate the admin key from the request header,
                    query string, or body before proceeding.
                  </p>
                </div>
              </div>
            </PaperSection>

            <PaperSection
              id="curation"
              eyebrow="04 / METRIQ CURATION"
              title="Metriq Frontier Curation Policy"
              description="The core frontier is not a raw benchmark dump. It is a filtered, one-result-per-task selection layer governed by explicit methodology defaults."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">DEFAULT METRICS METHODOLOGY</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-300">
                    <li>
                      <InlineCode>rsa_2048_required_lq = 1400</InlineCode>
                    </li>
                    <li>
                      <InlineCode>annual_growth_factor_low = 1.5</InlineCode>,{' '}
                      <InlineCode>central = 1.8</InlineCode>,{' '}
                      <InlineCode>high = 2.0</InlineCode>
                    </li>
                    <li>
                      <InlineCode>q_day_target_runtime_hours = 24</InlineCode>
                    </li>
                    <li>
                      <InlineCode>include_only_curated_records = true</InlineCode>
                    </li>
                    <li>
                      <InlineCode>reject_theoretical_records = true</InlineCode>
                    </li>
                    <li>
                      <InlineCode>methodology_version = metriq-curated-v1</InlineCode>
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">DEFAULT PLATFORM ALLOWLIST</p>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    The default allowed platforms are <InlineCode>ibm</InlineCode>,{' '}
                    <InlineCode>google</InlineCode>, <InlineCode>quantinuum</InlineCode>,{' '}
                    <InlineCode>microsoft</InlineCode>, <InlineCode>ionq</InlineCode>,{' '}
                    <InlineCode>rigetti</InlineCode>, <InlineCode>intel</InlineCode>,{' '}
                    <InlineCode>fujitsu</InlineCode>, <InlineCode>d-wave</InlineCode>, and{' '}
                    <InlineCode>dwave</InlineCode>.
                  </p>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    Allowed task names default to the configured Metriq task labels. If a task is not in
                    the allowlist, the selection function returns no candidate for that task.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">SELECTION RULES</p>
                <ul className="mt-4 space-y-2 text-sm leading-7 text-gray-300">
                  <li>Metric values must parse as finite numbers.</li>
                  <li>Metric names must match the accepted metric names or configured aliases for the task.</li>
                  <li>Results must resolve to a source label.</li>
                  <li>Tasks that require platform attribution reject unattributed records.</li>
                  <li>Curated mode enforces the platform allowlist against extracted platform metadata.</li>
                  <li>
                    Theoretical markers are rejected when the methodology enables theoretical rejection:{' '}
                    {rejectionMarkers.map((marker, index) => (
                      <span key={marker}>
                        <InlineCode>{marker}</InlineCode>
                        {index < rejectionMarkers.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                    .
                  </li>
                  <li>For `max` tasks the highest metric wins, with recency as a tie-breaker.</li>
                  <li>For `min` tasks the lowest metric wins, with recency as a tie-breaker.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">PRODUCTION SIGNAL SET</p>
                  <p className="mt-2 text-sm leading-7 text-gray-400">
                    These signals are eligible to feed the published core model. Each selected signal is
                    stored with task metadata, normalized score, raw snapshot, source label, attribution
                    status, and evaluated timestamp.
                  </p>
                </div>
                <DataTable
                  columns={['Key', 'Task', 'Label', 'Select', 'Normalize', 'Parameters', 'Role']}
                  rows={productionSignals.map((row) => row.map((cell) => <span key={`${row[0]}-${String(cell)}`}>{cell}</span>))}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">DIAGNOSTIC SIGNAL SET</p>
                  <p className="mt-2 text-sm leading-7 text-gray-400">
                    Diagnostic signals are fetched and stored for visibility, but they are not admitted to
                    the published production-safe global metrics or global risk formulas.
                  </p>
                </div>
                <DataTable
                  columns={['Key', 'Task', 'Label', 'Select', 'Normalize', 'Accepted metrics']}
                  rows={diagnosticSignals.map((row) => row.map((cell) => <span key={`${row[0]}-${String(cell)}`}>{cell}</span>))}
                />
              </div>
            </PaperSection>

            <PaperSection
              id="normalization"
              eyebrow="05 / NORMALIZATION"
              title="Normalization Framework"
              description="Admitted production signals are normalized to comparable 0-100 scores before they enter the global models."
            >
              <p className="text-base leading-8 text-gray-300">
                The platform uses four normalization modes for production signals and one passthrough mode
                for diagnostics. Every normalization result is clamped to the 0-100 range. Weighted
                averages ignore missing inputs and renormalize by the total weight of the remaining usable
                inputs.
              </p>
              <FormulaBlock>
                {'log-upper(value, reference)\n= clampPercent(log10(1 + value) / log10(1 + reference) * 100)\n\ninverse-log(value, worst, best)\n= clampPercent((log10(worst) - log10(value)) / (log10(worst) - log10(best)) * 100)\n\nlinear(value, lower, upper)\n= clampPercent((value - lower) / (upper - lower) * 100)\n\ninverse-linear(value, worst, best)\n= clampPercent((worst - value) / (worst - best) * 100)\n\nweightedAverage(values)\n= sum(score * weight) / sum(weight) over usable entries only'}
              </FormulaBlock>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">REFERENCE CONSTANTS</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-300">
                    <li>
                      <InlineCode>METRIQ_QV_REFERENCE = 1048576</InlineCode>
                    </li>
                    <li>
                      <InlineCode>METRIQ_PHYSICAL_QUBITS_REFERENCE = 100000</InlineCode>
                    </li>
                    <li>
                      <InlineCode>METRIQ_SURFACE_CODE_REFERENCE = 31</InlineCode>
                    </li>
                    <li>
                      <InlineCode>METRIQ_COHERENCE_REFERENCE_US = 1000</InlineCode>
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">STATUS OF MISSING DATA</p>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    Missing signals do not force a zero-weighted axis if other inputs remain. That design
                    means axis values can still be computed with partial coverage, while the axis status is
                    downgraded from <InlineCode>direct</InlineCode> to <InlineCode>modelled</InlineCode> when
                    the minimum direct evidence count is not satisfied.
                  </p>
                </div>
              </div>
            </PaperSection>

            <PaperSection
              id="qday"
              eyebrow="06 / Q-DAY MODEL"
              title="Q-Day Readiness Model"
              description="The Q-Day document is derived from AQ, utility normalization, and a curated fault-tolerance bridge. It is published to `global/metrics`."
            >
              <p className="text-base leading-8 text-gray-300">
                The Q-Day model requires the frontier AQ signal. If AQ is missing, the global metrics build
                fails. Utility frontier and fault-tolerance bridge are each computed from normalized scores,
                then combined with the raw AQ metric value to produce <InlineCode>current_sota_lq</InlineCode>.
                The code describes that field as an effective logical-qubit proxy derived from AQ frontier
                and curated fault-tolerance bridge metrics.
              </p>
              <FormulaBlock>
                {'utility_frontier_percent\n= weightedAverage([\n  aq.normalizedScore * 0.7,\n  quantumVolume.normalizedScore * 0.3,\n])\n\nfault_tolerance_bridge_percent\n= weightedAverage([\n  logicalErrorRate.normalizedScore * 0.35,\n  surfaceCode.normalizedScore * 0.30,\n  faultTolerantQecLogicalErrorRate.normalizedScore * 0.35,\n])\n\ncurrent_sota_lq\n= round(\n    aq.metricValue\n  * (0.5 + 1.5 * (fault_tolerance_bridge_percent / 100))\n  * (0.8 + 0.2 * (utility_frontier_percent / 100))\n)\n\nyears_to_qday(current_sota_lq, required_lq, growth_factor)\n= 0, if current_sota_lq >= required_lq\n= ln(required_lq / current_sota_lq) / ln(growth_factor), otherwise'}
              </FormulaBlock>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">DEFAULT ASSUMPTIONS</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-300">
                    <li>
                      Required threshold: <InlineCode>rsa_2048_required_lq = 1400</InlineCode>
                    </li>
                    <li>
                      Growth factors: <InlineCode>1.5</InlineCode>, <InlineCode>1.8</InlineCode>,{' '}
                      <InlineCode>2.0</InlineCode> per year
                    </li>
                    <li>
                      Target runtime: <InlineCode>24 hours</InlineCode>
                    </li>
                    <li>
                      Composite readiness: 50% utility frontier and 50% fault-tolerance bridge
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">PUBLISHED OUTPUT FIELDS</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-300">
                    <li>
                      <InlineCode>current_sota_lq</InlineCode>, <InlineCode>rsa_2048_delta</InlineCode>,{' '}
                      <InlineCode>rsa_2048_status_percent</InlineCode>
                    </li>
                    <li>
                      <InlineCode>years_to_qday_low</InlineCode>, <InlineCode>central</InlineCode>,{' '}
                      <InlineCode>high</InlineCode>
                    </li>
                    <li>
                      <InlineCode>q_day_year_low</InlineCode>, <InlineCode>central</InlineCode>,{' '}
                      <InlineCode>high</InlineCode>
                    </li>
                    <li>
                      <InlineCode>frontier_signals</InlineCode> and <InlineCode>selected_record</InlineCode>{' '}
                      provenance
                    </li>
                  </ul>
                </div>
              </div>
            </PaperSection>

            <PaperSection
              id="hndl"
              eyebrow="07 / HNDL MODEL"
              title="Global HNDL Pressure Model"
              description="The global risk document is a weighted frontier-axis model with explicit exposure assumptions and no direct admitted cryptanalytic benchmark."
            >
              <p className="text-base leading-8 text-gray-300">
                The HNDL model consumes the same admitted production frontier signals and a separate risk
                methodology document. It builds five usable frontier axes plus one explicitly unavailable
                axis for cryptanalytic relevance. The model then computes a frontier readiness core and
                scales it by the assumed share of encrypted traffic that is not yet post-quantum protected.
              </p>
              <DataTable
                columns={['Axis', 'Inputs and weights', 'Direct threshold', 'Behavior']}
                rows={riskAxisRows.map((row) => row.map((cell) => <span key={`${row[0]}-${String(cell)}`}>{cell}</span>))}
              />
              <FormulaBlock>
                {'harvestableShare\n= encryptedTrafficShare * (1 - pqProtectedShare)\n\ncryptanalyticReadinessCore\n= weightedAverage([\n  utilityFrontier.value * 0.1,\n  hardwareScale.value * 0.1,\n  gateQuality.value * 0.15,\n  runtimePracticality.value * 0.2,\n  faultTolerance.value * 0.45,\n])\n\nhndlPressure\n= clampPercent(harvestableShare * cryptanalyticReadinessCore)\n\nhndlStatus\n= CRITICAL if hndlPressure >= 60\n= HIGH if hndlPressure >= 35\n= MEDIUM if hndlPressure >= 15\n= LOW otherwise'}
              </FormulaBlock>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">DEFAULT RISK ASSUMPTIONS</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-300">
                    <li>
                      <InlineCode>encryptedTrafficShare = 0.95</InlineCode>
                    </li>
                    <li>
                      <InlineCode>pqProtectedShare = 0.13</InlineCode>
                    </li>
                    <li>
                      <InlineCode>methodologyVersion = global-risk-signals-v1</InlineCode>
                    </li>
                    <li>Fault tolerance receives the highest HNDL weight at 0.45.</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-amber-950 bg-amber-950/10 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-amber-300">EXPLICIT CORE LIMIT</p>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    The platform hard-codes the <InlineCode>cryptanalyticRelevance</InlineCode> axis to{' '}
                    <InlineCode>unavailable</InlineCode> with the statement that no direct production-safe
                    cryptanalytic benchmark is currently admitted. The published HNDL score is therefore a
                    frontier readiness and exposure-pressure proxy, not a direct cryptanalytic measurement.
                  </p>
                </div>
              </div>
            </PaperSection>

            <PaperSection
              id="watchlist"
              eyebrow="08 / WATCHLIST LAYER"
              title="Watchlist Registry, Market Snapshot, and News Feed"
              description="The watchlist layer is operationally useful, but it is separate from the core frontier methodology."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-5 w-5 text-cyan-300" />
                    <p className="font-mono text-sm tracking-[0.18em] text-cyan-300">FINNHUB MARKET SNAPSHOTS</p>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    Quotes are refreshed every 5 minutes and profiles every 24 hours. The platform stores
                    prices, daily move fields, profile metadata, support status, fetch timestamps, and last
                    known good profile or quote timestamps. Unsupported or forbidden symbols are marked as{' '}
                    <InlineCode>unsupported</InlineCode> rather than treated as valid live market data.
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <div className="flex items-center gap-3">
                    <Newspaper className="h-5 w-5 text-cyan-300" />
                    <p className="font-mono text-sm tracking-[0.18em] text-cyan-300">GNEWS MATCHING</p>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    News search runs in batches of 2 companies. The pipeline uses a primary query and, when
                    needed, a fallback query. Articles are normalized, matched against the current batch, and
                    then written into <InlineCode>news_feed</InlineCode> with matched symbols, query strategy,
                    match strength, and match score metadata.
                  </p>
                </div>
              </div>
              <FormulaBlock>
                {'article_score\n= +5 exact company name match\n+ +3 simplified company name match\n+ +4 ticker regex match\n+ +3 searchTerm match\n+ +1 for each token match\n\naccepted_article if article_score >= 3\nmatchStrength = "fallback" if queryStrategy == "fallback" or topMatchScore < 6'}
              </FormulaBlock>
              <div className="rounded-xl border border-amber-950 bg-amber-950/10 p-5">
                <p className="font-mono text-[11px] tracking-[0.18em] text-amber-300">SEPARATION FROM THE CORE MODEL</p>
                <p className="mt-4 text-sm leading-7 text-gray-300">
                  The functions that build <InlineCode>global/metrics</InlineCode> and{' '}
                  <InlineCode>global/risk_signals</InlineCode> consume curated frontier production signals
                  and methodology documents only. Finnhub and GNews are therefore watchlist inputs, not
                  scientific inputs to the core frontier, Q-Day, or HNDL calculations.
                </p>
              </div>
            </PaperSection>

            <PaperSection
              id="publication"
              eyebrow="09 / PUBLICATION AND ACCESS"
              title="Publication Paths, History, Staleness, and Access Controls"
              description="The platform publishes public read-only current-state docs and historical snapshots, while keeping ingestion run logs and legacy admin references private."
            >
              <DataTable
                columns={['Collection or group', 'Access', 'Role']}
                rows={publicDataContracts.map((row) => [
                  <span key={`${row.collection}-collection`} className="font-mono text-xs leading-6 text-cyan-200">
                    {row.collection}
                  </span>,
                  row.access,
                  row.role,
                ])}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">HISTORY MODEL</p>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    Every publication transaction writes the current document and an accompanying history
                    record containing previous and next states plus a publication reason. Methodology update
                    transactions also write history documents with <InlineCode>changedBy</InlineCode> and{' '}
                    <InlineCode>reason</InlineCode>.
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">STALENESS HANDLING</p>
                  <p className="mt-4 text-sm leading-7 text-gray-300">
                    On partial failures the platform does not delete published documents. Instead it marks
                    the affected global docs as stale, updates the last attempted sync timestamp, and keeps
                    the prior document available to clients. Metrics, frontier, and risk signals all use a
                    36-hour staleness window in the current implementation.
                  </p>
                </div>
              </div>
              <p className="text-base leading-8 text-gray-300">
                Firestore rules explicitly allow public reads on the current global documents, histories,
                companies, market snapshots, and news feed. All writes are denied from the client side. A
                catch-all deny rule blocks any document path not explicitly opened for public reads.
              </p>
            </PaperSection>

            <PaperSection
              id="limitations"
              eyebrow="10 / LIMITATIONS"
              title="Limitations and Non-Claims"
              description="The current implementation is explicit about what it measures, what it proxies, and what it does not yet admit."
            >
              <div className="rounded-xl border border-amber-950 bg-amber-950/10 p-5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-300" />
                  <p className="font-mono text-sm tracking-[0.18em] text-amber-300">BOUNDARY CONDITIONS</p>
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-300">
                  <li>
                    <InlineCode>current_sota_lq</InlineCode> is a frontier proxy derived from AQ plus
                    normalized utility and fault-tolerance adjustments. It is not a direct universal logical
                    qubit census across all platforms.
                  </li>
                  <li>
                    The HNDL model has no admitted direct cryptanalytic benchmark. Its cryptanalytic
                    relevance axis is intentionally unavailable in the current code.
                  </li>
                  <li>
                    Uncertainty treatment is limited to three growth factors in the Q-Day model and explicit
                    share assumptions in the HNDL model. No broader uncertainty interval or backtesting
                    layer is implemented in the current code.
                  </li>
                  <li>
                    The platform does not apply modality-specific correction factors beyond task selection,
                    normalization, and curation. Cross-modality comparability is therefore constrained by
                    the current task design.
                  </li>
                  <li>
                    The watchlist layer is operational and public, but it is not part of the core global
                    frontier methodology and should not be read as a scientific proof layer.
                  </li>
                  <li>
                    Legacy admin collections exist, but the public terminal contract is centered on the
                    current global documents and watchlist collections that are exposed in Firestore rules.
                  </li>
                </ul>
              </div>
              <p className="text-base leading-8 text-gray-300">
                Within those boundaries, the platform is technically coherent as an operational framework:
                it exposes its inputs, encodes a curation policy, versions its methodology, records
                exclusions, publishes history, marks stale states, and cleanly separates the core frontier
                model from its watchlist surfaces.
              </p>
            </PaperSection>
          </div>

            <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
              <AsideCard
                title="Document Basis"
                description="Quick implementation facts for this paper."
              >
                <div className="space-y-4 text-sm leading-6 text-gray-300">
                  <div>
                    <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">FRAMEWORK TYPE</p>
                    <p className="mt-1">Operational intelligence platform with public read-only outputs.</p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">CORE VERSIONS</p>
                    <p className="mt-1">
                      <InlineCode>metriq-curated-v1</InlineCode> and{' '}
                      <InlineCode>global-risk-signals-v1</InlineCode>
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">UI DATA SUBSCRIPTIONS</p>
                    <p className="mt-1">
                      Active companies, market snapshots, latest 30 news items, and the three core global
                      docs.
                    </p>
                  </div>
                </div>
              </AsideCard>

              <AsideCard
                title="Section Index"
                description="Anchor links for the whitepaper sections."
              >
                <nav className="space-y-2">
                  {tableOfContents.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`#${entry.id}`}
                      className="block rounded-lg border border-transparent px-3 py-2 font-mono text-sm text-gray-300 transition hover:border-cyan-950 hover:bg-cyan-950/20 hover:text-cyan-200"
                    >
                      {entry.label}
                    </Link>
                  ))}
                </nav>
              </AsideCard>

              <AsideCard
                title="Core Outputs"
                description="Current public publication targets."
              >
                <div className="space-y-2">
                  {['global/metriq_frontier', 'global/metrics', 'global/risk_signals'].map((path) => (
                    <div
                      key={path}
                      className="rounded-lg border border-cyan-950 bg-cyan-950/10 px-3 py-2 font-mono text-xs text-cyan-200"
                    >
                      {path}
                    </div>
                  ))}
                </div>
              </AsideCard>
            </aside>
          </div>
        </main>
      </div>
    </WhitepaperGuard>
  )
}
