"use client";
import {
  Globe2,
  MessageSquare,
  Wallet,
  Clock,
  ShieldAlert,
  Radio,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { useMemo } from "react";
interface WalletReference {
  address?: string;
  chain?: string;
}
interface OSINTItem {
  source?: string;
  type?: string;
  message?: string;
  risk?: string;
  risk_score?: number;
  address?: string | WalletReference | null;
  chain?: string | null;
  keywords?: string[];
  time?: string;
  created_at?: string;
}
interface Props {
  feeds?: OSINTItem[] | null;
}
/* ============================================================
   SAFE HELPERS
============================================================ */
const safeString = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value.trim() : fallback;
};
const safeNumber = (value: unknown, fallback = 0): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};
const formatTime = (value?: string | null): string | null => {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return safeString(value) || null;
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return safeString(value) || null;
  }
};
const getRiskScore = (item: OSINTItem): number => {
  const directScore = safeNumber(item.risk_score, -1);
  if (directScore >= 0) {
    return Math.max(0, Math.min(100, directScore));
  }
  const risk = safeString(item.risk).toLowerCase();
  switch (risk) {
    case "critical":
      return 90;
    case "high":
      return 75;
    case "medium":
      return 50;
    case "low":
      return 20;
    default:
      return 0;
  }
};
const getRiskLevel = (item: OSINTItem): string => {
  const score = getRiskScore(item);
  const risk = safeString(item.risk).toLowerCase();
  if (risk === "critical" || score >= 85) {
    return "CRITICAL";
  }
  if (risk === "high" || score >= 70) {
    return "HIGH";
  }
  if (risk === "medium" || score >= 40) {
    return "MEDIUM";
  }
  return "LOW";
};
/* ============================================================
   COMPONENT
============================================================ */
export default function OSINTFeed({ feeds = [] }: Props) {
  const visibleFeeds = useMemo(() => {
    if (!Array.isArray(feeds)) {
      return [];
    }
    return feeds
      .filter(
        (item): item is OSINTItem =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
      .slice(0, 8);
  }, [feeds]);
  const eventCount = visibleFeeds.length;
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#071019]/80 shadow-[0_18px_55px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      {/* ============================================================
          TOP TECHNICAL ACCENT
      ============================================================ */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
      {/* ============================================================
          HEADER
      ============================================================ */}
      <div className="border-b border-white/[0.08] px-5 py-5 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {/* STATUS LABEL */}
            <div className="mb-2.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/90">
                Intelligence Stream
              </span>
            </div>
            {/* TITLE */}
            <h2 className="text-[17px] font-semibold tracking-tight text-slate-100 sm:text-lg">
              Recent OSINT Activity
            </h2>
            {/* DESCRIPTION */}
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-400">
              Live intelligence collected across monitored sources.
            </p>
          </div>
          {/* HEADER ICON */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/[0.16] bg-emerald-400/[0.045] text-emerald-300">
            <Globe2 size={18} strokeWidth={1.6} />
          </div>
        </div>
        {/* ============================================================
            STREAM META
        ============================================================ */}
        <div className="mt-5 flex min-h-[42px] items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Radio
              size={13}
              strokeWidth={1.7}
              className="shrink-0 text-emerald-300"
            />
            <span className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-slate-400">
              Monitoring active sources
            </span>
          </div>
          <span className="shrink-0 font-mono text-[10px] font-semibold tracking-[0.08em] text-slate-400">
            {eventCount.toString().padStart(2, "0")} EVENTS
          </span>
        </div>
      </div>
      {/* ============================================================
          STREAM
      ============================================================ */}
      <div className="relative">
        {eventCount === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/[0.12] bg-emerald-400/[0.035] text-emerald-300/70">
              <Globe2 size={21} strokeWidth={1.5} />
            </div>
            <strong className="text-sm font-semibold text-slate-200">
              No intelligence events
            </strong>
            <span className="mt-2 max-w-[320px] text-xs leading-relaxed text-slate-400">
              New OSINT findings will appear here automatically as monitored
              sources are processed.
            </span>
            <div className="mt-5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-300/80">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Stream Ready
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.065]">
            {visibleFeeds.map((item, index) => {
              /* ======================================================
                 NORMALIZED DATA
              ====================================================== */
              const type = safeString(item.type, "OSINT").toLowerCase();
              const source = safeString(item.source, "Unknown Source");
              const message = safeString(
                item.message,
                "No intelligence message available.",
              );
              const riskScore = getRiskScore(item);
              const riskLevel = getRiskLevel(item);
              const isTelegram = type.includes("telegram");
              const isHighRisk =
                riskLevel === "HIGH" || riskLevel === "CRITICAL";
              const isMediumRisk = riskLevel === "MEDIUM";
              /* ======================================================
                 WALLET NORMALIZATION
              ====================================================== */
              let walletAddress: string | undefined;
              let walletChain: string | undefined;
              if (
                item.address !== null &&
                typeof item.address === "object" &&
                !Array.isArray(item.address)
              ) {
                walletAddress = safeString(item.address.address, undefined);
                walletChain = safeString(item.address.chain, undefined);
              } else if (typeof item.address === "string") {
                walletAddress = safeString(item.address);
              }
              if (item.chain) {
                walletChain = safeString(item.chain, walletChain);
              }
              /* ======================================================
                 RISK STYLES
              ====================================================== */
              const riskStyles =
                riskLevel === "CRITICAL"
                  ? {
                      border: "border-red-400/[0.25]",
                      bg: "bg-red-400/[0.075]",
                      text: "text-red-300",
                      accent: "bg-red-500",
                    }
                  : riskLevel === "HIGH"
                    ? {
                        border: "border-red-400/[0.20]",
                        bg: "bg-red-400/[0.055]",
                        text: "text-red-300",
                        accent: "bg-red-400",
                      }
                    : riskLevel === "MEDIUM"
                      ? {
                          border: "border-amber-400/[0.20]",
                          bg: "bg-amber-400/[0.05]",
                          text: "text-amber-300",
                          accent: "bg-amber-400/80",
                        }
                      : {
                          border: "border-emerald-400/[0.12]",
                          bg: "bg-emerald-400/[0.03]",
                          text: "text-emerald-300/80",
                          accent: "bg-transparent",
                        };
              const timestamp = formatTime(item.time ?? item.created_at);
              /* ======================================================
                 KEYWORDS
              ====================================================== */
              const keywords = Array.isArray(item.keywords)
                ? item.keywords
                    .filter(
                      (keyword): keyword is string =>
                        typeof keyword === "string" &&
                        keyword.trim().length > 0,
                    )
                    .slice(0, 4)
                : [];
              const eventKey = [
                source,
                type,
                walletAddress ?? "",
                timestamp ?? "",
                index,
              ].join("-");
              return (
                <article
                  key={eventKey}
                  className="group relative px-5 py-5 transition-colors duration-200 hover:bg-white/[0.025] lg:px-6"
                >
                  {/* ==================================================
                      RISK ROW ACCENT
                  ================================================== */}
                  <span
                    className={`absolute bottom-0 left-0 top-0 w-[2px] transition-all duration-200 ${
                      isHighRisk
                        ? riskStyles.accent
                        : isMediumRisk
                          ? riskStyles.accent
                          : "bg-transparent group-hover:bg-emerald-400/60"
                    }`}
                  />
                  <div className="flex min-w-0 gap-3.5 sm:gap-4">
                    {/* ==================================================
                        SOURCE ICON
                    ================================================== */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200 sm:h-10 sm:w-10 ${
                        isHighRisk || isMediumRisk
                          ? `${riskStyles.border} ${riskStyles.bg} ${riskStyles.text}`
                          : "border-white/[0.09] bg-white/[0.03] text-cyan-300/80 group-hover:border-cyan-400/[0.18] group-hover:bg-cyan-400/[0.035]"
                      }`}
                    >
                      {isTelegram ? (
                        <MessageSquare size={16} strokeWidth={1.6} />
                      ) : (
                        <Wallet size={16} strokeWidth={1.6} />
                      )}
                    </div>
                    {/* ==================================================
                        EVENT CONTENT
                    ================================================== */}
                    <div className="min-w-0 flex-1">
                      {/* ==================================================
                          EVENT HEADER
                      ================================================== */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                            <strong className="max-w-full truncate text-sm font-semibold text-slate-100">
                              {source}
                            </strong>
                            <span className="shrink-0 rounded border border-white/[0.08] bg-white/[0.025] px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.06em] text-slate-400">
                              {safeString(item.type, "OSINT")}
                            </span>
                          </div>
                        </div>
                        {/* ==================================================
                            RISK BADGE
                        ================================================== */}
                        {riskLevel !== "LOW" && (
                          <span
                            className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.07em] ${riskStyles.border} ${riskStyles.bg} ${riskStyles.text}`}
                          >
                            <ShieldAlert size={11} />
                            {riskLevel}
                          </span>
                        )}
                      </div>
                      {/* ==================================================
                          MESSAGE
                      ================================================== */}
                      <p className="mt-2.5 line-clamp-3 break-words text-[12px] leading-[1.65] text-slate-300 sm:text-[13px]">
                        {message}
                      </p>
                      {/* ==================================================
                          WALLET
                      ================================================== */}
                      {walletAddress && (
                        <div className="mt-3 flex min-w-0 items-start gap-2.5 rounded-lg border border-cyan-400/[0.09] bg-cyan-400/[0.018] px-2.5 py-2">
                          <Wallet
                            size={13}
                            strokeWidth={1.6}
                            className="mt-0.5 shrink-0 text-cyan-300/80"
                          />
                          <span
                            className="min-w-0 truncate font-mono text-[10px] font-medium leading-relaxed text-cyan-100/75 sm:text-[11px]"
                            title={walletAddress}
                          >
                            {walletAddress}
                          </span>
                          {walletChain && (
                            <span className="shrink-0 rounded border border-white/[0.09] bg-white/[0.035] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                              {walletChain}
                            </span>
                          )}
                        </div>
                      )}
                      {/* ==================================================
                          TELEMETRY
                      ================================================== */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-2">
                        {/* KEYWORDS */}
                        {keywords.map((keyword, keywordIndex) => (
                          <span
                            key={`${keyword}-${keywordIndex}`}
                            className="max-w-[160px] truncate rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 font-mono text-[9px] font-medium text-slate-400 transition-colors group-hover:border-cyan-400/[0.12] group-hover:text-slate-300"
                            title={keyword}
                          >
                            {keyword}
                          </span>
                        ))}
                        {/* RISK SCORE */}
                        {riskScore > 0 && (
                          <span
                            className={`flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.018] px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.05em] ${riskStyles.text}`}
                          >
                            <Activity size={10} strokeWidth={1.6} />
                            Risk {riskScore}
                          </span>
                        )}
                        {/* TIMESTAMP */}
                        {timestamp && (
                          <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md px-1 py-1 font-mono text-[9px] font-medium text-slate-400">
                            <Clock
                              size={11}
                              strokeWidth={1.6}
                              className="text-slate-500"
                            />
                            <span className="hidden sm:inline">
                              {timestamp}
                            </span>
                            <span className="sm:hidden">
                              {timestamp.split(",")[0]}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    {/* ==================================================
                        HOVER ACTION
                    ================================================== */}
                    <ArrowUpRight
                      size={14}
                      strokeWidth={1.6}
                      className="mt-1 hidden shrink-0 text-transparent transition-all duration-200 sm:block group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-300/80"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {/* ============================================================
          FOOTER
      ============================================================ */}
      <div className="flex min-h-[42px] items-center justify-between gap-3 border-t border-white/[0.07] bg-white/[0.018] px-5 py-3 lg:px-6">
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-slate-500">
          Automated collection
        </span>
        {eventCount > 0 ? (
          <span className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-emerald-300/90">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-30" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Streaming
          </span>
        ) : (
          <span className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            Standby
          </span>
        )}
      </div>
    </section>
  );
}
