"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Globe,
  Layers3,
  MessageSquare,
  Radar,
  Radio,
  RefreshCw,
  ScanLine,
  Server,
  ShieldAlert,
  Terminal,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import OSINTFeed from "@/components/dashboard/OSINTFeed";
import CollectorControl from "@/components/dashboard/CollectorControl";
import ScraperLiveFeed from "./ScraperLiveFeed";
import OSINTPostFeed from "./OSINTPostFeed";
/* ==========================================================================
   TYPES
========================================================================== */
interface OSINTEvent {
  id?: string | number;
  source: string;
  type: string;
  title?: string;
  address?: string;
  chain?: string;
  message?: string;
  keywords?: string[];
  wallet_addresses?: unknown[];
  risk_score?: number;
  risk_level?: string;
  time?: string;
  timestamp?: string;
}
interface OSINTResponse {
  status?: string;
  count?: number;
  events?: OSINTEvent[];
}
interface CollectorStatus {
  running?: boolean;
  status?: string;
  processed?: number;
  wallets?: number;
  images?: number;
  pdfs?: number;
  qr_codes?: number;
  qrs?: number;
  error?: string;
}
interface CollectorsResponse {
  status?: string;
  collectors?: {
    telegram?: CollectorStatus;
    website?: CollectorStatus;
    x?: CollectorStatus;
    twitter?: CollectorStatus;
  };
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
  const cleanPath = path.replace(/^\/+/, "");
  return `${API_BASE_URL}/api/${cleanPath}`;
}
/* ==========================================================================
   PERFORMANCE / SAFETY LIMITS
========================================================================== */
const POLL_INTERVAL = 10000;
const REQUEST_TIMEOUT = 12000;
const MAX_EVENTS_IN_MEMORY = 100;
const MAX_KEYWORDS_PER_EVENT = 10;
const MAX_WALLETS_PER_EVENT = 20;
/* ==========================================================================
   FETCH HELPERS
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
   EVENT NORMALIZATION
========================================================================== */
function sanitizeEvent(event: unknown): OSINTEvent | null {
  if (!event || typeof event !== "object") {
    return null;
  }
  const raw = event as Partial<OSINTEvent>;
  if (typeof raw.source !== "string" && typeof raw.type !== "string") {
    return null;
  }
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords
        .filter(
          (keyword): keyword is string =>
            typeof keyword === "string" && keyword.trim().length > 0,
        )
        .slice(0, MAX_KEYWORDS_PER_EVENT)
    : undefined;
  const walletAddresses = Array.isArray(raw.wallet_addresses)
    ? raw.wallet_addresses.slice(0, MAX_WALLETS_PER_EVENT)
    : undefined;
  return {
    id: raw.id,
    source: typeof raw.source === "string" ? raw.source : "Unknown",
    type: typeof raw.type === "string" ? raw.type : "OSINT",
    title: typeof raw.title === "string" ? raw.title : undefined,
    address: typeof raw.address === "string" ? raw.address : undefined,
    chain: typeof raw.chain === "string" ? raw.chain : undefined,
    message: typeof raw.message === "string" ? raw.message : undefined,
    keywords,
    wallet_addresses: walletAddresses,
    risk_score:
      typeof raw.risk_score === "number" && Number.isFinite(raw.risk_score)
        ? raw.risk_score
        : undefined,
    risk_level: typeof raw.risk_level === "string" ? raw.risk_level : undefined,
    time: typeof raw.time === "string" ? raw.time : undefined,
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : undefined,
  };
}
/* ==========================================================================
   EVENT DEDUPLICATION
========================================================================== */
function dedupeEvents(events: OSINTEvent[]) {
  const seen = new Set<string>();
  const result: OSINTEvent[] = [];
  for (const event of events) {
    const key = [
      event.id,
      event.source,
      event.type,
      event.address,
      event.chain,
      event.message,
      event.time || event.timestamp,
    ]
      .map((value) =>
        String(value ?? "")
          .trim()
          .toLowerCase(),
      )
      .join("|");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(event);
  }
  return result.slice(0, MAX_EVENTS_IN_MEMORY);
}
/* ==========================================================================
   NORMALIZATION HELPERS
========================================================================== */
function normalizeWallet(value: string) {
  return value.trim().toLowerCase();
}
function isCollectorActive(collector?: CollectorStatus) {
  if (!collector) {
    return false;
  }
  const status = collector.status?.toLowerCase();
  return (
    collector.running === true || status === "running" || status === "active"
  );
}
/* ==========================================================================
   MAIN WORKSPACE
========================================================================== */
export default function OSINTWorkspace() {
  const [events, setEvents] = useState<OSINTEvent[]>([]);
  const [collectorStatus, setCollectorStatus] = useState<
    CollectorsResponse["collectors"]
  >({});
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [feedOnline, setFeedOnline] = useState(false);
  const [collectorApiOnline, setCollectorApiOnline] = useState(false);
  const feedAbortRef = useRef<AbortController | null>(null);
  const statusAbortRef = useRef<AbortController | null>(null);
  const syncRunningRef = useRef(false);
  const mountedRef = useRef(false);
  const pollTimerRef = useRef<number | null>(null);
  /* ==========================================================================
     LOAD INTELLIGENCE
  ========================================================================== */
  const loadIntelligence = useCallback(async () => {
    feedAbortRef.current?.abort();
    const controller = new AbortController();
    feedAbortRef.current = controller;
    try {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }
      const endpoint = apiUrl("osint/feed");
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
        throw new Error(`OSINT feed returned ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("OSINT feed returned a non-JSON response");
      }
      const result: OSINTResponse = await response.json();
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }
      const incoming = Array.isArray(result.events)
        ? result.events
            .map(sanitizeEvent)
            .filter((event): event is OSINTEvent => event !== null)
        : [];
      const cleanedEvents = dedupeEvents(incoming);
      setEvents(cleanedEvents);
      setFeedOnline(true);
      setLastSync(new Date());
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (
        err instanceof TypeError &&
        err.message.toLowerCase().includes("aborted")
      ) {
        return;
      }
      console.error("[OSINT] Intelligence feed error:", err);
      if (mountedRef.current) {
        setFeedOnline(false);
        setError("Intelligence feed unavailable");
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);
  /* ==========================================================================
     LOAD COLLECTOR STATUS
  ========================================================================== */
  const loadCollectorStatus = useCallback(async () => {
    statusAbortRef.current?.abort();
    const controller = new AbortController();
    statusAbortRef.current = controller;
    try {
      if (mountedRef.current) {
        setStatusLoading(true);
        setStatusError(null);
      }
      const endpoint = apiUrl("collectors/status");
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
        throw new Error(`Collector status returned ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Collector status returned a non-JSON response");
      }
      const result: CollectorsResponse = await response.json();
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }
      setCollectorStatus(result.collectors || {});
      setCollectorApiOnline(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      console.error("[OSINT] Collector status error:", err);
      if (mountedRef.current) {
        setCollectorApiOnline(false);
        setStatusError("Collector status unavailable");
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setStatusLoading(false);
      }
    }
  }, []);
  /* ==========================================================================
     SYNC
  ========================================================================== */
  const syncAll = useCallback(async () => {
    if (syncRunningRef.current) {
      return;
    }
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      return;
    }
    syncRunningRef.current = true;
    try {
      await Promise.allSettled([loadIntelligence(), loadCollectorStatus()]);
    } finally {
      syncRunningRef.current = false;
    }
  }, [loadIntelligence, loadCollectorStatus]);
  /* ==========================================================================
     CONTROLLED POLLING
  ========================================================================== */
  const scheduleNextPoll = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      return;
    }
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
    }
    pollTimerRef.current = window.setTimeout(async () => {
      pollTimerRef.current = null;
      if (!mountedRef.current) {
        return;
      }
      await syncAll();
      scheduleNextPoll();
    }, POLL_INTERVAL);
  }, [syncAll]);
  /* ==========================================================================
     INITIAL LOAD + VISIBILITY
  ========================================================================== */
  useEffect(() => {
    mountedRef.current = true;
    const start = async () => {
      await syncAll();
      if (mountedRef.current) {
        scheduleNextPoll();
      }
    };
    void start();
    const handleVisibilityChange = () => {
      if (!mountedRef.current) {
        return;
      }
      if (document.visibilityState === "hidden") {
        if (pollTimerRef.current !== null) {
          window.clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        feedAbortRef.current?.abort();
        statusAbortRef.current?.abort();
        return;
      }
      void syncAll().finally(() => {
        scheduleNextPoll();
      });
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      feedAbortRef.current?.abort();
      statusAbortRef.current?.abort();
      feedAbortRef.current = null;
      statusAbortRef.current = null;
      syncRunningRef.current = false;
    };
  }, [scheduleNextPoll, syncAll]);
  /* ==========================================================================
     DERIVED INTELLIGENCE
  ========================================================================== */
  const walletEvents = useMemo(() => {
    return events.filter(
      (event) =>
        event.type?.toLowerCase() === "wallet" ||
        Boolean(event.address) ||
        Boolean(event.wallet_addresses && event.wallet_addresses.length),
    );
  }, [events]);
  const telegramEvents = useMemo(() => {
    return events.filter(
      (event) =>
        event.type?.toLowerCase() === "telegram" ||
        event.source?.toLowerCase() === "telegram",
    );
  }, [events]);
  const highRiskEvents = useMemo(() => {
    return events.filter((event) => Number(event.risk_score || 0) >= 70);
  }, [events]);
  /* ==========================================================================
     UNIQUE WALLETS
  ========================================================================== */
  const uniqueWallets = useMemo(() => {
    const wallets = new Set<string>();
    for (const event of events) {
      if (typeof event.address === "string" && event.address.trim()) {
        wallets.add(normalizeWallet(event.address));
      }
      if (Array.isArray(event.wallet_addresses)) {
        for (const address of event.wallet_addresses) {
          if (typeof address === "string" && address.trim()) {
            wallets.add(normalizeWallet(address));
          }
        }
      }
    }
    return wallets.size;
  }, [events]);
  /* ==========================================================================
     ACTIVE COLLECTORS
  ========================================================================== */
  const activeSourceCount = useMemo(() => {
    return Object.values(collectorStatus || {}).filter((collector) =>
      isCollectorActive(collector),
    ).length;
  }, [collectorStatus]);
  /* ==========================================================================
     FEED DATA
  ========================================================================== */
  const feeds = useMemo(() => {
    return events.map((item) => {
      const address =
        typeof item.address === "string" ? item.address : undefined;
      const type = item.type?.toLowerCase() || "osint";
      let message = "OSINT event";
      if (type === "telegram") {
        message = item.message || "Telegram intelligence event";
      } else if (address) {
        const shortened =
          address.length > 18 ? `${address.slice(0, 14)}...` : address;
        message = `${shortened} detected on ${item.chain || "unknown chain"}`;
      } else if (item.message) {
        message = item.message;
      }
      return {
        source: item.source || "Unknown",
        message,
        risk: item.risk_level || "LOW",
        type: item.type || "OSINT",
        risk_score: item.risk_score,
        address,
        chain: item.chain,
        keywords: item.keywords,
        time: item.time || item.timestamp,
      };
    });
  }, [events]);
  /* ==========================================================================
     TOTAL PROCESSED
  ========================================================================== */
  const totalProcessed = useMemo(() => {
    return Object.values(collectorStatus || {}).reduce(
      (total, collector) => total + Number(collector?.processed || 0),
      0,
    );
  }, [collectorStatus]);
  /* ==========================================================================
     COLLECTOR STATES
  ========================================================================== */
  const telegramActive = isCollectorActive(collectorStatus?.telegram);
  const websiteActive = isCollectorActive(collectorStatus?.website);
  const xActive = isCollectorActive(
    collectorStatus?.x || collectorStatus?.twitter,
  );
  const systemOperational = feedOnline && collectorApiOnline;
  /* ==========================================================================
     SOURCE MATRIX
  ========================================================================== */
  const sourceMatrix = useMemo(
    () => [
      {
        key: "telegram",
        name: "TELEGRAM",
        detail: "CHAT INTELLIGENCE",
        active: telegramActive,
        count: telegramEvents.length,
      },
      {
        key: "website",
        name: "WEB",
        detail: "WEBSITE OSINT",
        active: websiteActive,
        count: Number(collectorStatus?.website?.processed || 0),
      },
      {
        key: "x",
        name: "X / TWITTER",
        detail: "SOCIAL SIGNALS",
        active: xActive,
        count: Number(
          (collectorStatus?.x || collectorStatus?.twitter)?.processed || 0,
        ),
      },
    ],
    [
      collectorStatus,
      telegramActive,
      telegramEvents.length,
      websiteActive,
      xActive,
    ],
  );
  /* ==========================================================================
     RENDER
  ========================================================================== */
  return (
    <div className="min-h-full bg-[#05070b] pb-16 text-slate-200">
      <div className="space-y-4">
        {/* ================================================================
            COMMAND HEADER
        ================================================================= */}
        <section className="relative overflow-hidden border border-white/[0.08] bg-[#070b11]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-[-140px] top-[-180px] h-[420px] w-[420px] rounded-full bg-cyan-500/[0.045] blur-[130px]" />
            <div className="absolute bottom-[-200px] left-[40%] h-[340px] w-[340px] rounded-full bg-violet-500/[0.018] blur-[120px]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
          </div>
          <div className="relative px-5 py-6 lg:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center border border-cyan-400/20 bg-cyan-400/[0.05]">
                  <Radar
                    size={23}
                    strokeWidth={1.5}
                    className="text-cyan-300"
                  />
                  <span
                    className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${
                      activeSourceCount > 0
                        ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]"
                        : "bg-slate-600"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[9px] font-semibold tracking-[0.18em] text-cyan-300">
                      GATEKEEPER
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className="font-mono text-[9px] tracking-[0.15em] text-slate-400">
                      OSINT COLLECTION
                    </span>
                    <span className="text-slate-600">/</span>
                    <span
                      className={`flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.12em] ${
                        systemOperational
                          ? "text-emerald-300"
                          : "text-amber-300"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          systemOperational
                            ? "animate-pulse bg-emerald-400"
                            : "bg-amber-400"
                        }`}
                      />
                      {systemOperational ? "NOMINAL" : "DEGRADED"}
                    </span>
                  </div>
                  <h1 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white lg:text-2xl">
                    Intelligence Center
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-slate-400">
                    Unified OSINT collection, wallet discovery, correlation and
                    evidence monitoring.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <HeaderStat label="POLL" value="10s" />
                <HeaderStat
                  label="SOURCES"
                  value={String(activeSourceCount)}
                  active={activeSourceCount > 0}
                />
                <HeaderStat
                  label="EVENTS"
                  value={events.length.toLocaleString()}
                />
                <button
                  type="button"
                  onClick={() => void syncAll()}
                  disabled={loading || statusLoading || syncRunningRef.current}
                  className="flex h-10 items-center gap-2 border border-cyan-400/25 bg-cyan-400/[0.07] px-4 font-mono text-[9px] font-semibold tracking-[0.1em] text-cyan-200 transition hover:border-cyan-300/45 hover:bg-cyan-400/[0.11] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RefreshCw
                    size={13}
                    className={loading || statusLoading ? "animate-spin" : ""}
                  />
                  {loading || statusLoading ? "SYNCING" : "SYNC"}
                </button>
              </div>
            </div>
          </div>
          <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.06] bg-black/10 px-5 py-2.5 lg:px-6">
            <TelemetryTag icon={<Database size={11} />} label="COLLECTION" />
            <TelemetryTag icon={<Radio size={11} />} label="LIVE MONITORING" />
            <TelemetryTag icon={<Zap size={11} />} label="CORRELATION" />
            <TelemetryTag
              icon={<ScanLine size={11} />}
              label="EVIDENCE PROCESSING"
            />
            <span className="ml-auto hidden font-mono text-[8px] tracking-[0.15em] text-slate-500 md:block">
              COMMAND // OSINT // 01
            </span>
          </div>
        </section>
        {/* ================================================================
            API HEALTH MATRIX
        ================================================================= */}
        <section className="grid gap-px overflow-hidden border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2">
          <ApiHealth
            label="INTELLIGENCE FEED API"
            online={feedOnline}
            endpoint="/api/osint/feed"
            error={error}
          />
          <ApiHealth
            label="COLLECTOR STATUS API"
            online={collectorApiOnline}
            endpoint="/api/collectors/status"
            error={statusError}
          />
        </section>
        {/* ================================================================
            PRIMARY METRICS
        ================================================================= */}
        <section className="grid gap-px overflow-hidden border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 xl:grid-cols-4">
          <IntelMetric
            icon={<Wallet size={17} />}
            label="Wallet Signals"
            value={uniqueWallets}
            description="Unique addresses correlated"
            accent="cyan"
          />
          <IntelMetric
            icon={<MessageSquare size={17} />}
            label="Telegram Events"
            value={telegramEvents.length}
            description="Collected intelligence events"
            accent="blue"
          />
          <IntelMetric
            icon={<ShieldAlert size={17} />}
            label="High Risk"
            value={highRiskEvents.length}
            description="Risk score ≥ 70"
            accent="red"
            alert={highRiskEvents.length > 0}
          />
          <IntelMetric
            icon={<Globe size={17} />}
            label="Active Sources"
            value={activeSourceCount}
            description={
              activeSourceCount > 0
                ? `${activeSourceCount} channels online`
                : "No collectors running"
            }
            accent="emerald"
          />
        </section>
        {/* ================================================================
            COLLECTION CONTROL
        ================================================================= */}
        <CollectorControl />
        {/* ================================================================
            OPERATIONAL SOURCE MATRIX
        ================================================================= */}
        <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          {/* COLLECTION OVERVIEW */}
          <div className="border border-white/[0.08] bg-[#070c12]">
            <PanelHeader
              icon={<Activity size={14} />}
              title="Collection Overview"
              subtitle="Operational intelligence distribution"
              status={systemOperational ? "NOMINAL" : "DEGRADED"}
              statusTone={systemOperational ? "emerald" : "amber"}
            />
            <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
              <OverviewItem
                label="Events"
                value={events.length}
                icon={<Activity size={13} />}
              />
              <OverviewItem
                label="Wallets"
                value={uniqueWallets}
                icon={<Wallet size={13} />}
              />
              <OverviewItem
                label="Processed"
                value={totalProcessed}
                icon={<Database size={13} />}
              />
            </div>
            <div className="border-t border-white/[0.06] px-5 py-4">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-slate-400">
                  Collection load
                </span>
                <span className="font-mono text-[9px] font-semibold text-cyan-300">
                  {events.length} EVENTS
                </span>
              </div>
              <div className="h-1.5 overflow-hidden bg-white/[0.06]">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500/90 to-blue-500/80 transition-all duration-700"
                  style={{
                    width:
                      events.length === 0
                        ? "0%"
                        : `${Math.min(Math.max(events.length * 5, 5), 100)}%`,
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[8px] text-slate-500">
                <span>0</span>
                <span>20</span>
                <span>40</span>
                <span>60</span>
                <span>80</span>
                <span>100+</span>
              </div>
            </div>
          </div>
          {/* SOURCE MATRIX */}
          <div className="border border-white/[0.08] bg-[#070c12]">
            <PanelHeader
              icon={<Globe size={14} />}
              title="Source Matrix"
              subtitle="Collection channel state"
              status={`${activeSourceCount}/3 ACTIVE`}
              statusTone={activeSourceCount > 0 ? "emerald" : "slate"}
            />
            <div className="divide-y divide-white/[0.05]">
              {sourceMatrix.map((source) => (
                <SourceMatrixRow
                  key={source.key}
                  name={source.name}
                  detail={source.detail}
                  active={source.active}
                  count={source.count}
                />
              ))}
            </div>
          </div>
        </section>
        {/* ================================================================
            SYSTEM TELEMETRY
        ================================================================= */}
        <section className="grid gap-px overflow-hidden border border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
          <SystemTelemetry
            icon={<Server size={13} />}
            label="BACKEND"
            value={collectorApiOnline ? "OPERATIONAL" : "UNAVAILABLE"}
            active={collectorApiOnline}
          />
          <SystemTelemetry
            icon={<Wifi size={13} />}
            label="INTELLIGENCE STREAM"
            value={feedOnline ? "CONNECTED" : "DISCONNECTED"}
            active={feedOnline}
          />
          <SystemTelemetry
            icon={<Terminal size={13} />}
            label="SYSTEM STATE"
            value={systemOperational ? "NOMINAL" : "DEGRADED"}
            active={systemOperational}
          />
        </section>
        {/* ================================================================
            LIVE INTELLIGENCE STREAM
        ================================================================= */}
        <section className="relative overflow-hidden border border-white/[0.08] bg-[#070c12]">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 bg-cyan-400/[0.018] blur-[90px]" />
          <div className="relative flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-8 w-8 items-center justify-center border border-cyan-400/20 bg-cyan-400/[0.05]">
                <Radio size={14} className="text-cyan-300" />
                {activeSourceCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">
                    Live Intelligence Stream
                  </h2>
                  <span className="font-mono text-[8px] text-slate-500">
                    STREAM-01
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">
                  Collection and correlation events
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 font-mono text-[8px] text-slate-400">
                {events.length} EVENTS
              </span>
              <span
                className={`flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[8px] font-semibold tracking-[0.08em] ${
                  activeSourceCount > 0
                    ? "border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-300"
                    : "border-white/[0.07] bg-white/[0.02] text-slate-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    activeSourceCount > 0
                      ? "animate-pulse bg-emerald-400"
                      : "bg-slate-600"
                  }`}
                />
                {activeSourceCount > 0 ? "STREAM ACTIVE" : "STANDBY"}
              </span>
            </div>
          </div>
          {error && (
            <div className="mx-4 mt-3 flex items-start gap-3 border border-red-400/15 bg-red-400/[0.035] px-4 py-3">
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0 text-red-400"
              />
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-red-300">
                  Feed Error
                </p>
                <p className="mt-1 text-[10px] leading-4 text-red-200/80">
                  {error}
                </p>
              </div>
            </div>
          )}
          <div className="relative p-3 lg:p-4">
            <OSINTFeed feeds={feeds} />
          </div>
          <div className="flex flex-col gap-2 border-t border-white/[0.06] px-5 py-3 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              LAST SYNC {lastSync ? lastSync.toLocaleTimeString() : "--:--:--"}
            </span>
            <span className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  activeSourceCount > 0 ? "bg-emerald-500" : "bg-slate-700"
                }`}
              />
              {activeSourceCount} ACTIVE SOURCE
              {activeSourceCount === 1 ? "" : "S"}
            </span>
          </div>
        </section>
        {/* ================================================================
            INTELLIGENCE POSTS / EVIDENCE
        ================================================================= */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers3 size={14} className="text-cyan-300" />
                <h2 className="text-sm font-semibold text-white">
                  Intelligence Posts
                </h2>
                <span className="font-mono text-[8px] text-slate-500">
                  EVIDENCE
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">
                Source content, media, wallets, entities and risk correlation.
              </p>
            </div>
            <span className="hidden font-mono text-[8px] uppercase tracking-[0.14em] text-slate-500 sm:block">
              EVIDENCE // CORRELATION
            </span>
          </div>
          <OSINTPostFeed />
        </section>
        {/* ================================================================
            SCRAPER SUBSYSTEM
        ================================================================= */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center border border-violet-400/20 bg-violet-400/[0.05]">
                <ScanLine size={14} className="text-violet-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">
                    Collection Scraper
                  </h2>
                  <span className="font-mono text-[8px] text-slate-500">
                    INGESTION-01
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">
                  Active scraper telemetry and ingestion activity.
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 font-mono text-[8px] uppercase tracking-[0.13em] text-slate-500 sm:flex">
              <span className="h-1 w-1 rounded-full bg-violet-400/70" />
              SCRAPER TELEMETRY
            </div>
          </div>
          <div className="border-l border-violet-400/15 pl-3">
            <ScraperLiveFeed />
          </div>
        </section>
      </div>
    </div>
  );
}
/* ==========================================================================
   TELEMETRY TAG
========================================================================== */
function TelemetryTag({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.11em] text-slate-400">
      <span className="text-cyan-400">{icon}</span>
      {label}
    </span>
  );
}
/* ==========================================================================
   HEADER STAT
========================================================================== */
function HeaderStat({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="hidden min-w-[68px] border border-white/[0.08] bg-white/[0.02] px-3 py-2 sm:block">
      <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-[11px] font-semibold ${
          active ? "text-emerald-300" : "text-slate-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
/* ==========================================================================
   PANEL HEADER
========================================================================== */
function PanelHeader({
  icon,
  title,
  subtitle,
  status,
  statusTone,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  status?: string;
  statusTone?: "emerald" | "amber" | "slate";
}) {
  const statusStyles = {
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    slate: "text-slate-400",
  };
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center border border-cyan-400/20 bg-cyan-400/[0.05]">
          <span className="text-cyan-300">{icon}</span>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.11em] text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>
      {status && (
        <span
          className={`font-mono text-[9px] font-semibold tracking-[0.08em] ${
            statusTone ? statusStyles[statusTone] : "text-slate-400"
          }`}
        >
          {status}
        </span>
      )}
    </div>
  );
}
/* ==========================================================================
   API HEALTH
========================================================================== */
function ApiHealth({
  label,
  online,
  endpoint,
  error,
}: {
  label: string;
  online: boolean;
  endpoint: string;
  error: string | null;
}) {
  return (
    <div
      className={`relative overflow-hidden px-4 py-3 ${
        online ? "bg-[#07100e]" : "bg-[#10090b]"
      }`}
    >
      <div
        className={`absolute bottom-0 left-0 top-0 w-px ${
          online ? "bg-emerald-400/60" : "bg-red-400/60"
        }`}
      />
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              online
                ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                : "bg-red-400"
            }`}
          />
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-semibold tracking-[0.11em] text-slate-300">
              {label}
            </p>
            <p className="mt-1 truncate font-mono text-[8px] text-slate-500">
              {endpoint}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 font-mono text-[9px] font-bold tracking-[0.1em] ${
            online ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {online ? "ONLINE" : "OFFLINE"}
        </span>
      </div>
      {!online && error && (
        <p className="mt-2 border-t border-red-400/[0.1] pt-2 text-[9px] leading-4 text-red-200/80">
          {error}
        </p>
      )}
    </div>
  );
}
/* ==========================================================================
   SYSTEM TELEMETRY
========================================================================== */
function SystemTelemetry({
  icon,
  label,
  value,
  active,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between bg-[#070c12] px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-7 w-7 items-center justify-center border ${
            active
              ? "border-emerald-400/15 bg-emerald-400/[0.035] text-emerald-300"
              : "border-white/[0.07] bg-white/[0.02] text-slate-500"
          }`}
        >
          {icon}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {active ? (
          <CheckCircle2 size={11} className="text-emerald-300" />
        ) : (
          <AlertTriangle size={11} className="text-amber-300" />
        )}
        <span
          className={`font-mono text-[9px] font-semibold tracking-[0.08em] ${
            active ? "text-emerald-300" : "text-amber-300"
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
/* ==========================================================================
   METRIC CARD
========================================================================== */
function IntelMetric({
  icon,
  label,
  value,
  description,
  accent,
  alert = false,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  description: string;
  accent: "cyan" | "blue" | "red" | "emerald";
  alert?: boolean;
}) {
  const styles = {
    cyan: {
      icon: "border-cyan-400/20 bg-cyan-400/[0.05] text-cyan-300",
      value: "text-cyan-200",
      line: "bg-cyan-400",
    },
    blue: {
      icon: "border-blue-400/20 bg-blue-400/[0.05] text-blue-300",
      value: "text-blue-200",
      line: "bg-blue-400",
    },
    red: {
      icon: "border-red-400/20 bg-red-400/[0.05] text-red-300",
      value: "text-red-200",
      line: "bg-red-400",
    },
    emerald: {
      icon: "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-300",
      value: "text-emerald-200",
      line: "bg-emerald-400",
    },
  };
  const style = styles[accent];
  return (
    <div
      className={`group relative overflow-hidden bg-[#070c12] px-4 py-4 transition-colors hover:bg-[#091019] ${
        alert ? "bg-[#0d0b10]" : ""
      }`}
    >
      {alert && (
        <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 bg-red-500/[0.04] blur-3xl" />
      )}
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-8 w-8 items-center justify-center border ${style.icon}`}
        >
          {icon}
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.11em] text-slate-500">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              alert ? "animate-pulse bg-red-400" : "bg-slate-600"
            }`}
          />
          SIGNAL
        </span>
      </div>
      <div className="relative mt-4">
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
        <div className="mt-1 flex items-baseline">
          <span
            className={`font-mono text-[25px] font-bold tracking-tight ${style.value}`}
          >
            {value}
          </span>
        </div>
        <p className="mt-1 text-[10px] leading-4 text-slate-400">
          {description}
        </p>
      </div>
      <div
        className={`absolute bottom-0 left-0 h-px w-0 ${style.line} opacity-50 transition-all duration-300 group-hover:w-full`}
      />
    </div>
  );
}
/* ==========================================================================
   OVERVIEW ITEM
========================================================================== */
function OverviewItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="bg-white/[0.012] px-4 py-4 transition-colors hover:bg-white/[0.022]">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="font-mono text-[8px] uppercase tracking-[0.11em]">
          {label}
        </span>
      </div>
      <p className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-100">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
/* ==========================================================================
   SOURCE MATRIX ROW
========================================================================== */
function SourceMatrixRow({
  name,
  detail,
  active,
  count,
}: {
  name: string;
  detail: string;
  active: boolean;
  count: number;
}) {
  return (
    <div className="group flex items-center justify-between bg-[#070c12] px-4 py-3.5 transition-colors hover:bg-[#091019]">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`relative h-2 w-2 shrink-0 rounded-full ${
            active
              ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
              : "bg-slate-600"
          }`}
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-200">{name}</p>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-400">
            {detail}
          </p>
        </div>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-3">
        <span className="font-mono text-[9px] text-slate-300">
          {Number(count || 0).toLocaleString()}
        </span>
        <span
          className={`min-w-[46px] text-right font-mono text-[8px] font-bold uppercase tracking-[0.08em] ${
            active ? "text-emerald-300" : "text-slate-500"
          }`}
        >
          {active ? "ACTIVE" : "IDLE"}
        </span>
      </div>
    </div>
  );
}
/* ==========================================================================
   SOURCE STATUS
========================================================================== */
function SourceStatus({
  name,
  active,
  value,
}: {
  name: string;
  active: boolean;
  value: number;
}) {
  return (
    <div className="group flex items-center justify-between bg-[#070c12] px-4 py-3.5 transition-colors hover:bg-[#091019]">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`relative h-2 w-2 shrink-0 rounded-full ${
            active
              ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
              : "bg-slate-600"
          }`}
        />
        <span className="truncate text-[10px] font-medium text-slate-300">
          {name}
        </span>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-3">
        <span className="font-mono text-[9px] text-slate-300">
          {Number(value || 0).toLocaleString()}
        </span>
        <span
          className={`min-w-[48px] text-right font-mono text-[8px] font-bold uppercase tracking-[0.08em] ${
            active ? "text-emerald-300" : "text-slate-500"
          }`}
        >
          {active ? "ACTIVE" : "IDLE"}
        </span>
      </div>
    </div>
  );
}
