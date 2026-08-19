"use client";
import { useState } from "react";
import {
  Globe,
  Radio,
  X as TwitterIcon,
  Upload,
  ExternalLink,
  Wallet as WalletIcon,
  AlertTriangle,
  ChevronDown,
  ShieldAlert,
  Clock3,
  FileText,
  ScanLine,
  Fingerprint,
} from "lucide-react";
export interface OSINTPost {
  id: string;
  source_type: "telegram" | "website" | "twitter" | "upload";
  author: string | null;
  original_timestamp: string | null;
  raw_text: string;
  media_urls: string[];
  source_url: string | null;
  wallets: {
    address: string;
    chain: string | null;
    risk_score: number;
    risk_level: string;
    ocr_corrected?: boolean;
  }[];
  risk_score: number;
  risk_level: string;
  keywords: string[];
  page_count?: number;
}
const SOURCE_ICON: Record<OSINTPost["source_type"], typeof Globe> = {
  telegram: Radio,
  website: Globe,
  twitter: TwitterIcon,
  upload: Upload,
};
const SOURCE_LABEL: Record<OSINTPost["source_type"], string> = {
  telegram: "TELEGRAM",
  website: "WEBSITE",
  twitter: "X / TWITTER",
  upload: "MANUAL UPLOAD",
};
const SOURCE_COLOR: Record<OSINTPost["source_type"], string> = {
  telegram: "text-sky-300 border-sky-400/20 bg-sky-400/[0.045]",
  website: "text-cyan-300 border-cyan-400/20 bg-cyan-400/[0.045]",
  twitter: "text-slate-300 border-slate-400/15 bg-slate-400/[0.035]",
  upload: "text-violet-300 border-violet-400/20 bg-violet-400/[0.045]",
};
function riskBadgeClass(level: string) {
  const normalized = level?.toUpperCase();
  if (normalized === "CRITICAL") {
    return "border-red-400/30 bg-red-400/[0.10] text-red-300";
  }
  if (normalized === "HIGH") {
    return "border-red-400/20 bg-red-400/[0.065] text-red-300";
  }
  if (normalized === "MEDIUM") {
    return "border-amber-400/20 bg-amber-400/[0.055] text-amber-300";
  }
  return "border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-300";
}
function riskAccent(level: string) {
  const normalized = level?.toUpperCase();
  if (normalized === "CRITICAL" || normalized === "HIGH") {
    return "bg-red-400";
  }
  if (normalized === "MEDIUM") {
    return "bg-amber-400";
  }
  return "bg-emerald-400";
}
function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return "--";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleString();
}
function shortenWallet(address: string) {
  if (address.length <= 18) return address;
  return `${address.slice(0, 9)}…${address.slice(-7)}`;
}
export default function OSINTPostCard({
  post,
  onWalletClick,
}: {
  post: OSINTPost;
  onWalletClick?: (address: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = SOURCE_ICON[post.source_type] ?? Globe;
  const text = post.raw_text?.trim() || "";
  const isLong = text.length > 420;
  const displayText =
    expanded || !isLong ? text : `${text.slice(0, 420).trimEnd()}…`;
  const riskLevel = post.risk_level?.toUpperCase() || "LOW";
  return (
    <article className="group relative overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#070d14] transition-all duration-300 hover:border-white/[0.11] hover:bg-[#081019]">
      {/* ================================================================
          RISK ACCENT
      ================================================================= */}
      <div
        className={`absolute inset-y-0 left-0 w-[2px] ${riskAccent(
          riskLevel,
        )} opacity-60`}
      />
      {/* ambient glow */}
      {(riskLevel === "HIGH" || riskLevel === "CRITICAL") && (
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-red-500/[0.045] blur-3xl" />
      )}
      <div className="relative p-5">
        {/* ================================================================
            HEADER
        ================================================================= */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                SOURCE_COLOR[post.source_type]
              }`}
            >
              <Icon size={15} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-1 font-mono text-[8px] font-semibold tracking-[0.14em] ${
                    SOURCE_COLOR[post.source_type]
                  }`}
                >
                  {SOURCE_LABEL[post.source_type]}
                </span>
                {post.author && (
                  <>
                    <span className="h-3 w-px bg-white/[0.08]" />
                    <span className="max-w-[240px] truncate font-mono text-[10px] text-slate-400">
                      {post.author}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Fingerprint size={10} />
                  {post.id}
                </span>
                {post.page_count && post.page_count > 1 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FileText size={9} />
                      {post.page_count} PAGES
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* risk + timestamp */}
          <div className="flex shrink-0 items-center gap-2">
            {post.original_timestamp && (
              <span className="hidden items-center gap-1.5 font-mono text-[8px] text-slate-700 xl:flex">
                <Clock3 size={10} />
                {formatTimestamp(post.original_timestamp)}
              </span>
            )}
            <div
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono ${riskBadgeClass(
                riskLevel,
              )}`}
            >
              <ShieldAlert size={11} />
              <span className="text-[9px] font-bold tracking-[0.1em]">
                {riskLevel}
              </span>
              <span className="h-3 w-px bg-current opacity-20" />
              <span className="text-[10px] font-bold">
                {Number(post.risk_score || 0)}
              </span>
            </div>
          </div>
        </div>
        {/* ================================================================
            SOURCE TIME — MOBILE / TABLET
        ================================================================= */}
        {post.original_timestamp && (
          <div className="mt-3 flex items-center gap-1.5 font-mono text-[8px] text-slate-700 xl:hidden">
            <Clock3 size={10} />
            {formatTimestamp(post.original_timestamp)}
          </div>
        )}
        {/* ================================================================
            CONTENT
        ================================================================= */}
        {text && (
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2">
              <ScanLine size={11} className="text-cyan-500/70" />
              <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                Captured Intelligence
              </span>
            </div>
            <div className="rounded-xl border border-white/[0.045] bg-black/[0.16] px-4 py-3.5">
              <p className="whitespace-pre-line break-words text-[11px] leading-[1.8] text-slate-300">
                {displayText}
              </p>
            </div>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="mt-2 flex items-center gap-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-cyan-500/80 transition-colors hover:text-cyan-300"
              >
                {expanded ? "Collapse evidence" : "Expand evidence"}
                <ChevronDown
                  size={11}
                  className={`transition-transform duration-200 ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </div>
        )}
        {/* ================================================================
            SOURCE LINK
        ================================================================= */}
        {post.source_url && (
          <a
            href={post.source_url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.045] bg-white/[0.015] px-3 py-2.5 font-mono text-[8px] text-slate-600 transition-all hover:border-cyan-400/15 hover:bg-cyan-400/[0.025] hover:text-cyan-400"
          >
            <ExternalLink size={11} className="shrink-0" />
            <span className="truncate">{post.source_url}</span>
          </a>
        )}
        {/* ================================================================
            KEYWORDS
        ================================================================= */}
        {post.keywords.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                Correlated Keywords
              </span>
              <span className="h-px flex-1 bg-white/[0.045]" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {post.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-md border border-cyan-400/10 bg-cyan-400/[0.025] px-2 py-1 font-mono text-[8px] lowercase text-cyan-500/80"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* ================================================================
            WALLET INTELLIGENCE
        ================================================================= */}
        {post.wallets.length > 0 && (
          <div className="mt-5 border-t border-white/[0.05] pt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WalletIcon size={12} className="text-cyan-400" />
                <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                  Wallet Intelligence
                </span>
              </div>
              <span className="font-mono text-[8px] text-slate-700">
                {post.wallets.length}{" "}
                {post.wallets.length === 1 ? "ADDRESS" : "ADDRESSES"}
              </span>
            </div>
            <div className="grid gap-2">
              {post.wallets.map((wallet) => {
                const walletRisk = wallet.risk_level?.toUpperCase() || "LOW";
                return (
                  <button
                    key={wallet.address}
                    type="button"
                    onClick={() => onWalletClick?.(wallet.address)}
                    className="group/wallet flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-black/[0.14] px-3.5 py-2.5 text-left transition-all hover:border-cyan-400/15 hover:bg-cyan-400/[0.025]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${riskBadgeClass(
                          walletRisk,
                        )}`}
                      >
                        <WalletIcon size={11} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[9px] text-slate-300 group-hover/wallet:text-cyan-300">
                          {shortenWallet(wallet.address)}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {wallet.chain && (
                            <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-slate-700">
                              {wallet.chain}
                            </span>
                          )}
                          {wallet.ocr_corrected && (
                            <span className="flex items-center gap-1 font-mono text-[7px] uppercase tracking-[0.08em] text-amber-400/80">
                              <AlertTriangle size={8} />
                              OCR CORRECTED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-1 font-mono text-[7px] font-bold uppercase tracking-[0.08em] ${riskBadgeClass(
                          walletRisk,
                        )}`}
                      >
                        {walletRisk}
                      </span>
                      <span className="font-mono text-[9px] text-slate-600">
                        {Number(wallet.risk_score || 0)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* ================================================================
            FOOTER TELEMETRY
        ================================================================= */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.045] pt-3">
          <div className="flex items-center gap-3 font-mono text-[7px] uppercase tracking-[0.13em] text-slate-700">
            <span>
              EVIDENCE ID: <span className="text-slate-600">{post.id}</span>
            </span>
            {post.media_urls.length > 0 && (
              <span>
                MEDIA:{" "}
                <span className="text-slate-600">{post.media_urls.length}</span>
              </span>
            )}
          </div>
          <span
            className={`flex items-center gap-1.5 font-mono text-[7px] font-semibold uppercase tracking-[0.12em] ${
              riskLevel === "HIGH" || riskLevel === "CRITICAL"
                ? "text-red-400"
                : riskLevel === "MEDIUM"
                  ? "text-amber-400"
                  : "text-emerald-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${riskAccent(riskLevel)}`}
            />
            {riskLevel === "HIGH" || riskLevel === "CRITICAL"
              ? "REVIEW REQUIRED"
              : riskLevel === "MEDIUM"
                ? "MONITOR"
                : "LOW RISK"}
          </span>
        </div>
      </div>
    </article>
  );
}
