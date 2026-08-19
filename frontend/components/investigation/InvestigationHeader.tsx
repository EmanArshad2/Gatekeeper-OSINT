"use client";
import {
  ShieldAlert,
  CalendarDays,
  Activity,
  Download,
  RefreshCw,
  Database,
  Radio,
} from "lucide-react";
interface Props {
  caseId?: string;
  title?: string;
  status?: string;
  analyst?: string;
  createdAt?: string;
  nodeCount?: number;
  edgeCount?: number;
  onRefresh?: () => void;
  onExport?: () => void;
}
export default function InvestigationHeader({
  caseId = "GK-0001",
  title = "Crypto Investigation",
  status = "ACTIVE",
  analyst = "SOC Analyst",
  createdAt = new Date().toLocaleString(),
  nodeCount = 0,
  edgeCount = 0,
  onRefresh,
  onExport,
}: Props) {
  const normalizedStatus = status.toUpperCase();
  const isActive =
    normalizedStatus === "ACTIVE" ||
    normalizedStatus === "LIVE" ||
    normalizedStatus === "MONITORING";
  return (
    <section className="relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#080d17]/85 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      {/* Ambient accents */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.06),transparent_28%),radial-gradient(circle_at_100%_100%,rgba(139,92,246,0.04),transparent_30%)]" />
      {/* Top telemetry line */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      {/* Header */}
      <div className="relative flex min-w-0 flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        {/* =====================================================
            CASE IDENTITY
            ===================================================== */}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3.5">
            {/* Threat icon */}
            <div
              className="
                relative
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-red-400/20
                bg-red-400/[0.05]
                shadow-[0_0_20px_rgba(248,113,113,0.06)]
              "
            >
              <ShieldAlert size={18} className="text-red-400" />
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.9)]" />
              </span>
            </div>
            <div className="min-w-0">
              {/* System label */}
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-[7px] font-semibold tracking-[0.24em] text-cyan-400/70">
                  GATEKEEPER / INVESTIGATION CORE
                </span>
                <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
                <span className="hidden font-mono text-[7px] tracking-[0.18em] text-slate-600 sm:block">
                  CASE MANAGEMENT
                </span>
              </div>
              {/* Title */}
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <h1 className="truncate text-base font-semibold tracking-tight text-slate-100 sm:text-lg">
                  {title}
                </h1>
                <span className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.07] px-2 py-0.5 font-mono text-[7px] font-bold tracking-[0.16em] text-cyan-300">
                  FORENSIC CASE
                </span>
              </div>
              {/* Metadata */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[8px] text-slate-500">
                <span>
                  CASE <span className="text-slate-200">{caseId}</span>
                </span>
                <span>
                  ANALYST <span className="text-slate-200">{analyst}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={10} className="text-cyan-400/60" />
                  <span className="text-slate-400">{createdAt}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* =====================================================
            TELEMETRY / ACTIONS
            ===================================================== */}
        <div className="relative flex min-w-0 flex-wrap items-center gap-2">
          {/* Status */}
          <div
            className={`
              flex
              items-center
              gap-2
              rounded-xl
              border
              px-3
              py-2
              ${
                isActive
                  ? "border-emerald-400/20 bg-emerald-400/[0.06] shadow-[0_0_15px_rgba(52,211,153,0.06)]"
                  : "border-amber-400/20 bg-amber-400/[0.06]"
              }
            `}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`
                  absolute
                  inline-flex
                  h-full
                  w-full
                  animate-ping
                  rounded-full
                  opacity-40
                  ${isActive ? "bg-emerald-400" : "bg-amber-400"}
                `}
              />
              <span
                className={`
                  relative
                  inline-flex
                  h-1.5
                  w-1.5
                  rounded-full
                  ${
                    isActive
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                      : "bg-amber-400"
                  }
                `}
              />
            </span>
            <span
              className={`
                font-mono
                text-[8px]
                font-bold
                tracking-[0.14em]
                ${isActive ? "text-emerald-300" : "text-amber-300"}
              `}
            >
              {normalizedStatus}
            </span>
          </div>
          {/* Node telemetry */}
          <div className="flex items-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] px-3 py-2">
            <Activity size={13} className="text-cyan-400" />
            <div className="font-mono text-[8px] text-slate-500">
              <span className="text-cyan-300">{nodeCount}</span> NODES
              <span className="mx-1.5 text-slate-700">/</span>
              <span className="text-cyan-300">{edgeCount}</span> EDGES
            </div>
          </div>
          {/* Sync state */}
          <div className="hidden items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-2 xl:flex">
            <Radio size={12} className="text-slate-500" />
            <span className="font-mono text-[7px] font-semibold tracking-[0.12em] text-slate-500">
              GRAPH SYNC
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.7)]" />
          </div>
          {/* Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh investigation"
            aria-label="Refresh investigation"
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-white/[0.08]
              bg-white/[0.02]
              text-slate-500
              transition-all
              duration-200
              hover:border-cyan-400/30
              hover:bg-cyan-400/[0.05]
              hover:text-cyan-300
              hover:shadow-[0_0_15px_rgba(34,211,238,0.08)]
              active:scale-95
            "
          >
            <RefreshCw size={14} />
          </button>
          {/* Export */}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              title="Export investigation"
              aria-label="Export investigation"
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-white/[0.08]
                bg-white/[0.02]
                text-slate-500
                transition-all
                duration-200
                hover:border-emerald-400/30
                hover:bg-emerald-400/[0.05]
                hover:text-emerald-300
                hover:shadow-[0_0_15px_rgba(52,211,153,0.08)]
                active:scale-95
              "
            >
              <Download size={14} />
            </button>
          )}
        </div>
      </div>
      {/* =====================================================
          TELEMETRY STRIP
          ===================================================== */}
      <div className="relative grid grid-cols-3 divide-x divide-white/[0.05] border-t border-white/[0.05] bg-white/[0.01]">
        <TelemetryItem label="CASE STATUS" value={normalizedStatus} status />
        <TelemetryItem label="ENTITY COUNT" value={String(nodeCount)} />
        <TelemetryItem label="RELATIONSHIPS" value={String(edgeCount)} />
      </div>
    </section>
  );
}
/* =============================================================
   TELEMETRY ITEM
   ============================================================= */
function TelemetryItem({
  label,
  value,
  status = false,
}: {
  label: string;
  value: string;
  status?: boolean;
}) {
  return (
    <div className="min-w-0 px-4 py-2.5 sm:px-5">
      <div className="font-mono text-[6px] font-semibold tracking-[0.2em] text-slate-600">
        {label}
      </div>
      <div
        className={`
          mt-1
          truncate
          font-mono
          text-[8px]
          font-bold
          tracking-wider
          ${status ? "text-emerald-400" : "text-slate-300"}
        `}
      >
        {value}
      </div>
    </div>
  );
}
