"use client";
import {
  Server,
  Database,
  ScanSearch,
  Network,
  CheckCircle2,
  Activity,
  AlertTriangle,
} from "lucide-react";
/* ============================================================
   TYPES
============================================================ */
interface SystemHealthProps {
  health?: {
    backend?: string | null;
    database?: string | null;
    ocr?: string | null;
    graph?: string | null;
  } | null;
}
/* ============================================================
   SAFE HELPERS
============================================================ */
const safeStatus = (value: unknown, fallback = "offline"): string => {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }
  return value.trim();
};
const isUnhealthyStatus = (status: string): boolean => {
  const normalized = status.toLowerCase();
  return ["offline", "error", "failed", "failure", "down", "unavailable"].some(
    (value) => normalized.includes(value),
  );
};
/* ============================================================
   COMPONENT
============================================================ */
export default function SystemHealth({ health = {} }: SystemHealthProps) {
  /* ============================================================
     SYSTEM DEFINITIONS
  ============================================================ */
  const systems = [
    {
      name: "Backend API",
      status: safeStatus(health?.backend),
      icon: Server,
    },
    {
      name: "Database",
      status: safeStatus(health?.database),
      icon: Database,
    },
    {
      name: "OCR Engine",
      status: safeStatus(health?.ocr),
      icon: ScanSearch,
    },
    {
      name: "Graph Engine",
      status: safeStatus(health?.graph, "sync"),
      icon: Network,
    },
  ];
  /* ============================================================
     HEALTH CALCULATION
  ============================================================ */
  const healthyCount = systems.filter(
    (system) => !isUnhealthyStatus(system.status),
  ).length;
  const allHealthy = healthyCount === systems.length;
  const healthPercentage = Math.round((healthyCount / systems.length) * 100);
  /* ============================================================
     COMPONENT
  ============================================================ */
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#071019]/65 shadow-[0_18px_55px_rgba(0,0,0,0.16)] backdrop-blur-xl">
      {/* ============================================================
          TOP TECHNICAL ACCENT
      ============================================================ */}
      <div
        className={`pointer-events-none absolute left-0 right-0 top-0 h-px ${
          allHealthy
            ? "bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"
            : "bg-gradient-to-r from-transparent via-red-400/40 to-transparent"
        }`}
      />
      {/* ============================================================
          HEADER
      ============================================================ */}
      <div className="border-b border-white/[0.07] px-5 py-5 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {/* SECTION LABEL */}
            <div className="mb-2.5 flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${
                    allHealthy ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
                <span
                  className={`relative h-1.5 w-1.5 rounded-full ${
                    allHealthy ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
              </span>
              <span
                className={`font-mono text-[10px] font-semibold uppercase tracking-[0.16em] ${
                  allHealthy ? "text-emerald-300/90" : "text-red-300/90"
                }`}
              >
                Core services
              </span>
            </div>
            {/* TITLE */}
            <h2 className="text-[18px] font-semibold tracking-tight text-slate-100">
              System health
            </h2>
            {/* DESCRIPTION */}
            <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-slate-400">
              Operational status of intelligence infrastructure.
            </p>
          </div>
          {/* ========================================================
              STATUS ICON
          ======================================================== */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              allHealthy
                ? "border-emerald-400/[0.15] bg-emerald-400/[0.04] text-emerald-300"
                : "border-red-400/[0.17] bg-red-400/[0.045] text-red-300"
            }`}
          >
            {allHealthy ? (
              <CheckCircle2 size={18} strokeWidth={1.6} />
            ) : (
              <AlertTriangle size={18} strokeWidth={1.6} />
            )}
          </div>
        </div>
        {/* ============================================================
            HEALTH SUMMARY
        ============================================================ */}
        <div
          className={`relative mt-4 overflow-hidden rounded-xl border px-3.5 py-3 ${
            allHealthy
              ? "border-emerald-400/[0.11] bg-emerald-400/[0.025]"
              : "border-red-400/[0.11] bg-red-400/[0.025]"
          }`}
        >
          {/* TOP TECHNICAL LINE */}
          <div
            className={`absolute left-0 right-0 top-0 h-px ${
              allHealthy
                ? "bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent"
                : "bg-gradient-to-r from-transparent via-red-400/35 to-transparent"
            }`}
          />
          <div className="flex items-center justify-between gap-3">
            {/* SUMMARY LABEL */}
            <div className="flex min-w-0 items-center gap-2">
              <Activity
                size={13}
                strokeWidth={1.7}
                className={`shrink-0 ${
                  allHealthy ? "text-emerald-300" : "text-red-300"
                }`}
              />
              <span className="truncate font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                Service availability
              </span>
            </div>
            {/* SUMMARY VALUE */}
            <span
              className={`shrink-0 font-mono text-[10px] font-semibold tracking-[0.06em] ${
                allHealthy ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {healthyCount}/{systems.length} OPERATIONAL
            </span>
          </div>
          {/* ========================================================
              HEALTH BAR
          ======================================================== */}
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allHealthy ? "bg-emerald-400/70" : "bg-red-400/70"
              }`}
              style={{
                width: `${healthPercentage}%`,
              }}
            />
          </div>
          {/* PERCENTAGE */}
          <div className="mt-2 flex justify-end">
            <span
              className={`font-mono text-[9px] font-semibold tracking-[0.05em] ${
                allHealthy ? "text-emerald-400/80" : "text-red-400/80"
              }`}
            >
              {healthPercentage}% AVAILABLE
            </span>
          </div>
        </div>
      </div>
      {/* ============================================================
          SERVICES
      ============================================================ */}
      <div className="divide-y divide-white/[0.055]">
        {systems.map((system) => {
          const Icon = system.icon;
          const healthy = !isUnhealthyStatus(system.status);
          return (
            <article
              key={system.name}
              className="group relative flex min-h-[82px] items-center gap-3.5 px-5 py-3.5 transition-colors duration-200 hover:bg-white/[0.025] lg:px-6"
            >
              {/* ======================================================
                  SERVICE ACCENT
              ====================================================== */}
              <span
                className={`absolute bottom-0 left-0 top-0 w-[2px] transition-colors duration-200 ${
                  healthy
                    ? "bg-transparent group-hover:bg-emerald-400/80"
                    : "bg-red-500"
                }`}
              />
              {/* ======================================================
                  ICON
              ====================================================== */}
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 ${
                  healthy
                    ? "border-white/[0.08] bg-white/[0.025] text-slate-400 group-hover:border-emerald-400/[0.15] group-hover:bg-emerald-400/[0.035] group-hover:text-emerald-300"
                    : "border-red-500/[0.22] bg-red-500/[0.06] text-red-300"
                }`}
              >
                <Icon size={16} strokeWidth={1.6} />
              </div>
              {/* ======================================================
                  SERVICE INFORMATION
              ====================================================== */}
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-[12px] font-semibold leading-snug text-slate-200">
                  {system.name}
                </strong>
                <span className="mt-1 block truncate font-mono text-[9px] font-medium uppercase tracking-[0.09em] text-slate-500">
                  Intelligence service
                </span>
              </div>
              {/* ======================================================
                  STATUS
              ====================================================== */}
              <div className="flex shrink-0 items-center gap-2">
                {/* STATUS DOT */}
                <span
                  className={`relative flex h-2 w-2 ${
                    !healthy ? "animate-pulse" : ""
                  }`}
                >
                  {healthy && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30" />
                  )}
                  <span
                    className={`relative h-2 w-2 rounded-full ${
                      healthy ? "bg-emerald-400" : "bg-red-500"
                    }`}
                  />
                </span>
                {/* STATUS LABEL */}
                <span
                  className={`font-mono text-[9px] font-semibold uppercase tracking-[0.08em] ${
                    healthy ? "text-emerald-300/90" : "text-red-300"
                  }`}
                >
                  {system.status}
                </span>
              </div>
            </article>
          );
        })}
      </div>
      {/* ============================================================
          FOOTER
      ============================================================ */}
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.015] px-5 py-3 lg:px-6">
        <span className="truncate font-mono text-[9px] font-medium uppercase tracking-[0.11em] text-slate-500">
          Infrastructure monitor
        </span>
        <span
          className={`flex shrink-0 items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.07em] ${
            allHealthy ? "text-emerald-300/90" : "text-red-300"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              allHealthy
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.5)]"
                : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,.5)]"
            }`}
          />
          {allHealthy ? "ALL SYSTEMS NOMINAL" : "ATTENTION REQUIRED"}
        </span>
      </div>
    </section>
  );
}
