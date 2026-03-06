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

async function fetchJson<T>(url: string, retries: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new HttpStatusError(response.status, `Request failed with status ${response.status}`);
      }
      return await response.json() as T;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep((attempt + 1) * 2000);
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
