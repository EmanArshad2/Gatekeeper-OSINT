"use client";
import { FolderSearch, ArrowUpRight, Clock3, CircleDot } from "lucide-react";
/* ============================================================
   TYPES
============================================================ */
interface Investigation {
  id: string | number;
  title?: string | null;
  status?: string | null;
  created_at?: string | null;
}
interface Props {
  investigations?: Investigation[] | null;
}
/* ============================================================
   SAFE HELPERS
============================================================ */
const safeString = (value: unknown, fallback = ""): string => {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
};
const formatTimestamp = (value?: string | null): string => {
  const raw = safeString(value);
  if (!raw) {
    return "Unknown timestamp";
  }
  try {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }
    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
};
/* ============================================================
   COMPONENT
============================================================ */
export default function RecentInvestigations({ investigations = [] }: Props) {
  /*
   * Never assume the API returned a valid array.
   * This prevents the dashboard from crashing if the backend
   * temporarily returns null, undefined, or malformed data.
   */
  const visibleInvestigations = Array.isArray(investigations)
    ? investigations
        .filter(
          (item): item is Investigation =>
            item !== null && typeof item === "object" && !Array.isArray(item),
        )
        .slice(0, 6)
    : [];
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071019]/65 shadow-[0_18px_55px_rgba(0,0,0,0.16)] backdrop-blur-xl">
      {/* ============================================================
          TOP TECHNICAL ACCENT
      ============================================================ */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      {/* ============================================================
          HEADER
      ============================================================ */}
      <div className="border-b border-white/[0.07] px-5 py-5 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {/* SECTION LABEL */}
            <div className="mb-2.5 flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/90">
                Case management
              </span>
            </div>
            {/* TITLE */}
            <h2 className="text-[18px] font-semibold tracking-tight text-slate-100">
              Recent investigations
            </h2>
            {/* DESCRIPTION */}
            <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-slate-400">
              Latest investigation activity and evidence trails.
            </p>
          </div>
          {/* HEADER ICON */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/[0.15] bg-cyan-400/[0.04] text-cyan-300/90">
            <FolderSearch size={18} strokeWidth={1.6} />
          </div>
        </div>
        {/* ============================================================
            REGISTER META
        ============================================================ */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.018] px-3.5 py-2.5">
          <span className="truncate font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
            Investigation register
          </span>
          <span className="shrink-0 font-mono text-[10px] font-semibold tracking-[0.08em] text-slate-400">
            {visibleInvestigations.length.toString().padStart(2, "0")} CASES
          </span>
        </div>
      </div>
      {/* ============================================================
          INVESTIGATION LIST
      ============================================================ */}
      <div className="divide-y divide-white/[0.055]">
        {visibleInvestigations.length === 0 ? (
          /* ==========================================================
             EMPTY STATE
          ========================================================== */
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500">
              <FolderSearch size={20} strokeWidth={1.5} />
            </div>
            <strong className="text-[14px] font-semibold text-slate-200">
              No investigations recorded
            </strong>
            <span className="mt-1.5 max-w-[290px] text-[12px] leading-relaxed text-slate-500">
              Investigation cases will appear here as they are created.
            </span>
            <div className="mt-4 flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
              REGISTER EMPTY
            </div>
          </div>
        ) : (
          visibleInvestigations.map((item, index) => {
            /* ========================================================
               NORMALIZATION
            ======================================================== */
            const title = safeString(item.title, "Untitled investigation");
            const status = safeString(item.status, "Unknown");
            const normalizedStatus = status.toLowerCase();
            const timestamp = formatTimestamp(item.created_at);
            /* ========================================================
               STATUS DETECTION
            ======================================================== */
            const isActive = [
              "active",
              "open",
              "investigating",
              "in progress",
              "ongoing",
              "pending",
            ].some((value) => normalizedStatus.includes(value));
            const isCritical = [
              "critical",
              "high",
              "flagged",
              "alert",
              "danger",
              "risk",
            ].some((value) => normalizedStatus.includes(value));
            /* ========================================================
               STATUS STYLE
            ======================================================== */
            const statusStyles = isCritical
              ? {
                  border: "border-red-400/[0.22]",
                  background: "bg-red-400/[0.07]",
                  text: "text-red-300",
                  accent: "bg-red-500",
                }
              : isActive
                ? {
                    border: "border-emerald-400/[0.20]",
                    background: "bg-emerald-400/[0.055]",
                    text: "text-emerald-300",
                    accent: "bg-emerald-400",
                  }
                : {
                    border: "border-white/[0.08]",
                    background: "bg-white/[0.025]",
                    text: "text-slate-400",
                    accent: "bg-transparent",
                  };
            /* ========================================================
               EVENT KEY
            ======================================================== */
            const investigationKey = `${item.id}-${index}`;
            return (
              <article
                key={investigationKey}
                className="group relative flex min-h-[88px] items-center gap-3.5 px-5 py-3.5 transition-colors duration-200 hover:bg-white/[0.025] lg:px-6"
              >
                {/* ====================================================
                    STATUS ACCENT
                ==================================================== */}
                <span
                  className={`absolute bottom-0 left-0 top-0 w-[2px] transition-colors duration-200 ${
                    isCritical
                      ? statusStyles.accent
                      : isActive
                        ? statusStyles.accent
                        : "bg-transparent group-hover:bg-cyan-400/70"
                  }`}
                />
                {/* ====================================================
                    INDEX
                ==================================================== */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] font-mono text-[10px] font-semibold tracking-[0.04em] text-slate-500 transition-colors group-hover:border-cyan-400/[0.12] group-hover:text-cyan-300/70">
                  {String(index + 1).padStart(2, "0")}
                </div>
                {/* ====================================================
                    CONTENT
                ==================================================== */}
                <div className="min-w-0 flex-1">
                  {/* TITLE */}
                  <div className="flex min-w-0 items-center gap-2">
                    <strong
                      className="block truncate text-[12px] font-semibold leading-snug text-slate-200 transition-colors group-hover:text-slate-100"
                      title={title}
                    >
                      {title}
                    </strong>
                  </div>
                  {/* TIMESTAMP */}
                  <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                    <Clock3
                      size={11}
                      strokeWidth={1.6}
                      className="shrink-0 text-slate-500"
                    />
                    <span
                      className="truncate font-mono text-[9px] font-medium tracking-[0.02em] text-slate-500"
                      title={timestamp}
                    >
                      {timestamp}
                    </span>
                  </div>
                  {/* MOBILE STATUS */}
                  <div className="mt-2 sm:hidden">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] ${statusStyles.border} ${statusStyles.background} ${statusStyles.text}`}
                    >
                      {status}
                    </span>
                  </div>
                </div>
                {/* ====================================================
                    STATUS
                ==================================================== */}
                <span
                  className={`hidden shrink-0 items-center rounded-md border px-2.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] sm:inline-flex ${statusStyles.border} ${statusStyles.background} ${statusStyles.text}`}
                >
                  {status}
                </span>
                {/* ====================================================
                    OPEN INDICATOR
                ==================================================== */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-all duration-200 group-hover:bg-cyan-400/[0.06] group-hover:text-cyan-300">
                  <ArrowUpRight
                    size={15}
                    strokeWidth={1.6}
                    className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </div>
              </article>
            );
          })
        )}
      </div>
      {/* ============================================================
          FOOTER
      ============================================================ */}
      {visibleInvestigations.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.015] px-5 py-3 lg:px-6">
          <span className="truncate font-mono text-[9px] font-medium uppercase tracking-[0.11em] text-slate-500">
            Evidence trail registry
          </span>
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-300/80">
            <CircleDot size={10} strokeWidth={1.6} />
            SYNCHRONIZED
          </span>
        </div>
      )}
    </section>
  );
}
