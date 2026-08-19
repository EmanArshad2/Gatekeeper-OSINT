"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Play,
  Square,
  Radio,
  Globe,
  Image,
  FileText,
  QrCode,
  Wallet,
  Activity,
  RefreshCw,
  Plus,
  X,
  AlertTriangle,
  Search,
  ScanLine,
  Database,
  Clock3,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Layers3,
  Cpu,
  Settings2,
  Save,
  SlidersHorizontal,
  MessageSquare,
  Radar,
  Network,
  Target,
  ShieldCheck,
} from "lucide-react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
/* ============================================================
   TYPES
============================================================ */
interface CollectorStatus {
  running: boolean;
  processed: number;
  wallets: number;
  images: number;
  pdfs: number;
  qrs: number;
  error?: string;
  status?: string;
  /* Telegram public OSINT metrics */
  channels?: number;
  scanned?: number;
  messages?: number;
  sources?: number;
  intelligence?: number;
  skipped?: number;
}
interface CollectorResponse {
  status: string;
  collectors?: {
    telegram?: CollectorStatus;
    website?: CollectorStatus;
    twitter?: CollectorStatus;
    x?: CollectorStatus;
  };
}
interface WebsiteSource {
  id: number;
  url: string;
  active: boolean;
  last_crawled_at: string | null;
}
interface XSearchConfig {
  keywords: string[];
  since: string | null;
  until: string | null;
  limit: number;
  display_type: string;
}
interface XSearchConfigResponse {
  status: string;
  config?: XSearchConfig;
  message?: string;
}
interface KeywordsResponse {
  status: string;
  keywords?: string[];
  message?: string;
}
/* ============================================================
   DEFAULTS
============================================================ */
const DEFAULT_STATUS: CollectorStatus = {
  running: false,
  processed: 0,
  wallets: 0,
  images: 0,
  pdfs: 0,
  qrs: 0,
};
const DEFAULT_X_CONFIG: XSearchConfig = {
  keywords: [],
  since: null,
  until: null,
  limit: 20,
  display_type: "Latest",
};
/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function CollectorControl() {
  const [telegramStatus, setTelegramStatus] =
    useState<CollectorStatus>(DEFAULT_STATUS);
  const [websiteStatus, setWebsiteStatus] =
    useState<CollectorStatus>(DEFAULT_STATUS);
  const [twitterStatus, setTwitterStatus] =
    useState<CollectorStatus>(DEFAULT_STATUS);
  const [sources, setSources] = useState<WebsiteSource[]>([]);
  const [xSearchConfig, setXSearchConfig] =
    useState<XSearchConfig>(DEFAULT_X_CONFIG);
  const [intelligenceKeywords, setIntelligenceKeywords] = useState<string[]>(
    [],
  );
  const [newUrl, setNewUrl] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSynced, setConfigSynced] = useState(true);
  const [expanded, setExpanded] = useState<
    "telegram" | "website" | "twitter" | null
  >(null);
  /* ============================================================
     LOAD COLLECTOR STATUS
  ============================================================ */
  async function loadStatus() {
    try {
      const url = `${API}/collectors/status`;
      console.log("COLLECTOR STATUS URL:", url);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
      console.log("COLLECTOR STATUS RESPONSE:", response.status, response.url);
      if (!response.ok) {
        throw new Error(`Status request failed: ${response.status}`);
      }
      const data: CollectorResponse = await response.json();
      setTelegramStatus(data.collectors?.telegram ?? DEFAULT_STATUS);
      setWebsiteStatus(data.collectors?.website ?? DEFAULT_STATUS);
      setTwitterStatus(
        data.collectors?.twitter ?? data.collectors?.x ?? DEFAULT_STATUS,
      );
      setLastRefresh(new Date());
      setError("");
    } catch (err) {
      console.error("Collector status error:", err);
      setError("Unable to connect to the collector service.");
    }
  }
  /* ============================================================
     LOAD BACKEND INTELLIGENCE KEYWORDS
  ============================================================ */
  async function loadIntelligenceKeywords() {
    try {
      const response = await fetch(`${API}/keywords`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Keyword request failed: ${response.status}`);
      }
      const data: KeywordsResponse = await response.json();
      if (data.status !== "SUCCESS" || !Array.isArray(data.keywords)) {
        throw new Error(data.message || "Invalid keyword response.");
      }
      setIntelligenceKeywords(data.keywords);
    } catch (err) {
      console.error("Failed to load intelligence keywords:", err);
    }
  }
  /* ============================================================
     APPLY BACKEND KEYWORDS TO X SEARCH
  ============================================================ */
  function applyIntelligenceKeywords() {
    if (intelligenceKeywords.length === 0) {
      setError("No intelligence keywords were returned by the backend.");
      return;
    }
    setXSearchConfig((current) => ({
      ...current,
      keywords: [...intelligenceKeywords],
    }));
    setConfigSynced(false);
    setError("");
  }
  /* ============================================================
     LOAD WEBSITE SOURCES
  ============================================================ */
  async function loadSources() {
    try {
      const response = await fetch(`${API}/collectors/website/sources`, {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setSources(data.sources ?? []);
    } catch (err) {
      console.error("Failed to load website sources:", err);
    }
  }
  /* ============================================================
     LOAD X SEARCH CONFIG
  ============================================================ */
  async function loadXSearchConfig() {
    try {
      const response = await fetch(`${API}/tweets/search-config`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Search config request failed: ${response.status}`);
      }
      const data: XSearchConfigResponse = await response.json();
      if (data.status !== "SUCCESS" || !data.config) {
        throw new Error(data.message || "Invalid search configuration.");
      }
      setXSearchConfig({
        keywords: data.config.keywords ?? [],
        since: data.config.since ?? null,
        until: data.config.until ?? null,
        limit: data.config.limit ?? 20,
        display_type: data.config.display_type ?? "Latest",
      });
      setConfigSynced(true);
    } catch (err) {
      console.error("Failed to load X search configuration:", err);
      setConfigSynced(false);
    }
  }
  /* ============================================================
     SAVE X SEARCH CONFIG
  ============================================================ */
  async function saveXSearchConfig() {
    const keywords = xSearchConfig.keywords
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    if (keywords.length === 0) {
      setError("At least one X search keyword is required.");
      return;
    }
    if (
      xSearchConfig.since &&
      xSearchConfig.until &&
      xSearchConfig.since > xSearchConfig.until
    ) {
      setError("Since date cannot be after until date.");
      return;
    }
    try {
      setConfigSaving(true);
      setError("");
      setConfigSynced(false);
      const response = await fetch(`${API}/tweets/search-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          keywords,
          since: xSearchConfig.since || null,
          until: xSearchConfig.until || null,
          limit: xSearchConfig.limit,
          display_type: xSearchConfig.display_type,
        }),
      });
      const data: XSearchConfigResponse = await response.json();
      if (!response.ok || data.status !== "SUCCESS") {
        throw new Error(
          data.message || "Failed to update X search configuration.",
        );
      }
      if (data.config) {
        setXSearchConfig(data.config);
      }
      setConfigSynced(true);
    } catch (err) {
      console.error("X search configuration error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update X search configuration.",
      );
      setConfigSynced(false);
    } finally {
      setConfigSaving(false);
    }
  }
  /* ============================================================
     ADD X SEARCH KEYWORD
  ============================================================ */
  function addKeyword() {
    const keyword = newKeyword.trim();
    if (!keyword) {
      return;
    }
    const exists = xSearchConfig.keywords.some(
      (item) => item.toLowerCase() === keyword.toLowerCase(),
    );
    if (exists) {
      setNewKeyword("");
      return;
    }
    setXSearchConfig((current) => ({
      ...current,
      keywords: [...current.keywords, keyword],
    }));
    setConfigSynced(false);
    setNewKeyword("");
  }
  /* ============================================================
     REMOVE X SEARCH KEYWORD
  ============================================================ */
  function removeKeyword(keyword: string) {
    setXSearchConfig((current) => ({
      ...current,
      keywords: current.keywords.filter((item) => item !== keyword),
    }));
    setConfigSynced(false);
  }
  /* ============================================================
     UPDATE X CONFIG FIELD
  ============================================================ */
  function updateXConfig(
    field: keyof XSearchConfig,
    value: string | number | null,
  ) {
    setXSearchConfig((current) => ({
      ...current,
      [field]: value,
    }));
    setConfigSynced(false);
  }
  /* ============================================================
     TOGGLE COLLECTOR
  ============================================================ */
  async function toggleCollector(
    name: "telegram" | "website" | "twitter",
    running: boolean,
  ) {
    try {
      setLoading(name);
      setError("");
      const action = running ? "stop" : "start";
      const response = await fetch(`${API}/collectors/${action}/${name}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`${action} request failed: ${response.status}`);
      }
      await loadStatus();
    } catch (err) {
      console.error(`${name} toggle error:`, err);
      setError(`Failed to ${running ? "stop" : "start"} ${name} collector.`);
    } finally {
      setLoading(null);
    }
  }
  /* ============================================================
     ADD WEBSITE SOURCE
  ============================================================ */
  async function addSource() {
    if (!newUrl.trim()) {
      return;
    }
    try {
      setLoading("add-source");
      setError("");
      const response = await fetch(`${API}/collectors/website/sources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: newUrl.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? "Failed to add source.");
      }
      setNewUrl("");
      await loadSources();
    } catch (err) {
      console.error("Add source error:", err);
      setError(err instanceof Error ? err.message : "Failed to add source.");
    } finally {
      setLoading(null);
    }
  }
  /* ============================================================
     REMOVE WEBSITE SOURCE
  ============================================================ */
  async function removeSource(id: number) {
    try {
      const response = await fetch(`${API}/collectors/website/sources/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Failed to remove source: ${response.status}`);
      }
      await loadSources();
    } catch (err) {
      console.error("Remove source error:", err);
      setError("Failed to remove website source.");
    }
  }
  /* ============================================================
     INITIAL LOAD + POLLING
  ============================================================ */
  useEffect(() => {
    loadStatus();
    loadSources();
    loadIntelligenceKeywords();
    loadXSearchConfig();
    const interval = setInterval(() => {
      loadStatus();
      loadIntelligenceKeywords();
      loadXSearchConfig();
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  /* ============================================================
     SUMMARY METRICS
  ============================================================ */
  const totalProcessed = useMemo(() => {
    return (
      telegramStatus.processed +
      websiteStatus.processed +
      twitterStatus.processed
    );
  }, [
    telegramStatus.processed,
    websiteStatus.processed,
    twitterStatus.processed,
  ]);
  const totalWallets = useMemo(() => {
    return (
      telegramStatus.wallets + websiteStatus.wallets + twitterStatus.wallets
    );
  }, [telegramStatus.wallets, websiteStatus.wallets, twitterStatus.wallets]);
  const activeCollectors = useMemo(() => {
    return [
      telegramStatus.running,
      websiteStatus.running,
      twitterStatus.running,
    ].filter(Boolean).length;
  }, [telegramStatus.running, websiteStatus.running, twitterStatus.running]);
  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="space-y-6 text-slate-200">
      {/* ======================================================
          COLLECTION LAYER SUMMARY
      ====================================================== */}
      <section className="relative overflow-hidden rounded-xl border border-cyan-400/10 bg-[#070b12]/95">
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-cyan-400/[0.035] blur-[110px]" />
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers3 size={17} className="text-cyan-400" />
                <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-cyan-300">
                  COLLECTION ORCHESTRATOR
                </span>
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-100">
                Intelligence Collection Layer
              </h2>
              <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-slate-400">
                Control and monitor the collection nodes responsible for
                acquiring OSINT data, extracting intelligence, detecting wallet
                addresses and forwarding results into Gatekeeper.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SummaryStat
                label="ACTIVE"
                value={activeCollectors}
                active={activeCollectors > 0}
              />
              <SummaryStat label="PROCESSED" value={totalProcessed} />
              <SummaryStat label="WALLETS" value={totalWallets} />
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-4">
            <PipelineStep icon={<Search size={14} />} label="COLLECT" />
            <PipelineStep icon={<ScanLine size={14} />} label="EXTRACT" />
            <PipelineStep icon={<Wallet size={14} />} label="DETECT" />
            <PipelineStep icon={<Database size={14} />} label="INGEST" />
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Clock3 size={12} className="text-slate-500" />
              <span className="font-mono text-[10px] text-slate-400">
                STATUS POLLING: 5 SEC
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              LAST CHECK{" "}
              {lastRefresh ? lastRefresh.toLocaleTimeString() : "--:--:--"}
            </span>
          </div>
        </div>
      </section>
      {/* ======================================================
          TELEGRAM PUBLIC OSINT
      ====================================================== */}
      <CollectorCard
        icon={<Radio size={21} strokeWidth={1.7} />}
        label="COLLECTION NODE / 01"
        title="Public Telegram OSINT Collector"
        description="Monitors configured public Telegram channels, scans recent message history, processes matching text and media, extracts wallet intelligence and persists qualified findings into Gatekeeper."
        channelLabel="TELEGRAM PUBLIC OSINT CHANNEL"
        status={telegramStatus}
        loading={loading === "telegram"}
        expanded={expanded === "telegram"}
        onExpand={() =>
          setExpanded(expanded === "telegram" ? null : "telegram")
        }
        onToggle={() => toggleCollector("telegram", telegramStatus.running)}
        onRefresh={loadStatus}
      >
        <div className="rounded-lg border border-cyan-400/[0.08] bg-cyan-400/[0.018] p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Radar size={13} className="text-cyan-400" />
              <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-300">
                PUBLIC OSINT DISCOVERY
              </span>
            </div>
            <span className="w-fit rounded-md border border-cyan-400/10 bg-cyan-400/[0.035] px-2 py-1 font-mono text-[9px] text-cyan-300">
              CHANNEL HISTORY MODE
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <TelegramMetric
              label="CHANNELS"
              value={telegramStatus.channels ?? 0}
            />
            <TelegramMetric
              label="SCANNED"
              value={telegramStatus.scanned ?? telegramStatus.processed ?? 0}
            />
            <TelegramMetric
              label="MESSAGES"
              value={telegramStatus.messages ?? 0}
            />
            <TelegramMetric
              label="SOURCES"
              value={telegramStatus.sources ?? 0}
            />
            <TelegramMetric
              label="INTEL"
              value={telegramStatus.intelligence ?? 0}
            />
            <TelegramMetric label="WALLETS" value={telegramStatus.wallets} />
            <TelegramMetric
              label="SKIPPED"
              value={telegramStatus.skipped ?? 0}
            />
            <TelegramMetric
              label="ERRORS"
              value={telegramStatus.error ? 1 : 0}
              danger={Boolean(telegramStatus.error)}
            />
          </div>
        </div>
        <CollectorCapabilities
          items={[
            {
              icon: <Globe size={14} />,
              title: "Public Channel Resolution",
              description:
                "Resolves configured public Telegram usernames through the Telegram API.",
              done: true,
            },
            {
              icon: <MessageSquare size={14} />,
              title: "Channel History Scanning",
              description:
                "Inspects recent messages from configured public channels.",
              done: true,
            },
            {
              icon: <Search size={14} />,
              title: "Keyword Intelligence",
              description:
                "Filters and analyzes messages using Gatekeeper keywords.",
              done: true,
            },
            {
              icon: <Image size={14} />,
              title: "OCR / Media Processing",
              description:
                "Processes qualifying media for additional intelligence.",
              done: true,
            },
            {
              icon: <QrCode size={14} />,
              title: "QR Intelligence",
              description:
                "Media can be processed through the existing QR pipeline.",
              done: true,
            },
            {
              icon: <Wallet size={14} />,
              title: "Wallet Extraction",
              description:
                "Identifies wallet addresses from discovered intelligence.",
              done: true,
            },
            {
              icon: <ShieldCheck size={14} />,
              title: "Intelligence Validation",
              description:
                "Only messages containing relevant intelligence are persisted.",
              done: true,
            },
            {
              icon: <Database size={14} />,
              title: "Gatekeeper Persistence",
              description:
                "Qualified findings are saved through the existing intelligence pipeline.",
              done: true,
            },
          ]}
        />
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Settings2 size={13} className="text-cyan-400" />
            <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-300">
              TELEGRAM OSINT CONFIGURATION
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ConfigInfo label="CHANNEL SOURCE" value="PUBLIC CHANNELS" />
            <ConfigInfo label="DISCOVERY MODE" value="HISTORY SCAN" />
            <ConfigInfo label="MEDIA PIPELINE" value="OCR / QR ENABLED" />
            <ConfigInfo label="PERSISTENCE" value="GATEKEEPER INTELLIGENCE" />
          </div>
          <div className="mt-3 rounded-lg border border-white/[0.055] bg-white/[0.012] p-4">
            <div className="flex items-start gap-3">
              <Target size={14} className="mt-0.5 shrink-0 text-cyan-400" />
              <div>
                <div className="font-mono text-[10px] font-semibold tracking-[0.12em] text-slate-300">
                  CONFIGURED THROUGH BACKEND ENVIRONMENT
                </div>
                <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-slate-400">
                  TELEGRAM_PUBLIC_CHANNELS controls the public usernames or t.me
                  links scanned by this collector. TELEGRAM_PUBLIC_OSINT_LIMIT,
                  TELEGRAM_PUBLIC_OSINT_INTERVAL, TELEGRAM_PUBLIC_OSINT_KEYWORDS
                  and TELEGRAM_PUBLIC_CHANNEL_MESSAGES control discovery
                  behavior.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-white/[0.05] bg-black/10 p-4">
          <div className="mb-3 font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-400">
            CURRENT TELEGRAM OSINT PIPELINE
          </div>
          <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <PipelineMini number="01" label="RESOLVE" />
            <PipelineMini number="02" label="SCAN" />
            <PipelineMini number="03" label="FILTER" />
            <PipelineMini number="04" label="MEDIA" />
            <PipelineMini number="05" label="OCR / QR" />
            <PipelineMini number="06" label="WALLETS" />
            <PipelineMini number="07" label="ANALYZE" />
            <PipelineMini number="08" label="SAVE" />
          </div>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-md border border-cyan-400/10 bg-cyan-400/[0.025] px-4 py-3">
          <Network size={14} className="mt-0.5 shrink-0 text-cyan-400" />
          <p className="font-mono text-[10px] leading-relaxed text-cyan-200/80">
            PUBLIC CHANNEL MODE — COLLECTION IS RESTRICTED TO CONFIGURED PUBLIC
            TELEGRAM CHANNELS. THE COLLECTOR DOES NOT PERFORM GLOBAL TELEGRAM
            SEARCH POSTS DISCOVERY.
          </p>
        </div>
      </CollectorCard>
      {/* ======================================================
          WEBSITE
      ====================================================== */}
      <CollectorCard
        icon={<Globe size={21} strokeWidth={1.7} />}
        label="COLLECTION NODE / 02"
        title="Website OSINT Collector"
        description="Crawls configured seed URLs, extracts page content and media, and feeds discovered intelligence into Gatekeeper."
        channelLabel="WEBSITE CRAWL CHANNEL"
        status={websiteStatus}
        loading={loading === "website"}
        expanded={expanded === "website"}
        onExpand={() => setExpanded(expanded === "website" ? null : "website")}
        onToggle={() => toggleCollector("website", websiteStatus.running)}
        onRefresh={loadStatus}
      >
        <CollectorCapabilities
          items={[
            {
              icon: <Globe size={14} />,
              title: "Seed URL Crawling",
              description:
                "Uses configured website sources as collection targets.",
              done: true,
            },
            {
              icon: <FileText size={14} />,
              title: "Page Extraction",
              description: "Collects website content for downstream analysis.",
              done: true,
            },
            {
              icon: <Image size={14} />,
              title: "Image Collection",
              description: "Tracks extracted image evidence.",
              done: true,
            },
            {
              icon: <Wallet size={14} />,
              title: "Wallet Detection",
              description: "Wallet discoveries are tracked by the collector.",
              done: true,
            },
          ]}
        />
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-300">
              CONFIGURED SEED URLS
            </div>
            <span className="rounded-md border border-cyan-400/10 bg-cyan-400/[0.04] px-2 py-1 font-mono text-[9px] text-cyan-300">
              {sources.length} SOURCES
            </span>
          </div>
          <div className="flex gap-2">
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSource()}
              placeholder="example.com or https://example.com/page"
              className="min-w-0 flex-1 rounded-md border border-white/[0.09] bg-white/[0.025] px-3 py-2.5 text-[12px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/10"
            />
            <button
              type="button"
              onClick={addSource}
              disabled={loading === "add-source"}
              className="flex items-center gap-1.5 rounded-md border border-cyan-400/25 bg-cyan-400/[0.07] px-3.5 py-2 font-mono text-[10px] font-semibold tracking-wider text-cyan-200 transition-all hover:border-cyan-400/40 hover:bg-cyan-400/[0.12] disabled:opacity-50"
            >
              <Plus size={13} />
              ADD
            </button>
          </div>
          {sources.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-white/[0.05] bg-white/[0.015] px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        source.active ? "bg-emerald-400" : "bg-slate-600"
                      }`}
                    />
                    <span className="truncate font-mono text-[11px] text-slate-300">
                      {source.url}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {source.last_crawled_at && (
                      <span className="hidden font-mono text-[9px] text-slate-400 sm:block">
                        LAST CRAWL{" "}
                        {new Date(source.last_crawled_at).toLocaleTimeString()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeSource(source.id)}
                      className="text-slate-500 transition-colors hover:text-red-400"
                      aria-label="Remove source"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-amber-400/10 bg-amber-400/[0.025] px-3 py-3">
              <p className="font-mono text-[10px] text-amber-200/80">
                NO SOURCES CONFIGURED — ADD A SEED URL TO ENABLE WEBSITE
                CRAWLING.
              </p>
            </div>
          )}
        </div>
      </CollectorCard>
      {/* ======================================================
          X / TWITTER
      ====================================================== */}
      <CollectorCard
        icon={<Search size={21} strokeWidth={1.7} />}
        label="COLLECTION NODE / 03"
        title="X / Twitter OSINT Collector"
        description="Searches X's public live search for wallet-related intelligence, extracts tweet metadata and forwards unique tweets to the Gatekeeper queue."
        channelLabel="X PUBLIC SEARCH CHANNEL"
        status={twitterStatus}
        loading={loading === "twitter"}
        expanded={expanded === "twitter"}
        onExpand={() => setExpanded(expanded === "twitter" ? null : "twitter")}
        onToggle={() => toggleCollector("twitter", twitterStatus.running)}
        onRefresh={() => {
          loadStatus();
          loadXSearchConfig();
          loadIntelligenceKeywords();
        }}
      >
        <CollectorCapabilities
          items={[
            {
              icon: <Search size={14} />,
              title: "Public X Search",
              description:
                "Searches X public live results without authentication.",
              done: true,
            },
            {
              icon: <ScanLine size={14} />,
              title: "Tweet ID Extraction",
              description: "Finds /status/{id} links inside collected tweets.",
              done: true,
            },
            {
              icon: <Activity size={14} />,
              title: "Deduplication",
              description: "Previously processed tweet IDs are skipped.",
              done: true,
            },
            {
              icon: <Wallet size={14} />,
              title: "Wallet Detection",
              description:
                "Queued tweets are processed downstream for wallet signals.",
              done: true,
            },
            {
              icon: <Database size={14} />,
              title: "Queue Ingestion",
              description: "Unique tweets are POSTed to the Gatekeeper queue.",
              done: true,
            },
          ]}
        />
        {/* X SEARCH CONFIGURATION */}
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Settings2 size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-300">
                  X SEARCH CONFIGURATION
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-slate-400">
                CONFIGURATION IS CONTROLLED BY THE GATEKEEPER API
              </p>
            </div>
            <div
              className={`flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[9px] ${
                configSynced
                  ? "border-emerald-400/15 bg-emerald-400/[0.035] text-emerald-300"
                  : "border-amber-400/15 bg-amber-400/[0.035] text-amber-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  configSynced ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {configSynced ? "CONFIG SYNCED" : "UNSAVED CHANGES"}
            </div>
          </div>
          {/* BACKEND INTELLIGENCE KEYWORDS */}
          <div className="mb-3 rounded-lg border border-cyan-400/[0.08] bg-cyan-400/[0.018] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Radar size={13} className="text-cyan-400" />
                  <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-300">
                    BACKEND INTELLIGENCE KEYWORDS
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  LOADED FROM /KEYWORDS
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-cyan-400/10 bg-cyan-400/[0.035] px-2 py-1 font-mono text-[9px] text-cyan-300">
                  {intelligenceKeywords.length} TERMS
                </span>
                <button
                  type="button"
                  onClick={applyIntelligenceKeywords}
                  disabled={intelligenceKeywords.length === 0}
                  className="flex items-center gap-1.5 rounded-md border border-cyan-400/20 bg-cyan-400/[0.055] px-3 py-2 font-mono text-[9px] font-semibold tracking-wider text-cyan-200 transition-all hover:border-cyan-400/35 hover:bg-cyan-400/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RefreshCw size={12} />
                  LOAD INTO X SEARCH
                </button>
              </div>
            </div>
            {intelligenceKeywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {intelligenceKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-md border border-white/[0.055] bg-white/[0.018] px-2 py-1 font-mono text-[10px] text-slate-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* ACTIVE X SEARCH TERMS */}
          <div className="rounded-lg border border-white/[0.055] bg-black/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search size={13} className="text-cyan-400" />
                <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-300">
                  ACTIVE SEARCH TERMS
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                {xSearchConfig.keywords.length} TERMS
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {xSearchConfig.keywords.map((keyword) => (
                <div
                  key={keyword}
                  className="group flex items-center gap-1.5 rounded-md border border-cyan-400/10 bg-cyan-400/[0.035] py-1.5 pl-2.5 pr-1.5"
                >
                  <span className="font-mono text-[10px] text-cyan-200">
                    {keyword}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeKeyword(keyword)}
                    className="text-cyan-300/50 transition-colors hover:text-red-400"
                    aria-label={`Remove ${keyword}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {xSearchConfig.keywords.length === 0 && (
                <span className="font-mono text-[10px] text-amber-200/80">
                  NO SEARCH TERMS CONFIGURED
                </span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addKeyword();
                  }
                }}
                placeholder="e.g. ethereum wallet"
                className="min-w-0 flex-1 rounded-md border border-white/[0.09] bg-white/[0.025] px-3 py-2.5 font-mono text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/10"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="flex items-center gap-1.5 rounded-md border border-cyan-400/20 bg-cyan-400/[0.055] px-3.5 py-2 font-mono text-[9px] font-semibold tracking-wider text-cyan-200 transition-all hover:border-cyan-400/35 hover:bg-cyan-400/[0.09]"
              >
                <Plus size={13} />
                ADD TERM
              </button>
            </div>
          </div>
          {/* SEARCH PARAMETERS */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-white/[0.055] bg-white/[0.012] p-4">
              <div className="mb-2 flex items-center gap-2">
                <SlidersHorizontal size={12} className="text-cyan-400" />
                <span className="font-mono text-[10px] tracking-[0.12em] text-slate-400">
                  DISPLAY TYPE
                </span>
              </div>
              <select
                value={xSearchConfig.display_type}
                onChange={(e) => updateXConfig("display_type", e.target.value)}
                className="w-full rounded-md border border-white/[0.08] bg-[#090e16] px-2.5 py-2.5 font-mono text-[11px] text-slate-200 outline-none focus:border-cyan-400/40"
              >
                <option value="Latest">Latest</option>
                <option value="Top">Top</option>
              </select>
            </div>
            <div className="rounded-lg border border-white/[0.055] bg-white/[0.012] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Database size={12} className="text-cyan-400" />
                <span className="font-mono text-[10px] tracking-[0.12em] text-slate-400">
                  RESULTS / SEARCH
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={100}
                value={xSearchConfig.limit}
                onChange={(e) =>
                  updateXConfig(
                    "limit",
                    Math.min(100, Math.max(1, Number(e.target.value) || 1)),
                  )
                }
                className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-2.5 font-mono text-[11px] text-slate-200 outline-none focus:border-cyan-400/40"
              />
            </div>
            <div className="rounded-lg border border-white/[0.055] bg-white/[0.012] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Clock3 size={12} className="text-cyan-400" />
                <span className="font-mono text-[10px] tracking-[0.12em] text-slate-400">
                  SINCE DATE
                </span>
              </div>
              <input
                type="date"
                value={xSearchConfig.since ?? ""}
                onChange={(e) => updateXConfig("since", e.target.value || null)}
                className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-2.5 font-mono text-[11px] text-slate-200 outline-none focus:border-cyan-400/40"
              />
            </div>
            <div className="rounded-lg border border-white/[0.055] bg-white/[0.012] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Clock3 size={12} className="text-cyan-400" />
                <span className="font-mono text-[10px] tracking-[0.12em] text-slate-400">
                  UNTIL DATE
                </span>
              </div>
              <input
                type="date"
                value={xSearchConfig.until ?? ""}
                onChange={(e) => updateXConfig("until", e.target.value || null)}
                className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-2.5 font-mono text-[11px] text-slate-200 outline-none focus:border-cyan-400/40"
              />
            </div>
          </div>
          {/* SAVE CONFIG */}
          <div className="mt-3 flex flex-col gap-3 rounded-lg border border-white/[0.055] bg-white/[0.012] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-mono text-[10px] font-semibold tracking-[0.12em] text-slate-300">
                SEARCH ENGINE PARAMETERS
              </div>
              <p className="mt-1 font-mono text-[10px] text-slate-400">
                Changes are applied to the backend collector configuration.
              </p>
            </div>
            <button
              type="button"
              onClick={saveXSearchConfig}
              disabled={configSaving}
              className={`flex h-10 items-center justify-center gap-2 rounded-md border px-4 font-mono text-[10px] font-semibold tracking-[0.1em] transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                configSynced
                  ? "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/[0.13] hover:text-slate-200"
                  : "border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-200 hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
              }`}
            >
              {configSaving ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              {configSaving ? "SAVING..." : "SAVE CONFIGURATION"}
            </button>
          </div>
        </div>
        {/* X PIPELINE */}
        <div className="mt-5 rounded-lg border border-white/[0.05] bg-black/10 p-4">
          <div className="mb-3 font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-400">
            CURRENT COLLECTION PIPELINE
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            <PipelineMini number="01" label="SEARCH" />
            <PipelineMini number="02" label="SCROLL" />
            <PipelineMini number="03" label="EXTRACT" />
            <PipelineMini number="04" label="DEDUP" />
            <PipelineMini number="05" label="QUEUE" />
          </div>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-md border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
          <p className="font-mono text-[10px] leading-relaxed text-amber-200/90">
            BEST-EFFORT PUBLIC COLLECTOR — X public search may rate-limit,
            challenge or block automated browsing. Results depend on X
            availability and public search responses.
          </p>
        </div>
      </CollectorCard>
      {/* ======================================================
          GLOBAL ERROR
      ====================================================== */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-400/15 bg-red-400/[0.045] px-4 py-3">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
          <span className="font-mono text-[10px] tracking-wide text-red-200">
            {error}
          </span>
        </div>
      )}
    </div>
  );
}
/* ============================================================
   COLLECTOR CARD
============================================================ */
function CollectorCard({
  icon,
  label,
  title,
  description,
  channelLabel,
  status,
  loading,
  expanded,
  onExpand,
  onToggle,
  onRefresh,
  children,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  description: string;
  channelLabel: string;
  status: CollectorStatus;
  loading: boolean;
  expanded: boolean;
  onExpand: () => void;
  onToggle: () => void;
  onRefresh: () => void;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#070b12]/90 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-cyan-400/[0.025] blur-[100px]" />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-cyan-400/40 via-cyan-400/10 to-transparent" />
      <div className="relative p-5 sm:p-6 lg:p-7">
        {/* HEADER */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${
                status.running
                  ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300"
                  : "border-cyan-400/20 bg-cyan-400/[0.055] text-cyan-300"
              } shadow-[0_0_28px_rgba(34,211,238,0.06)]`}
            >
              {icon}
              <span
                className={`absolute -left-px -top-px h-2 w-2 border-l border-t ${
                  status.running
                    ? "border-emerald-400/80"
                    : "border-cyan-400/80"
                }`}
              />
              <span
                className={`absolute -bottom-px -right-px h-2 w-2 border-b border-r ${
                  status.running
                    ? "border-emerald-400/80"
                    : "border-cyan-400/80"
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-cyan-300">
                  {label}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span
                  className={`font-mono text-[10px] font-semibold tracking-[0.12em] ${
                    status.running ? "text-emerald-300" : "text-slate-400"
                  }`}
                >
                  {status.running ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
              <h2 className="truncate text-[18px] font-semibold tracking-tight text-slate-100">
                {title}
              </h2>
              <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-slate-400">
                {description}
              </p>
            </div>
          </div>
          {/* CONTROLS */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onExpand}
              className="flex h-10 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 font-mono text-[10px] font-semibold tracking-wider text-slate-400 transition-all hover:border-white/[0.14] hover:bg-white/[0.035] hover:text-slate-200"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? "HIDE DETAILS" : "VIEW DETAILS"}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Refresh collector status"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] text-slate-400 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.035] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onToggle}
              disabled={loading}
              className={`flex h-10 items-center gap-2 rounded-md border px-4 font-mono text-[10px] font-semibold tracking-[0.1em] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                status.running
                  ? "border-red-400/20 bg-red-400/[0.06] text-red-200 hover:border-red-400/35 hover:bg-red-400/[0.10]"
                  : "border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-200 hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
              }`}
            >
              {status.running ? (
                <>
                  <Square size={13} strokeWidth={1.8} />
                  STOP
                </>
              ) : (
                <>
                  <Play size={13} strokeWidth={1.8} />
                  START
                </>
              )}
            </button>
          </div>
        </div>
        {/* STREAM STATUS */}
        <div className="mt-6 flex flex-col gap-2 border-y border-white/[0.06] py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              {status.running && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              )}
              <span
                className={`relative h-1.5 w-1.5 rounded-full ${
                  status.running ? "bg-emerald-400" : "bg-slate-600"
                }`}
              />
            </span>
            <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-400">
              {channelLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity
              size={12}
              className={status.running ? "text-emerald-400" : "text-slate-500"}
            />
            <span
              className={`font-mono text-[10px] font-semibold tracking-wider ${
                status.running ? "text-emerald-300" : "text-slate-400"
              }`}
            >
              {status.running ? "STREAMING" : "CHANNEL OFFLINE"}
            </span>
          </div>
        </div>
        {/* METRICS */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <Metric
            icon={<Radio size={15} />}
            title="STATUS"
            value={status.running ? "ACTIVE" : "OFFLINE"}
            active={status.running}
          />
          <Metric
            icon={<Activity size={15} />}
            title="PROCESSED"
            value={status.processed}
          />
          <Metric
            icon={<Wallet size={15} />}
            title="WALLETS"
            value={status.wallets}
          />
          <Metric
            icon={<Image size={15} />}
            title="IMAGES"
            value={status.images}
          />
          <Metric
            icon={<FileText size={15} />}
            title="PDFS"
            value={status.pdfs}
          />
          <Metric
            icon={<QrCode size={15} />}
            title="QR CODES"
            value={status.qrs}
          />
        </div>
        {/* STATUS ERROR */}
        {status.error && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-red-400/10 bg-red-400/[0.03] px-3 py-2.5">
            <AlertTriangle size={13} className="text-red-400" />
            <span className="font-mono text-[10px] text-red-200/90">
              {status.error}
            </span>
          </div>
        )}
        {expanded && <div className="mt-5">{children}</div>}
      </div>
    </section>
  );
}
/* ============================================================
   TELEGRAM METRIC
============================================================ */
function TelegramMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2.5 ${
        danger
          ? "border-red-400/10 bg-red-400/[0.025]"
          : "border-white/[0.05] bg-white/[0.012]"
      }`}
    >
      <div
        className={`font-mono text-[9px] font-medium tracking-[0.1em] ${
          danger ? "text-red-300" : "text-slate-400"
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-[14px] font-semibold ${
          danger ? "text-red-200" : "text-slate-200"
        }`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
/* ============================================================
   CONFIG INFO
============================================================ */
function ConfigInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.045] bg-white/[0.012] px-3 py-3">
      <div className="font-mono text-[9px] font-medium tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-mono text-[10px] font-semibold text-cyan-200">
        {value}
      </div>
    </div>
  );
}
/* ============================================================
   CAPABILITIES
============================================================ */
function CollectorCapabilities({
  items,
}: {
  items: {
    icon: ReactNode;
    title: string;
    description: string;
    done: boolean;
  }[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Cpu size={13} className="text-cyan-400" />
        <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-slate-300">
          COLLECTOR CAPABILITIES
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-3.5"
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 text-cyan-400">{item.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-200">
                    {item.title}
                  </span>
                  {item.done ? (
                    <CheckCircle2
                      size={13}
                      className="shrink-0 text-emerald-400"
                    />
                  ) : (
                    <Circle size={13} className="shrink-0 text-slate-600" />
                  )}
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
/* ============================================================
   SUMMARY STAT
============================================================ */
function SummaryStat({
  label,
  value,
  active = false,
}: {
  label: string;
  value: number;
  active?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.018] px-3.5 py-2.5">
      <div
        className={`font-mono text-[9px] font-medium tracking-[0.13em] ${
          active ? "text-emerald-300" : "text-slate-400"
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-0.5 font-mono text-lg font-semibold ${
          active ? "text-emerald-200" : "text-slate-200"
        }`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
/* ============================================================
   PIPELINE
============================================================ */
function PipelineStep({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/[0.045] bg-white/[0.012] px-3 py-2.5">
      <span className="text-cyan-400">{icon}</span>
      <span className="font-mono text-[10px] font-medium tracking-[0.12em] text-slate-400">
        {label}
      </span>
    </div>
  );
}
function PipelineMini({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/[0.045] bg-white/[0.012] px-2.5 py-2.5">
      <span className="font-mono text-[9px] font-medium text-cyan-300">
        {number}
      </span>
      <span className="font-mono text-[10px] font-medium tracking-wider text-slate-400">
        {label}
      </span>
    </div>
  );
}
/* ============================================================
   METRIC
============================================================ */
function Metric({
  icon,
  title,
  value,
  active = false,
}: {
  icon: ReactNode;
  title: string;
  value: string | number;
  active?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-white/[0.055] bg-white/[0.018] px-3.5 py-3.5 transition-all duration-200 hover:border-white/[0.10] hover:bg-white/[0.028]">
      <div
        className={`pointer-events-none absolute left-0 top-0 h-px w-10 ${
          active ? "bg-emerald-400/70" : "bg-cyan-400/30"
        }`}
      />
      <div className="flex items-center gap-2">
        <span className={active ? "text-emerald-400" : "text-cyan-400"}>
          {icon}
        </span>
        <span className="font-mono text-[9px] font-medium tracking-[0.1em] text-slate-400">
          {title}
        </span>
      </div>
      <div
        className={`mt-2 font-mono text-[17px] font-semibold tracking-tight ${
          active ? "text-emerald-200" : "text-slate-200"
        }`}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {active && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-emerald-400" />
          <span className="font-mono text-[9px] font-medium tracking-wider text-emerald-300">
            LIVE
          </span>
        </div>
      )}
    </div>
  );
}
