"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileSearch,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  WalletCards,
  X,
  ScanSearch,
  FileText,
  QrCode,
} from "lucide-react";
/* ==========================================================================
   TYPES
========================================================================== */
interface Tweet {
  id?: number | string;
  tweet_id?: string;
  author?: string;
  username?: string;
  text?: string;
  raw_text?: string;
  normalized_text?: string;
  media_url?: string | null;
  media_urls?: string[];
  tweet_url?: string | null;
  created_at?: string;
  timestamp?: string;
  risk_score?: number;
  risk_level?: string;
  keywords?: string[];
  wallet_addresses?: string[];
  wallets?: string[];
  wallet_count?: number;
  processed?: boolean;
  has_media?: boolean;
  investigate_available?: boolean;
  investigate_url?: string;
}
interface TweetsResponse {
  status?: string;
  count?: number;
  tweets?: Tweet[];
}
/* ==========================================================================
   INVESTIGATION TYPES
========================================================================== */
interface OCRResult {
  page?: number;
  raw_ocr?: string;
  normalized_ocr?: string;
  ocr_text?: string;
  confidence?: number | null;
  average_confidence?: number | null;
  qr_results?: QRResult[];
  error?: string | null;
}
interface QRResult {
  data?: string;
  text?: string;
  value?: string;
  type?: string;
  confidence?: number | null;
  bbox?: unknown;
}
interface InvestigationResult {
  status?: string;
  investigated_at?: string;
  media_inspected?: boolean;
  media_type?: string;
  filename?: string;
  content_type?: string;
  page_count?: number;
  original_media_url?: string | null;
  media_url?: string | null;
  download_url?: string | null;
  raw_ocr?: string;
  normalized_ocr?: string;
  ocr_text?: string;
  ocr_confidence?: number | null;
  average_ocr_confidence?: number | null;
  pages?: OCRResult[];
  qr_results?: QRResult[];
  wallets?: string[];
  wallet_count?: number;
  highest_risk?: number;
  risk?: string;
  errors?: string[];
  extraction_id?: number | string;
}
interface InvestigationResponse {
  status?: string;
  tweet?: Tweet;
  investigation?: InvestigationResult;
}
/* ==========================================================================
   API CONFIGURATION
========================================================================== */
const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8000";
function normalizeApiUrl(value: string) {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/api$/i, "")
    .replace(/\/api$/i, "");
}
const API_BASE_URL = normalizeApiUrl(RAW_API_URL);
function apiUrl(path: string) {
  return `${API_BASE_URL}/api/${path.replace(/^\/+/, "")}`;
}
/* ==========================================================================
   SETTINGS
========================================================================== */
const POLL_INTERVAL = 5000;
const REQUEST_TIMEOUT = 12000;
const INVESTIGATION_TIMEOUT = 60000;
const MAX_TWEETS = 12;
const MAX_MEDIA_PER_TWEET = 6;
/* ==========================================================================
   MEDIA URL RESOLUTION
========================================================================== */
function resolveMediaUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  const cleanPath = trimmed.replace(/^\/+/, "");
  if (cleanPath.startsWith("api/")) {
    return `${API_BASE_URL}/${cleanPath}`;
  }
  return `${API_BASE_URL}/${cleanPath}`;
}
/* ==========================================================================
   MEDIA EXTRACTION
========================================================================== */
function getTweetMedia(tweet: Tweet) {
  const media: string[] = [];
  if (typeof tweet.media_url === "string" && tweet.media_url.trim()) {
    media.push(tweet.media_url.trim());
  }
  if (Array.isArray(tweet.media_urls)) {
    for (const url of tweet.media_urls) {
      if (typeof url === "string" && url.trim()) {
        media.push(url.trim());
      }
    }
  }
  return Array.from(new Set(media)).slice(0, MAX_MEDIA_PER_TWEET);
}
/* ==========================================================================
   FETCH HELPER
========================================================================== */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT,
) {
  const externalSignal = options.signal;
  const controller = new AbortController();
  let timeoutId: number | undefined;
  const abortFromExternalSignal = () => {
    controller.abort();
  };
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", abortFromExternalSignal, {
        once: true,
      });
    }
  }
  timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeout);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }
}
/* ==========================================================================
   MAIN COMPONENT
========================================================================== */
export default function ScraperLiveFeed() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [investigatingTweet, setInvestigatingTweet] = useState<Tweet | null>(
    null,
  );
  const [investigation, setInvestigation] =
    useState<InvestigationResult | null>(null);
  const [investigationLoading, setInvestigationLoading] = useState(false);
  const [investigationError, setInvestigationError] = useState<string | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);
  const requestInFlightRef = useRef(false);
  /* ==========================================================================
     FETCH TWEETS
  ========================================================================== */
  const fetchTweets = useCallback(async (manual = false) => {
    if (requestInFlightRef.current) {
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    requestInFlightRef.current = true;
    if (manual) {
      setRefreshing(true);
    }
    try {
      const endpoint = apiUrl("tweets/feed");
      console.log("[SCRAPER] Loading feed:", endpoint);
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        },
        REQUEST_TIMEOUT,
      );
      if (!response.ok) {
        throw new Error(`Scraper feed returned ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Scraper feed returned a non-JSON response");
      }
      const data: TweetsResponse = await response.json();
      const incoming = Array.isArray(data.tweets) ? data.tweets : [];
      const uniqueTweets = dedupeTweets(incoming).slice(0, MAX_TWEETS);
      if (!controller.signal.aborted) {
        setTweets(uniqueTweets);
        setOnline(true);
        setError(null);
        setLastSync(new Date());
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      console.error("[SCRAPER] Feed loading failed:", err);
      if (!controller.signal.aborted) {
        setOnline(false);
        setError("Scraper feed unavailable");
      }
    } finally {
      requestInFlightRef.current = false;
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);
  /* ==========================================================================
     INVESTIGATE TWEET
  ========================================================================== */
  const investigateTweet = useCallback(async (tweet: Tweet) => {
    const tweetId =
      tweet.tweet_id || (tweet.id !== undefined ? String(tweet.id) : null);
    if (!tweetId) {
      setInvestigationError("Tweet ID is unavailable.");
      return;
    }
    setInvestigatingTweet(tweet);
    setInvestigation(null);
    setInvestigationError(null);
    setInvestigationLoading(true);
    try {
      const endpoint = apiUrl(
        `tweets/${encodeURIComponent(tweetId)}/investigate`,
      );
      console.log("[INVESTIGATE] Starting:", endpoint);
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
        INVESTIGATION_TIMEOUT,
      );
      if (!response.ok) {
        let message = `Investigation returned ${response.status}`;
        try {
          const body = await response.json();
          if (body?.detail) {
            message = String(body.detail);
          }
        } catch {
          // Ignore malformed error response.
        }
        throw new Error(message);
      }
      const data: InvestigationResponse = await response.json();
      if (!data.investigation) {
        throw new Error("Backend returned no investigation result.");
      }
      setInvestigation(data.investigation);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      console.error("[INVESTIGATE] Failed:", err);
      setInvestigationError(
        err instanceof Error ? err.message : "Investigation failed.",
      );
    } finally {
      setInvestigationLoading(false);
    }
  }, []);
  /* ==========================================================================
     POLLING
  ========================================================================== */
  useEffect(() => {
    void fetchTweets();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }
      void fetchTweets();
    }, POLL_INTERVAL);
    return () => {
      window.clearInterval(interval);
      abortRef.current?.abort();
      requestInFlightRef.current = false;
    };
  }, [fetchTweets]);
  /* ==========================================================================
     ESCAPE HANDLER
  ========================================================================== */
  useEffect(() => {
    const modalOpen = Boolean(selectedMedia) || Boolean(investigatingTweet);
    if (!modalOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (selectedMedia) {
        setSelectedMedia(null);
        return;
      }
      setInvestigatingTweet(null);
      setInvestigation(null);
      setInvestigationError(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedMedia, investigatingTweet]);
  /* ==========================================================================
     DERIVED DATA
  ========================================================================== */
  const suspiciousCount = useMemo(() => {
    return tweets.filter((tweet) => {
      const score = Number(tweet.risk_score || 0);
      const level = tweet.risk_level?.toLowerCase();
      return score >= 70 || level === "high" || level === "critical";
    }).length;
  }, [tweets]);
  const mediaCount = useMemo(() => {
    return tweets.reduce((total, tweet) => {
      return total + getTweetMedia(tweet).length;
    }, 0);
  }, [tweets]);
  /* ==========================================================================
     RENDER
  ========================================================================== */
  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#071019]/70 shadow-[0_18px_55px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        {/* HEADER */}
        <div className="border-b border-white/[0.06] px-5 py-5 lg:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full ${
                      online ? "animate-ping bg-emerald-400 opacity-30" : ""
                    }`}
                  />
                  <span
                    className={`relative h-1.5 w-1.5 rounded-full ${
                      online ? "bg-emerald-400" : "bg-slate-600"
                    }`}
                  />
                </span>
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
                  X / OSINT scraper
                </span>
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-100">
                Live Collection Stream
              </h2>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                Recent intelligence captured by the automated social media
                collection layer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchTweets(true)}
              disabled={refreshing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/[0.12] bg-cyan-400/[0.035] text-cyan-300/80 transition hover:border-cyan-400/25 hover:bg-cyan-400/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
              title="Refresh scraper feed"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <MetaItem
              icon={<Radio size={11} />}
              label="STATUS"
              value={online ? "ONLINE" : "OFFLINE"}
              active={online}
            />
            <MetaItem
              icon={<Activity size={11} />}
              label="EVENTS"
              value={String(tweets.length).padStart(2, "0")}
            />
            <MetaItem
              icon={<ShieldAlert size={11} />}
              label="RISK"
              value={String(suspiciousCount).padStart(2, "0")}
              danger={suspiciousCount > 0}
            />
            <MetaItem
              icon={<ImageIcon size={11} />}
              label="MEDIA"
              value={String(mediaCount).padStart(2, "0")}
            />
            <MetaItem icon={<Clock3 size={11} />} label="POLL" value="05 SEC" />
          </div>
        </div>
        {/* ERROR */}
        {error && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-red-400/[0.12] bg-red-400/[0.025] px-3 py-2.5 lg:mx-6">
            <AlertTriangle size={12} className="shrink-0 text-red-400/70" />
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-red-300/70">
              {error}
            </span>
          </div>
        )}
        {/* STREAM */}
        <div className="relative">
          {loading ? (
            <LoadingState />
          ) : tweets.length === 0 ? (
            <EmptyState online={online} />
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {tweets.map((tweet, index) => (
                <TweetRow
                  key={tweet.tweet_id || tweet.id || `tweet-${index}`}
                  tweet={tweet}
                  onMediaClick={setSelectedMedia}
                  onInvestigate={investigateTweet}
                />
              ))}
            </div>
          )}
        </div>
        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-white/[0.05] bg-white/[0.012] px-5 py-2.5 lg:px-6">
          <span className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-slate-700">
            Automated X collection
          </span>
          <div className="flex items-center gap-3">
            {lastSync && (
              <span className="font-mono text-[8px] text-slate-700">
                {lastSync.toLocaleTimeString()}
              </span>
            )}
            <span
              className={`flex items-center gap-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] ${
                online ? "text-emerald-400/70" : "text-slate-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  online ? "animate-pulse bg-emerald-400" : "bg-slate-700"
                }`}
              />
              {online ? "STREAMING" : "STANDBY"}
            </span>
          </div>
        </div>
      </section>
      {/* MEDIA VIEWER */}
      {selectedMedia && (
        <MediaViewer
          src={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}
      {/* INVESTIGATION DRAWER */}
      {investigatingTweet && (
        <InvestigationDrawer
          tweet={investigatingTweet}
          investigation={investigation}
          loading={investigationLoading}
          error={investigationError}
          onClose={() => {
            setInvestigatingTweet(null);
            setInvestigation(null);
            setInvestigationError(null);
          }}
          onViewImage={(url) => {
            const resolved = resolveMediaUrl(url);
            if (resolved) {
              setSelectedMedia(resolved);
            }
          }}
        />
      )}
    </>
  );
}
/* ==========================================================================
   TWEET ROW
========================================================================== */
function TweetRow({
  tweet,
  onMediaClick,
  onInvestigate,
}: {
  tweet: Tweet;
  onMediaClick: (url: string) => void;
  onInvestigate: (tweet: Tweet) => void;
}) {
  const score = Number(tweet.risk_score || 0);
  const riskLevel = getRiskLevel(score, tweet.risk_level);
  const isHighRisk = riskLevel === "HIGH" || riskLevel === "CRITICAL";
  const author =
    tweet.author?.trim() || tweet.username?.trim() || "Unknown operator";
  const message =
    tweet.normalized_text?.trim() ||
    tweet.text?.trim() ||
    "No message content available.";
  const timestamp = tweet.created_at || tweet.timestamp;
  const media = getTweetMedia(tweet);
  const riskStyles =
    riskLevel === "CRITICAL"
      ? {
          border: "border-red-400/[0.18]",
          bg: "bg-red-400/[0.045]",
          text: "text-red-300/90",
          accent: "bg-red-500",
        }
      : riskLevel === "HIGH"
        ? {
            border: "border-red-400/[0.14]",
            bg: "bg-red-400/[0.035]",
            text: "text-red-300/80",
            accent: "bg-red-400/80",
          }
        : {
            border: "border-white/[0.07]",
            bg: "bg-white/[0.018]",
            text: "text-slate-600",
            accent: "bg-transparent",
          };
  return (
    <article className="group relative px-5 py-4 transition-colors duration-200 hover:bg-white/[0.02] lg:px-6">
      <span
        className={`absolute bottom-0 left-0 top-0 w-px ${
          isHighRisk
            ? riskStyles.accent
            : "bg-transparent group-hover:bg-cyan-400/40"
        }`}
      />
      <div className="flex gap-3.5">
        {/* SOURCE */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
            isHighRisk
              ? `${riskStyles.border} ${riskStyles.bg} ${riskStyles.text}`
              : "border-white/[0.07] bg-white/[0.025] text-cyan-300/70 group-hover:border-cyan-400/[0.12]"
          }`}
        >
          <Search size={14} strokeWidth={1.6} />
        </div>
        {/* CONTENT */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <User size={10} className="shrink-0 text-slate-600" />
                <strong className="truncate text-[11px] font-medium text-slate-200">
                  {author}
                </strong>
                <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.08em] text-slate-700">
                  X / POST
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isHighRisk && (
                <span
                  className={`flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] ${riskStyles.border} ${riskStyles.bg} ${riskStyles.text}`}
                >
                  <ShieldAlert size={9} />
                  {riskLevel}
                </span>
              )}
              <button
                type="button"
                onClick={() => onInvestigate(tweet)}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-400/[0.12] bg-cyan-400/[0.025] px-2.5 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-cyan-300/70 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.08] hover:text-cyan-200"
                title="Investigate this post"
              >
                <ScanSearch size={10} />
                Investigate
              </button>
            </div>
          </div>
          {/* MESSAGE */}
          <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-slate-400">
            {message}
          </p>
          {/* MEDIA */}
          {media.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-cyan-400/[0.10] bg-cyan-400/[0.025]">
                    <ImageIcon size={11} className="text-cyan-300/60" />
                  </div>
                  <span className="font-mono text-[8px] font-medium uppercase tracking-[0.1em] text-slate-600">
                    {media.length === 1
                      ? "MEDIA ATTACHED"
                      : `${media.length} MEDIA FILES`}
                  </span>
                </div>
                <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-slate-700">
                  CLICK TO INSPECT
                </span>
              </div>
              <div
                className={`grid gap-2 ${
                  media.length === 1
                    ? "grid-cols-1"
                    : media.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-2 sm:grid-cols-3"
                }`}
              >
                {media.map((mediaUrl, mediaIndex) => {
                  const resolvedUrl = resolveMediaUrl(mediaUrl);
                  if (!resolvedUrl) {
                    return null;
                  }
                  return (
                    <MediaPreview
                      key={`${tweet.tweet_id || tweet.id || "tweet"}-media-${mediaIndex}`}
                      src={resolvedUrl}
                      index={mediaIndex}
                      total={media.length}
                      onClick={() => onMediaClick(resolvedUrl)}
                    />
                  );
                })}
              </div>
            </div>
          )}
          {/* KEYWORDS */}
          {Array.isArray(tweet.keywords) && tweet.keywords.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {tweet.keywords
                .filter(
                  (keyword): keyword is string =>
                    typeof keyword === "string" && keyword.trim().length > 0,
                )
                .slice(0, 5)
                .map((keyword, keywordIndex) => (
                  <span
                    key={`${tweet.tweet_id || tweet.id || "tweet"}-${keyword}-${keywordIndex}`}
                    className="rounded border border-white/[0.06] bg-white/[0.018] px-1.5 py-0.5 font-mono text-[8px] text-slate-600"
                  >
                    {keyword}
                  </span>
                ))}
            </div>
          )}
          {/* TELEMETRY */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {score > 0 && (
              <span
                className={`font-mono text-[8px] uppercase tracking-[0.06em] ${riskStyles.text}`}
              >
                RISK {score}
              </span>
            )}
            {timestamp && (
              <span className="flex items-center gap-1 font-mono text-[8px] text-slate-700">
                <Clock3 size={9} />
                {formatTimestamp(timestamp)}
              </span>
            )}
            {tweet.wallet_count !== undefined && tweet.wallet_count > 0 && (
              <span className="flex items-center gap-1 font-mono text-[8px] text-amber-400/70">
                <WalletCards size={9} />
                {tweet.wallet_count} WALLET
                {tweet.wallet_count === 1 ? "" : "S"}
              </span>
            )}
            {tweet.tweet_id && (
              <span
                className="truncate font-mono text-[8px] text-slate-700"
                title={tweet.tweet_id}
              >
                ID {tweet.tweet_id}
              </span>
            )}
          </div>
        </div>
        <ArrowUpRight
          size={12}
          className="mt-1 shrink-0 text-transparent transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-400/60"
        />
      </div>
    </article>
  );
}
/* ==========================================================================
   INVESTIGATION DRAWER
========================================================================== */
function InvestigationDrawer({
  tweet,
  investigation,
  loading,
  error,
  onClose,
  onViewImage,
}: {
  tweet: Tweet;
  investigation: InvestigationResult | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onViewImage: (url: string) => void;
}) {
  const media = getTweetMedia(tweet);
  const originalMedia =
    investigation?.original_media_url ||
    investigation?.media_url ||
    media[0] ||
    null;
  const normalizedOCR =
    investigation?.normalized_ocr || investigation?.ocr_text || "";
  const rawOCR = investigation?.raw_ocr || "";
  const wallets = uniqueStrings([
    ...(investigation?.wallets || []),
    ...(tweet.wallet_addresses || []),
    ...(tweet.wallets || []),
  ]);
  const qrResults =
    investigation?.qr_results ||
    investigation?.pages?.flatMap((page) =>
      Array.isArray(page.qr_results) ? page.qr_results : [],
    ) ||
    [];
  const confidence =
    investigation?.ocr_confidence ??
    investigation?.average_ocr_confidence ??
    null;
  return (
    <div className="fixed inset-0 z-[9998]">
      {/* BACKDROP */}
      <button
        type="button"
        aria-label="Close investigation"
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* DRAWER */}
      <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-2xl flex-col border-l border-white/[0.08] bg-[#05080d]/98 shadow-[-30px_0_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        {/* TOP ACCENT */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        {/* HEADER */}
        <div className="flex shrink-0 items-start justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/[0.14] bg-cyan-400/[0.035]">
                <FileSearch size={14} className="text-cyan-300/80" />
              </div>
              <div>
                <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.15em] text-cyan-400/70">
                  Forensic Investigation
                </div>
                <h2 className="mt-0.5 text-sm font-semibold text-slate-100">
                  Media & Evidence Analysis
                </h2>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-white/[0.06] bg-white/[0.018] px-2 py-1 font-mono text-[8px] text-slate-500">
                {tweet.tweet_id || tweet.id || "UNKNOWN ID"}
              </span>
              <span className="rounded-md border border-white/[0.06] bg-white/[0.018] px-2 py-1 font-mono text-[8px] text-slate-600">
                @{tweet.author || tweet.username || "unknown"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:border-red-400/20 hover:text-red-300"
          >
            <X size={14} />
          </button>
        </div>
        {/* CONTENT */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {/* STATUS */}
          {loading && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-cyan-400/[0.10] bg-cyan-400/[0.025] px-4 py-3">
              <Loader2 size={15} className="animate-spin text-cyan-400" />
              <div>
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-cyan-300/80">
                  Investigation running
                </div>
                <div className="mt-1 text-[10px] text-slate-600">
                  Inspecting media, OCR and QR evidence...
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-xl border border-red-400/[0.12] bg-red-400/[0.025] p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-red-400" />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-red-300/80">
                  Investigation failed
                </span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-red-200/50">
                {error}
              </p>
              <button
                type="button"
                onClick={() => {
                  window.location.reload();
                }}
                className="mt-3 rounded-lg border border-red-400/[0.12] bg-red-400/[0.025] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-red-300/70"
              >
                Retry
              </button>
            </div>
          )}
          {/* POST CONTEXT */}
          <InvestigationSection title="Source Post">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
              <div className="flex items-center gap-2">
                <User size={11} className="text-slate-600" />
                <span className="font-mono text-[9px] text-slate-400">
                  {tweet.author || tweet.username || "Unknown"}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-[10px] leading-relaxed text-slate-500">
                {tweet.normalized_text || tweet.text || "No text available."}
              </p>
              {tweet.tweet_url && (
                <a
                  href={tweet.tweet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-cyan-400/60 hover:text-cyan-300"
                >
                  <ExternalLink size={9} />
                  Open original post
                </a>
              )}
            </div>
          </InvestigationSection>
          {/* MEDIA */}
          <InvestigationSection title="Original Media">
            {originalMedia ? (
              <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-black/30">
                <button
                  type="button"
                  onClick={() => onViewImage(originalMedia)}
                  className="group relative block w-full text-left"
                >
                  <img
                    src={resolveMediaUrl(originalMedia) || ""}
                    alt="Original collected evidence"
                    className="max-h-[330px] w-full object-contain transition duration-300 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/65 px-3 py-2 opacity-0 backdrop-blur-md transition group-hover:opacity-100">
                      <Maximize2 size={11} className="text-cyan-300" />
                      <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-cyan-200">
                        View Image
                      </span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2">
                  <span className="max-w-[55%] truncate font-mono text-[7px] text-slate-700">
                    {investigation?.filename || getFilename(originalMedia)}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={resolveMediaUrl(originalMedia) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-md border border-white/[0.07] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-slate-500 transition hover:border-cyan-400/20 hover:text-cyan-300"
                    >
                      <ExternalLink size={9} />
                      Open
                    </a>
                    <a
                      href={
                        resolveMediaUrl(
                          investigation?.download_url || originalMedia,
                        ) || "#"
                      }
                      download
                      className="flex items-center gap-1.5 rounded-md border border-cyan-400/[0.10] bg-cyan-400/[0.025] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-cyan-300/70 transition hover:bg-cyan-400/[0.07] hover:text-cyan-200"
                    >
                      <Download size={9} />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <EvidenceEmpty label="No original media available." />
            )}
          </InvestigationSection>
          {/* ANALYSIS SUMMARY */}
          {investigation && (
            <InvestigationSection title="Analysis Summary">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MetricCard
                  label="STATUS"
                  value={investigation.status || "COMPLETED"}
                  good
                />
                <MetricCard
                  label="PAGES"
                  value={String(
                    investigation.page_count ||
                      investigation.pages?.length ||
                      1,
                  )}
                />
                <MetricCard
                  label="WALLETS"
                  value={String(investigation.wallet_count ?? wallets.length)}
                  danger={wallets.length > 0}
                />
                <MetricCard
                  label="RISK"
                  value={
                    investigation.risk ||
                    getRiskLevel(Number(investigation.highest_risk || 0))
                  }
                  danger={
                    investigation.risk === "HIGH" ||
                    investigation.risk === "CRITICAL"
                  }
                />
              </div>
              {investigation.extraction_id && (
                <div className="mt-2 rounded-lg border border-white/[0.05] bg-white/[0.012] px-3 py-2">
                  <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-slate-700">
                    Extraction ID
                  </span>
                  <span className="ml-2 font-mono text-[8px] text-slate-500">
                    #{investigation.extraction_id}
                  </span>
                </div>
              )}
            </InvestigationSection>
          )}
          {/* OCR */}
          <InvestigationSection
            title="OCR Evidence"
            action={
              confidence !== null ? (
                <OCRConfidence value={confidence} />
              ) : undefined
            }
          >
            {!investigation && !loading ? (
              <EvidenceEmpty label="Run investigation to inspect OCR." />
            ) : (
              <>
                <div className="grid gap-3">
                  <OCRPanel
                    title="Normalized OCR"
                    icon={<FileText size={11} />}
                    value={normalizedOCR}
                    primary
                  />
                  <OCRPanel
                    title="Raw OCR"
                    icon={<FileSearch size={11} />}
                    value={rawOCR}
                  />
                </div>
                {investigation?.pages && investigation.pages.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                      Page-level evidence
                    </div>
                    {investigation.pages.map((page, index) => (
                      <PageEvidence
                        key={`page-${page.page || index + 1}`}
                        page={page}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </InvestigationSection>
          {/* QR */}
          <InvestigationSection title="QR Evidence">
            {qrResults.length === 0 ? (
              <EvidenceEmpty label="No QR codes detected." />
            ) : (
              <div className="space-y-2">
                {qrResults.map((qr, index) => {
                  const value = qr.data || qr.text || qr.value || "";
                  return (
                    <div
                      key={`qr-${index}`}
                      className="rounded-xl border border-violet-400/[0.10] bg-violet-400/[0.025] p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <QrCode size={11} className="text-violet-300/70" />
                          <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-violet-300/70">
                            QR {index + 1}
                          </span>
                        </div>
                        {qr.type && (
                          <span className="font-mono text-[7px] text-slate-700">
                            {qr.type}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-start gap-2">
                        <code className="min-w-0 flex-1 break-all rounded-md bg-black/30 px-2 py-1.5 font-mono text-[8px] text-slate-400">
                          {value || "No decoded value"}
                        </code>
                        {value && <CopyButton value={value} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </InvestigationSection>
          {/* WALLETS */}
          <InvestigationSection title="Wallet Evidence">
            {wallets.length === 0 ? (
              <EvidenceEmpty label="No wallet addresses extracted." />
            ) : (
              <div className="space-y-2">
                {wallets.map((wallet, index) => (
                  <WalletEvidence key={`${wallet}-${index}`} wallet={wallet} />
                ))}
              </div>
            )}
          </InvestigationSection>
          {/* ERRORS */}
          {investigation?.errors && investigation.errors.length > 0 && (
            <InvestigationSection title="Processing Notes">
              <div className="space-y-2">
                {investigation.errors.map((item, index) => (
                  <div
                    key={`error-${index}`}
                    className="rounded-lg border border-amber-400/[0.08] bg-amber-400/[0.018] px-3 py-2 font-mono text-[8px] leading-relaxed text-amber-300/60"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </InvestigationSection>
          )}
        </div>
        {/* FOOTER */}
        <div className="shrink-0 border-t border-white/[0.07] bg-black/20 px-5 py-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-slate-700">
              Gatekeeper forensic evidence
            </span>
            {investigation?.investigated_at && (
              <span className="font-mono text-[7px] text-slate-700">
                {formatTimestamp(investigation.investigated_at)}
              </span>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
/* ==========================================================================
   INVESTIGATION SECTION
========================================================================== */
function InvestigationSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          {title}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
/* ==========================================================================
   OCR PANEL
========================================================================== */
function OCRPanel({
  title,
  icon,
  value,
  primary = false,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        primary
          ? "border-cyan-400/[0.10] bg-cyan-400/[0.018]"
          : "border-white/[0.06] bg-white/[0.012]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={primary ? "text-cyan-300/60" : "text-slate-700"}>
            {icon}
          </span>
          <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-600">
            {title}
          </span>
        </div>
        <span className="font-mono text-[7px] uppercase text-slate-800">
          OCR
        </span>
      </div>
      <div className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/25 p-3 font-mono text-[9px] leading-relaxed text-slate-400">
        {value || "No OCR text available."}
      </div>
    </div>
  );
}
/* ==========================================================================
   PAGE EVIDENCE
========================================================================== */
function PageEvidence({ page }: { page: OCRResult }) {
  const raw = page.raw_ocr || page.ocr_text || "";
  const normalized = page.normalized_ocr || page.ocr_text || "";
  const confidence = page.confidence ?? page.average_confidence ?? null;
  const qrCount = page.qr_results?.length || 0;
  return (
    <details className="group rounded-xl border border-white/[0.06] bg-white/[0.012]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] font-semibold text-slate-500">
            PAGE {page.page || 1}
          </span>
          {qrCount > 0 && (
            <span className="flex items-center gap-1 rounded border border-violet-400/[0.10] bg-violet-400/[0.025] px-1.5 py-0.5 font-mono text-[7px] text-violet-300/60">
              <QrCode size={8} />
              {qrCount} QR
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {confidence !== null && <OCRConfidence value={confidence} compact />}
          <ArrowUpRight
            size={10}
            className="rotate-45 text-slate-700 transition group-open:rotate-[225deg]"
          />
        </div>
      </summary>
      <div className="border-t border-white/[0.05] p-3">
        <div className="grid gap-2">
          <div>
            <div className="mb-1 font-mono text-[7px] uppercase tracking-[0.08em] text-slate-700">
              Normalized
            </div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/25 p-2.5 font-mono text-[8px] leading-relaxed text-slate-500">
              {normalized || "No normalized OCR."}
            </pre>
          </div>
          <div>
            <div className="mb-1 font-mono text-[7px] uppercase tracking-[0.08em] text-slate-700">
              Raw
            </div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/25 p-2.5 font-mono text-[8px] leading-relaxed text-slate-600">
              {raw || "No raw OCR."}
            </pre>
          </div>
        </div>
      </div>
    </details>
  );
}
/* ==========================================================================
   WALLET EVIDENCE
========================================================================== */
function WalletEvidence({ wallet }: { wallet: string }) {
  const [copied, setCopied] = useState(false);
  const investigateUrl = apiUrl(
    `enrichment/lookup?address=${encodeURIComponent(wallet)}`,
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable.
    }
  };
  return (
    <div className="rounded-xl border border-amber-400/[0.10] bg-amber-400/[0.018] p-3">
      <div className="flex items-center gap-2">
        <WalletCards size={12} className="text-amber-300/70" />
        <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-amber-300/70">
          Wallet detected
        </span>
      </div>
      <div className="mt-2 flex items-start gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-black/25 px-2.5 py-2 font-mono text-[8px] leading-relaxed text-slate-400">
          {wallet}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-600 transition hover:border-cyan-400/20 hover:text-cyan-300"
          title="Copy wallet"
        >
          {copied ? (
            <CheckCircle2 size={11} className="text-emerald-400" />
          ) : (
            <Copy size={11} />
          )}
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <a
          href={investigateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-md border border-amber-400/[0.10] bg-amber-400/[0.02] px-2 py-1.5 font-mono text-[7px] uppercase tracking-[0.08em] text-amber-300/60 transition hover:border-amber-400/25 hover:text-amber-200"
        >
          <ScanSearch size={9} />
          Investigate Wallet
        </a>
      </div>
    </div>
  );
}
/* ==========================================================================
   OCR CONFIDENCE
========================================================================== */
function OCRConfidence({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  const normalized = value <= 1 ? value * 100 : value;
  const percentage = Math.max(0, Math.min(100, normalized));
  const label = percentage >= 85 ? "HIGH" : percentage >= 60 ? "MEDIUM" : "LOW";
  const color =
    percentage >= 85
      ? "text-emerald-400/80"
      : percentage >= 60
        ? "text-amber-300/80"
        : "text-red-300/80";
  return (
    <span
      className={`font-mono ${
        compact ? "text-[7px]" : "text-[8px]"
      } uppercase tracking-[0.06em] ${color}`}
      title={`OCR confidence ${percentage.toFixed(1)}%`}
    >
      OCR {percentage.toFixed(0)}% {!compact && label}
    </span>
  );
}
/* ==========================================================================
   METRIC CARD
========================================================================== */
function MetricCard({
  label,
  value,
  good = false,
  danger = false,
}: {
  label: string;
  value: string;
  good?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.012] px-3 py-2">
      <div className="font-mono text-[7px] font-medium tracking-[0.1em] text-slate-700">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-[9px] ${
          good
            ? "text-emerald-400/80"
            : danger
              ? "text-red-300/80"
              : "text-slate-500"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
/* ==========================================================================
   COPY BUTTON
========================================================================== */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable.
    }
  };
  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.025] text-slate-600 transition hover:border-cyan-400/20 hover:text-cyan-300"
      title="Copy"
    >
      {copied ? (
        <CheckCircle2 size={11} className="text-emerald-400" />
      ) : (
        <Copy size={11} />
      )}
    </button>
  );
}
/* ==========================================================================
   EMPTY EVIDENCE
========================================================================== */
function EvidenceEmpty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] px-4 py-5 text-center">
      <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-slate-700">
        {label}
      </span>
    </div>
  );
}
/* ==========================================================================
   MEDIA PREVIEW
========================================================================== */
function MediaPreview({
  src,
  index,
  total,
  onClick,
}: {
  src: string;
  index: number;
  total: number;
  onClick: () => void;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="relative flex min-h-[120px] items-center justify-center overflow-hidden rounded-xl border border-red-400/[0.10] bg-red-400/[0.02]">
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <AlertTriangle size={15} className="text-red-400/50" />
          <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-red-300/50">
            Media unavailable
          </span>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[7px] uppercase tracking-[0.08em] text-cyan-400/60 hover:text-cyan-300"
          >
            Open source
          </a>
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group/media relative overflow-hidden rounded-xl border border-white/[0.07] bg-black/30 text-left transition-all duration-300 hover:border-cyan-400/[0.25] hover:bg-black/40 ${
        total === 1 ? "max-w-2xl" : "aspect-[4/3]"
      }`}
    >
      <img
        src={src}
        alt={`Collected X media ${index + 1}`}
        loading="lazy"
        decoding="async"
        className={`block w-full object-cover transition duration-500 group-hover/media:scale-[1.025] ${
          total === 1 ? "max-h-[430px]" : "h-full"
        }`}
        onError={() => setFailed(true)}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10 opacity-0 transition-opacity duration-200 group-hover/media:opacity-100" />
      <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2 py-1.5 opacity-0 backdrop-blur-md transition-all duration-200 group-hover/media:opacity-100">
        <Maximize2 size={10} className="text-cyan-300" />
        <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-cyan-200">
          Inspect
        </span>
      </div>
      {total > 1 && (
        <span className="pointer-events-none absolute left-2 top-2 rounded-md border border-white/10 bg-black/55 px-1.5 py-1 font-mono text-[7px] text-slate-300 backdrop-blur-md">
          {index + 1}/{total}
        </span>
      )}
    </button>
  );
}
/* ==========================================================================
   FULLSCREEN MEDIA VIEWER
========================================================================== */
function MediaViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-cyan-400/[0.12] bg-[#071019]/90 px-3 py-2 backdrop-blur-xl">
          <ImageIcon size={13} className="text-cyan-400" />
          <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-cyan-300/80">
            Evidence Media
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/50 text-slate-400 transition hover:border-cyan-400/20 hover:text-cyan-300"
            title="Open original media"
          >
            <ExternalLink size={14} />
          </a>
          <a
            href={src}
            download
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/50 text-slate-400 transition hover:border-cyan-400/20 hover:text-cyan-300"
            title="Download media"
          >
            <Download size={14} />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/50 text-slate-400 transition hover:border-red-400/20 hover:text-red-300"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="relative flex max-h-[88vh] max-w-[92vw] items-center justify-center">
        <img
          src={src}
          alt="Collected X evidence"
          className="max-h-[88vh] max-w-[92vw] rounded-2xl border border-white/10 object-contain shadow-[0_30px_100px_rgba(0,0,0,0.6)]"
        />
      </div>
      <div className="absolute bottom-4 left-1/2 max-w-[80vw] -translate-x-1/2 truncate rounded-lg border border-white/[0.06] bg-black/60 px-3 py-2 font-mono text-[7px] text-slate-600 backdrop-blur-md">
        {src}
      </div>
    </div>
  );
}
/* ==========================================================================
   META ITEM
========================================================================== */
function MetaItem({
  icon,
  label,
  value,
  active = false,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.012] px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span
          className={
            active
              ? "text-emerald-400/70"
              : danger
                ? "text-red-400/70"
                : "text-slate-700"
          }
        >
          {icon}
        </span>
        <span className="font-mono text-[7px] font-medium tracking-[0.1em] text-slate-700">
          {label}
        </span>
      </div>
      <p
        className={`mt-1 font-mono text-[9px] ${
          active
            ? "text-emerald-400/80"
            : danger
              ? "text-red-300/80"
              : "text-slate-500"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
/* ==========================================================================
   LOADING
========================================================================== */
function LoadingState() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/[0.10] bg-cyan-400/[0.025]">
        <Activity size={17} className="animate-pulse text-cyan-400/60" />
      </div>
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-600">
        Initializing scraper stream
      </span>
    </div>
  );
}
/* ==========================================================================
   EMPTY
========================================================================== */
function EmptyState({ online }: { online: boolean }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/[0.08] bg-cyan-400/[0.02]">
        <Search size={18} className="text-cyan-300/50" />
      </div>
      <strong className="text-sm font-semibold text-slate-300">
        No collected posts
      </strong>
      <span className="mt-1 max-w-[300px] text-[11px] leading-relaxed text-slate-600">
        {online
          ? "The scraper is online but no matching posts have been collected yet."
          : "The social media scraper is currently unavailable."}
      </span>
      <div className="mt-4 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-700">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            online ? "bg-emerald-400" : "bg-slate-700"
          }`}
        />
        {online ? "COLLECTOR READY" : "COLLECTOR OFFLINE"}
      </div>
    </div>
  );
}
/* ==========================================================================
   HELPERS
========================================================================== */
function dedupeTweets(tweets: Tweet[]) {
  const seen = new Set<string>();
  const result: Tweet[] = [];
  for (const tweet of tweets) {
    const key =
      tweet.tweet_id ||
      `${String(tweet.id || "")}|${String(tweet.author || "")}|${String(
        tweet.text || "",
      )}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(tweet);
  }
  return result;
}
function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      ),
    ),
  );
}
/* ==========================================================================
   RISK
========================================================================== */
function getRiskLevel(score: number, level?: string) {
  const normalized = level?.toLowerCase();
  if (normalized === "critical" || score >= 85) {
    return "CRITICAL";
  }
  if (normalized === "high" || score >= 70) {
    return "HIGH";
  }
  if (normalized === "medium" || score >= 40) {
    return "MEDIUM";
  }
  return "LOW";
}
/* ==========================================================================
   TIMESTAMP
========================================================================== */
function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}
/* ==========================================================================
   FILENAME
========================================================================== */
function getFilename(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    const pathname = url.pathname;
    const filename = pathname.split("/").pop();
    return filename || "evidence-media";
  } catch {
    return "evidence-media";
  }
}
