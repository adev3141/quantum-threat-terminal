# Operational Quantum-Threat Intelligence Terminal

## Purpose

This document specifies the terminal changes required to position `XQBTS Terminal` as an operational quantum-threat intelligence framework rather than a market-oriented dashboard.

The implementation should make the terminal visibly stronger in three dimensions:

1. Provenance: every headline number should trace back to admissible source signals.
2. Explainability: every modeled output should expose its decomposition, assumptions, and confidence status.
3. Change intelligence: operators should be able to see what changed, why it changed, and whether the change came from new evidence or new methodology.

## Positioning

Primary product claim:

- `XQBTS Terminal` is an operational intelligence interface for monitoring frontier quantum capability, modeled cryptanalytic readiness, and resulting harvest-now-decrypt-later exposure pressure.

Secondary product claim:

- The terminal also provides operator watchlist tooling for companies, market snapshots, and news flow.

Non-claim:

- The terminal does not directly observe adversary cryptanalytic capability or enterprise byte-volume telemetry.
- The company-level threat score is an operator heuristic and must not be presented as a scientific core model.

## Current State Summary

Current strengths already present in the codebase:

- Global Q-Day metrics are modeled and published from curated Metriq signals.
- Global risk signals and HNDL pressure are modeled and published from weighted frontier axes.
- Methodology documents are versioned and stored separately from outputs.
- History collections exist for frontier, metrics, risk signals, and methodology.
- Public read access already exists for these documents.

Current weaknesses in the terminal presentation:

- The client subscribes to `global/metrics` and `global/risk_signals` but not `global/metriq_frontier`.
- Frontier evidence, exclusions, methodology diffs, and historical deltas are not first-class UI surfaces.
- Stock and watchlist behavior still visually competes with the core intelligence layer.
- Some benchmark evidence remains hard-coded in the frontend instead of being rendered from canonical data.

## Product Goals

### Goal 1: Make the frontier evidence inspectable

Operators must be able to inspect the selected frontier signals that feed Q-Day and HNDL outputs.

### Goal 2: Make model outputs auditable

Operators must be able to answer:

- what inputs contributed
- what assumptions were applied
- whether the output is direct, modeled, or unavailable
- how stale the result is

### Goal 3: Make change-over-time central

Operators must be able to answer:

- what changed since last sync
- what changed across a selected time window
- whether the change came from evidence updates or methodology changes

### Goal 4: Reframe watchlist features as secondary

Market ticker, company watchlist, and news flow remain available but should not define the primary terminal identity.

## Non-Goals

- Do not build enterprise-specific telemetry ingestion in this phase.
- Do not add new external data providers in this phase.
- Do not treat the company heuristic score as part of the core whitepaper methodology.
- Do not expand motion or visual ornament before evidence/provenance screens exist.

## Information Architecture

The terminal should be split into two product layers.

### Layer A: Intelligence Core

This is the default landing experience.

- `Overview`
- `Frontier Evidence`
- `Change Log`
- `Methodology`
- `Exports`

### Layer B: Watchlist

This is explicitly secondary.

- `Company Watchlist`
- `News Flow`
- `Market Snapshot`

## Screen Specification

## 1. Overview

### Purpose

Show the current operating picture in one screen while making provenance visible.

### Existing modules to retain

- Q-Day countdown
- RSA-2048 delta
- Threat matrix radar
- HNDL pressure

### Required changes

- Keep the current Q-Day, radar, and HNDL cards as top-level hero modules.
- Add a compact `Evidence Health` strip above them.
- Add a compact `Latest Changes` panel beside or beneath them.
- Remove the stock ticker from the top header and move it into `Watchlist`.
- Replace any ambiguous labels with explicit provenance labels such as `MODELED`, `DIRECT`, `NORMALIZED`, `STALE`.

### New module: Evidence Health

Display:

- last successful sync time for frontier, metrics, and risk signals
- stale status for each
- count of selected production signals
- count of diagnostic signals
- count of excluded signals
- number of axes marked `direct`, `modelled`, `unavailable`

### New module: Latest Changes

Display:

- `Q-Day central estimate`: delta from previous published value
- `eLQ proxy`: delta from previous published value
- `HNDL pressure`: delta from previous published value
- axis-by-axis deltas
- top 3 changed source signals

### Acceptance criteria

- An operator can determine freshness and coverage without leaving the overview.
- An operator can see whether the current picture is evidence-rich or evidence-thin.
- The first screen reads like a threat-intelligence terminal, not a stock terminal.

## 2. Frontier Evidence

### Purpose

Expose the admissible and selected benchmark signals driving the core models.

### Data source

- `global/metriq_frontier`

### Required client changes

- Subscribe to `global/metriq_frontier`.
- Extend terminal state to include `globalMetriqFrontier` and `globalMetriqFrontierError`.

### Layout

Two sections:

- `Selected Production Signals`
- `Diagnostic and Rejected Signals`

### Selected Production Signals table

Columns:

- task label
- task ID
- raw metric value
- unit or metric name
- normalized score
- normalization strategy
- selection rule
- source label
- attribution status
- evaluated at
- influence area

### Influence area mapping

Each signal row should show which higher-order outputs depend on it:

- `Q-Day`
- `Utility Frontier`
- `Fault Tolerance`
- `HNDL`
- `Radar Axis`

### Signal detail drawer

On row open, show:

- raw snapshot JSON excerpt
- normalization parameters
- why this record was selected
- platform attribution status
- links or labels required for evidence export

### Diagnostic and Rejected Signals section

This section should show:

- diagnostic signals that are observed but not admitted to production-safe outputs
- excluded signals with explicit rejection reasons

Group rejected signals by:

- not in allowlist
- unattributed
- theoretical or simulated
- no admissible metric match
- fetch or parse failure

### Acceptance criteria

- An operator can inspect every selected production signal and understand where it came from.
- An operator can inspect what the model refused to use and why.
- The screen supports the whitepaper claim that the framework is curated, not merely aggregated.

## 3. Change Log

### Purpose

Turn historical collections into an operational change-intelligence surface.

### Data sources

- `global_metriq_frontier_history`
- `global_metrics_history`
- `global_risk_signals_history`
- `global_metrics_methodology_history`
- `global_risk_methodology_history`

### Layout

Three tabs:

- `Evidence Changes`
- `Output Changes`
- `Methodology Changes`

### Evidence Changes

For each frontier publication event, show:

- published timestamp
- added signals
- removed signals
- changed raw values
- changed normalized scores
- changed attribution status
- excluded signal count delta

### Output Changes

For each output publication event, show:

- Q-Day central estimate delta
- low/high estimate deltas
- eLQ proxy delta
- readiness and bridge score deltas
- HNDL pressure delta
- HNDL status delta
- radar axis deltas

### Methodology Changes

For each methodology update, show:

- changed by
- reason
- fields changed
- previous value
- next value

### Change event classification

Each timeline item should be tagged:

- `NEW EVIDENCE`
- `METHOD CHANGE`
- `STALE RECOVERY`
- `PARTIAL FAILURE`

### Acceptance criteria

- An operator can answer why a headline number changed.
- An operator can distinguish evidence-driven movement from methodology-driven movement.

## 4. Methodology

### Purpose

Expose the framework assumptions directly in the terminal.

### Layout

Four sections:

- `Model Assumptions`
- `Normalization Rules`
- `Weight Maps`
- `Limitations`

### Model Assumptions

Show:

- required logical qubits
- target runtime hours
- growth factors low/central/high
- encrypted traffic share
- PQ-protected share
- allowlist policy
- rejection policy for theoretical records

### Normalization Rules

Show each normalization strategy with formula display:

- `log-upper`
- `linear`
- `inverse-log`
- `inverse-linear`

For each production task show:

- task label
- normalization strategy
- lower/reference/upper bounds
- selection rule

### Weight Maps

Show:

- utility weights
- gate quality weights
- runtime weights
- fault-tolerance weights
- HNDL axis weights

### Limitations

This must be explicit and front-and-center.

Include:

- no direct cryptanalytic benchmark admitted yet
- HNDL is exposure pressure, not telemetry
- Q-Day is a modeled estimate, not a forecast certainty
- modality comparisons are imperfect
- watchlist/company threat scoring is heuristic

### Methodology diff mode

Allow selecting two methodology versions and highlighting changed assumptions.

### Acceptance criteria

- A reviewer can understand the framework assumptions without opening source code.
- A skeptical reader can see the model boundaries and non-claims in the UI.

## 5. Exports

### Purpose

Support whitepaper evidence packs, analyst reviews, and audit workflows.

### Export types

- `Current Evidence Pack`
- `Current Methodology Pack`
- `Change Summary`
- `Snapshot JSON`

### Current Evidence Pack contents

- frontier publication timestamp
- methodology version
- all selected production signals
- all excluded signals
- Q-Day outputs
- HNDL outputs

### Current Methodology Pack contents

- metrics methodology document
- risk methodology document
- normalization task config summary
- model assumptions summary

### Change Summary contents

- deltas since previous sync
- deltas over 7d / 30d
- methodology changes during selected window

### Acceptance criteria

- An operator can export a defensible evidence bundle without manual copy-paste.

## 6. Watchlist

### Purpose

Keep company, market, and news intelligence available while clearly separating it from the whitepaper-grade core model.

### Required changes

- Rename the current company area to `Watchlist`.
- Move stock ticker out of the header into this view.
- Add a visible label on company threat cards: `OPERATOR HEURISTIC`.
- Add a methodology note describing that the score is based on market/news/watchlist heuristics and is not part of the global frontier model.

### Company watchlist table

Retain:

- symbol
- company
- scientific benchmark snapshot
- heuristic threat level

Add:

- heuristic decomposition tooltip
- feed evidence count
- latest article timestamp
- source quality label

### News flow

Retain the live feed, but:

- rename the severity labels to `feed severity` or `operator severity`
- avoid implying that feed severity equals cryptanalytic capability

### Acceptance criteria

- A new visitor can clearly distinguish core intelligence outputs from watchlist heuristics.

## Data Contract Changes

## Client state

Extend `TerminalDataState` with:

- `globalMetriqFrontier: GlobalMetriqFrontierDoc | null`
- `globalMetriqFrontierError: string | null`
- `globalMetricsMethodology: GlobalMetricsMethodologyDoc | null`
- `globalMetricsMethodologyError: string | null`
- `globalRiskMethodology: GlobalRiskMethodologyDoc | null`
- `globalRiskMethodologyError: string | null`

Optional in phase 2:

- history snapshots for metrics, frontier, and risk signals

## Firestore subscriptions

Add live subscriptions for:

- `global/metriq_frontier`
- `global/metrics_methodology`
- `global/risk_methodology`

Phase 2 can use paged queries for:

- `global_metriq_frontier_history`
- `global_metrics_history`
- `global_risk_signals_history`
- `global_metrics_methodology_history`
- `global_risk_methodology_history`

## Derived view-models

Add frontend mappers for:

- evidence health summary
- frontier table rows
- rejected signal groups
- latest change summary
- methodology field groups
- export payload assembly

## Component Plan

Create dedicated components instead of continuing to grow `app/page.tsx`.

### New components

- `components/terminal/overview-health-strip.tsx`
- `components/terminal/latest-changes-panel.tsx`
- `components/terminal/frontier-signals-table.tsx`
- `components/terminal/frontier-signal-drawer.tsx`
- `components/terminal/rejected-signals-panel.tsx`
- `components/terminal/methodology-inspector.tsx`
- `components/terminal/methodology-diff.tsx`
- `components/terminal/change-log-panel.tsx`
- `components/terminal/export-panel.tsx`
- `components/terminal/watchlist-heuristic-note.tsx`

### Shared utilities

- `lib/terminal/provenance.ts`
- `lib/terminal/frontier-mappers.ts`
- `lib/terminal/history-diff.ts`
- `lib/terminal/exporters.ts`

### Page composition

Refactor `app/page.tsx` into a thin container that:

- loads terminal data
- builds derived models
- renders high-level sections or tabs

## UX Rules

- Every modeled metric must have a visible provenance badge.
- Every axis and score must expose whether it is direct, modelled, or unavailable.
- Every stale document must show a stale badge.
- Every rejection must show a reason.
- Every major card must show methodology version and last successful sync.
- Every watchlist heuristic element must be visually distinct from core model outputs.

## Visual Direction

- Maintain the current terminal aesthetic.
- Reduce the visual dominance of market-oriented elements.
- Use cyan for direct evidence, amber for modeled status, slate for unavailable, red for stale or failed.
- Use denser information layouts in evidence/methodology screens and less decorative empty space.

## Delivery Phases

## Phase 1: Credibility Foundation

Scope:

- subscribe to frontier and methodology docs
- add `Frontier Evidence`
- add `Rejected Signals`
- add `Evidence Health`
- move stock ticker to `Watchlist`
- label company scores as heuristic

Success condition:

- the terminal visibly proves provenance and curation

## Phase 2: Explainability and Governance

Scope:

- add `Methodology`
- add `Methodology Diff`
- add formula displays and weight maps
- add explicit limitations section

Success condition:

- a reviewer can understand assumptions and model boundaries without source access

## Phase 3: Change Intelligence

Scope:

- add history queries
- add `Change Log`
- add latest-change summary on overview
- classify evidence vs methodology changes

Success condition:

- operators can explain movement in outputs over time

## Phase 4: Exportability

Scope:

- add evidence pack exports
- add methodology exports
- add snapshot JSON exports

Success condition:

- outputs can be carried into whitepaper, board, or audit workflows

## Acceptance Checklist

- `Overview` foregrounds Q-Day, radar, HNDL, evidence health, and latest changes.
- `Frontier Evidence` exposes every selected production signal and its provenance.
- `Rejected Signals` exposes inadmissible inputs and rejection reasons.
- `Methodology` exposes assumptions, normalization rules, weights, and limitations.
- `Change Log` explains what changed and why.
- `Watchlist` is clearly separated from core framework outputs.
- No core whitepaper claim depends on the company heuristic score.
- All core output cards show last sync and methodology version.
- The terminal can export a current evidence pack.

## Open Issues

- Hard-coded company benchmark data in the frontend should be moved to canonical backend data before whitepaper publication.
- Historical collections may require pagination and summarization to keep the UI responsive.
- Export format should be decided: downloadable JSON only, or JSON plus human-readable markdown.
- If methodology docs will be public, ensure the UI labels legacy or deprecated versions clearly.
