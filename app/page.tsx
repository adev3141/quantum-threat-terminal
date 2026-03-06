'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Activity, Database, Gauge, Menu, TrendingUp, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTerminalData } from '@/hooks/use-terminal-data';
import type { CompanyDoc, MarketSnapshotDoc, NewsFeedDoc } from '@/lib/types/firestore';

type LeaderboardRow = CompanyDoc & {
  snapshot?: MarketSnapshotDoc;
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

function getRelativeTime(input?: { toDate?: () => Date } | null) {
  if (!input?.toDate) {
    return 'Unknown';
  }

  return `${formatDistanceToNowStrict(input.toDate(), { addSuffix: true })}`;
}

function getStatus(snapshot?: MarketSnapshotDoc) {
  if (!snapshot) {
    return 'PENDING';
  }

  switch (snapshot.quoteStatus) {
    case 'ok':
      return 'LIVE';
    case 'unsupported':
      return 'UNSUPPORTED';
    case 'error':
      return 'ERROR';
    default:
      return 'PENDING';
  }
}

function getStatusHint(snapshot?: MarketSnapshotDoc) {
  if (!snapshot) {
    return 'Awaiting market snapshot.';
  }

  switch (snapshot.quoteStatus) {
    case 'unsupported':
      return 'Finnhub plan does not cover this listing.';
    case 'error':
      return 'Snapshot fetch failed on the last run.';
    case 'ok':
      return 'Live quote available.';
    default:
      return 'Snapshot pending.';
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'LIVE':
      return 'border-emerald-500 text-emerald-300';
    case 'ERROR':
      return 'border-red-500 text-red-300';
    case 'UNSUPPORTED':
      return 'border-amber-500 text-amber-300';
    default:
      return 'border-cyan-800 text-cyan-300';
  }
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

function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-cyan-900 text-xs uppercase tracking-[0.2em] text-cyan-300">
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Symbol</th>
            <th className="px-4 py-3">Tier</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">Perf</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = getStatus(row.snapshot);
            return (
              <tr key={row.symbol} className="border-b border-cyan-950/80 text-xs hover:bg-cyan-950/20">
                <td className="px-4 py-4 font-medium text-white">{row.name}</td>
                <td className="px-4 py-4 font-mono text-cyan-300">{row.symbol}</td>
                <td className="px-4 py-4 text-gray-300">{row.tierNormalized}</td>
                <td className="px-4 py-4 text-right font-mono text-white">{formatCurrency(row.snapshot?.currentPrice)}</td>
                <td className={`px-4 py-4 text-right font-mono ${typeof row.snapshot?.percentChange === 'number' && row.snapshot.percentChange >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {formatPercent(row.snapshot?.percentChange)}
                </td>
                <td className="px-4 py-4">
                  <Badge variant="outline" className={statusClass(status)}>
                    {status}
                  </Badge>
                  <p className="mt-2 max-w-[14rem] text-[11px] leading-relaxed text-gray-500">
                    {getStatusHint(row.snapshot)}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NewsFeed({ articles }: { articles: NewsFeedDoc[] }) {
  if (articles.length === 0) {
    return <p className="font-mono text-sm text-gray-500">NO RECENT ARTICLES</p>;
  }

  return (
    <div className="space-y-3">
      {articles.map((article) => (
        <div key={article.articleKey} className="rounded-lg border border-cyan-900 bg-black/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-sm font-bold text-white underline-offset-4 hover:text-cyan-300 hover:underline"
              >
                {article.title}
              </a>
              <p className="mt-2 text-sm text-gray-300">{article.description ?? 'No summary available.'}</p>
            </div>
            {article.primaryTier ? (
              <div className="flex min-w-max flex-col items-end gap-2">
                <Badge variant="outline" className="border-cyan-700 text-cyan-300">
                  {article.primaryTier}
                </Badge>
                <Badge
                  variant="outline"
                  className={article.matchStrength === 'fallback' ? 'border-amber-600 text-amber-300' : 'border-emerald-600 text-emerald-300'}
                >
                  {article.matchStrength === 'fallback' ? 'Fallback Match' : 'Strong Match'}
                </Badge>
              </div>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="font-mono">{article.primarySymbol ?? 'MULTI'}</span>
            <span>{article.sourceName ?? 'Unknown source'}</span>
            <span>{getRelativeTime(article.publishedAt)}</span>
            {article.queryStrategy === 'fallback' ? <span className="text-amber-300">fallback query</span> : null}
            {typeof article.topMatchScore === 'number' ? <span>score {article.topMatchScore}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalystSidebar({ open }: { open: boolean }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          className="w-full max-w-sm border-l border-cyan-950 bg-black/70 p-6 backdrop-blur-sm"
        >
          <h2 className="flex items-center gap-2 font-mono text-sm font-bold tracking-[0.2em] text-cyan-300">
            <Database className="h-4 w-4" />
            LIVE FEED MODEL
          </h2>
          <div className="mt-5 space-y-4 text-sm text-gray-300">
            <div className="rounded-md border border-cyan-900 bg-cyan-950/10 p-3">
              XML defines which companies are tracked and their search terms.
            </div>
            <div className="rounded-md border border-cyan-900 bg-cyan-950/10 p-3">
              Cloud Functions fetch Finnhub quotes and GNews articles, then normalize them into Firestore.
            </div>
            <div className="rounded-md border border-cyan-900 bg-cyan-950/10 p-3">
              The frontend only watches Firestore and re-renders live when snapshots change.
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

export default function QuantumThreatTerminal() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const {
    companies,
    marketSnapshots,
    newsFeed,
    loading,
    configError,
    companyError,
    marketError,
    newsError,
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

  const newestQuote = ticker[0]?.quoteFetchedAt;
  const liveLabel = newestQuote?.toDate && (Date.now() - newestQuote.toDate().getTime()) < 10 * 60 * 1000 ? 'LIVE' : 'STALE';
  const unsupportedCount = marketSnapshots.filter((snapshot) => snapshot.quoteStatus === 'unsupported').length;

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
                <p className="font-mono text-xs tracking-[0.2em] text-gray-500">FIRESTORE-LINKED QUANTUM WATCHBOARD</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-cyan-700 text-cyan-300">
                {liveLabel}
              </Badge>
              <Button variant="ghost" size="icon" className="text-cyan-300 hover:bg-cyan-950/40" onClick={() => setSidebarOpen((value) => !value)}>
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          <div className="mt-4 border-y border-cyan-950 py-3">
            <p className="mb-2 font-mono text-xs tracking-[0.2em] text-gray-500">QUANTUM STOCK TICKER</p>
            {marketError ? <TerminalWarning title="Market Feed Unavailable" message={marketError} /> : <MarketTicker tickers={ticker} />}
          </div>
        </div>
      </motion.header>

      <div className="mx-auto flex max-w-7xl">
        <div className="min-w-0 flex-1 px-6 py-8">
          {configError ? (
            <TerminalWarning title="Firebase Config Missing" message={configError} />
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Card className="border-cyan-900 bg-black/40">
              <CardContent className="p-8">
                <p className="font-mono text-xs tracking-[0.24em] text-gray-500">ESTIMATED DATA PIPELINE STATUS</p>
                <div className="mt-4 flex items-end gap-4">
                  <div className="font-mono text-5xl font-bold text-cyan-300">{companies.length}</div>
                  <div className="pb-1 text-sm text-gray-400">tracked companies active in Firestore</div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-cyan-950 bg-cyan-950/10 p-4">
                    <p className="font-mono text-xs tracking-[0.2em] text-gray-500">COMPANIES</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{companies.length}</p>
                  </div>
                  <div className="rounded-lg border border-cyan-950 bg-cyan-950/10 p-4">
                    <p className="font-mono text-xs tracking-[0.2em] text-gray-500">LIVE QUOTES</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{marketSnapshots.filter((item) => item.quoteStatus === 'ok').length}</p>
                  </div>
                  <div className="rounded-lg border border-cyan-950 bg-cyan-950/10 p-4">
                    <p className="font-mono text-xs tracking-[0.2em] text-gray-500">ARTICLES</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{newsFeed.length}</p>
                  </div>
                  <div className="rounded-lg border border-amber-900 bg-amber-950/10 p-4">
                    <p className="font-mono text-xs tracking-[0.2em] text-amber-300">UNSUPPORTED</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{unsupportedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-cyan-900 bg-black/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-300">
                  <Gauge className="h-5 w-5" />
                  Read Path
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Browser reads only Firestore, never Finnhub or GNews directly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-300">
                <div className="rounded-md border border-cyan-950 bg-cyan-950/10 p-3">1. XML seeds the `companies` collection.</div>
                <div className="rounded-md border border-cyan-950 bg-cyan-950/10 p-3">2. Cloud Functions populate `market_snapshots` and `news_feed`.</div>
                <div className="rounded-md border border-cyan-950 bg-cyan-950/10 p-3">3. This page subscribes to those collections and updates live.</div>
                <div className="rounded-md border border-amber-900 bg-amber-950/10 p-3 text-amber-100">
                  {unsupportedCount} tracked listings are unsupported by the current Finnhub plan and will show N/A in price fields.
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6">
            <Card className="border-cyan-900 bg-black/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-300">
                  <TrendingUp className="h-5 w-5" />
                  Company Leaderboard
                </CardTitle>
                <CardDescription className="text-gray-500">
                  XML companies enriched with Finnhub market snapshots.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {companyError ? <TerminalWarning title="Company Feed Unavailable" message={companyError} /> : null}
                {loading && companies.length === 0 ? <p className="font-mono text-sm text-gray-500">LOADING COMPANIES...</p> : null}
                <Leaderboard rows={leaderboardRows} />
              </CardContent>
            </Card>

            <Card className="border-cyan-900 bg-black/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-300">
                  <Activity className="h-5 w-5" />
                  Intelligence Feed
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Latest GNews articles matched to your tracked companies and stored in Firestore.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {newsError ? <TerminalWarning title="News Feed Unavailable" message={newsError} /> : <NewsFeed articles={newsFeed} />}
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

        <AnalystSidebar open={sidebarOpen} />
      </div>
    </div>
  );
}
