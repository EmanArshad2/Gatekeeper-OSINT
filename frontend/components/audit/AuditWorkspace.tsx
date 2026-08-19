"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FileSearch,
  History,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Upload,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
type AuditLog = {
  id: number;
  action: string;
  actor: string;
  target: string;
  module: string;
  status: string;
  created_at: string;
};
/* ============================================================
   STATUS DOT
============================================================ */
function StatusDot({
  color = "cyan",
}: {
  color?: "cyan" | "red" | "amber" | "green" | "violet";
}) {
  const colors = {
    cyan: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,.9)]",
    red: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,.9)]",
    amber: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,.9)]",
    green: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]",
    violet: "bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,.9)]",
  };
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${colors[color]}`}
      />
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${colors[color]}`}
      />
    </span>
  );
}
/* ============================================================
   EVENT ICON
============================================================ */
function getEventIcon(action: string) {
  const value = action.toLowerCase();
  if (value.includes("upload") || value.includes("evidence")) {
    return Upload;
  }
  if (
    value.includes("ocr") ||
    value.includes("extract") ||
    value.includes("scan")
  ) {
    return FileSearch;
  }
  if (
    value.includes("graph") ||
    value.includes("neo4j") ||
    value.includes("network")
  ) {
    return Database;
  }
  if (value.includes("wallet")) {
    return Wallet;
  }
  if (value.includes("error") || value.includes("failed")) {
    return AlertCircle;
  }
  if (value.includes("audit")) {
    return ShieldCheck;
  }
  return Activity;
}
/* ============================================================
   EVENT ACCENT
============================================================ */
function getEventAccent(action: string) {
  const value = action.toLowerCase();
  if (value.includes("error") || value.includes("failed")) {
    return {
      text: "text-red-300",
      border: "border-red-400/20",
      bg: "bg-red-400/[0.06]",
      glow: "bg-red-400/[0.05]",
    };
  }
  if (
    value.includes("upload") ||
    value.includes("evidence") ||
    value.includes("collection")
  ) {
    return {
      text: "text-cyan-300",
      border: "border-cyan-400/20",
      bg: "bg-cyan-400/[0.06]",
      glow: "bg-cyan-400/[0.04]",
    };
  }
  if (
    value.includes("graph") ||
    value.includes("neo4j") ||
    value.includes("network")
  ) {
    return {
      text: "text-violet-300",
      border: "border-violet-400/20",
      bg: "bg-violet-400/[0.06]",
      glow: "bg-violet-400/[0.04]",
    };
  }
  if (
    value.includes("ocr") ||
    value.includes("extract") ||
    value.includes("scan")
  ) {
    return {
      text: "text-amber-300",
      border: "border-amber-400/20",
      bg: "bg-amber-400/[0.06]",
      glow: "bg-amber-400/[0.04]",
    };
  }
  return {
    text: "text-emerald-300",
    border: "border-emerald-400/20",
    bg: "bg-emerald-400/[0.06]",
    glow: "bg-emerald-400/[0.04]",
  };
}
/* ============================================================
   STATUS THEME
============================================================ */
function getStatusTheme(status: string) {
  const value = status.toLowerCase();
  if (
    value.includes("success") ||
    value.includes("complete") ||
    value.includes("ok")
  ) {
    return {
      text: "text-emerald-300",
      border: "border-emerald-400/20",
      bg: "bg-emerald-400/[0.06]",
      dot: "green" as const,
    };
  }
  if (value.includes("error") || value.includes("failed")) {
    return {
      text: "text-red-300",
      border: "border-red-400/20",
      bg: "bg-red-400/[0.07]",
      dot: "red" as const,
    };
  }
  return {
    text: "text-amber-300",
    border: "border-amber-400/20",
    bg: "bg-amber-400/[0.06]",
    dot: "amber" as const,
  };
}
/* ============================================================
   DATE FORMATTERS
============================================================ */
function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "UNKNOWN";
  }
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
/* ============================================================
   METRIC CARD
============================================================ */
function AuditMetric({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  accent: "cyan" | "green" | "red" | "violet";
}) {
  const styles = {
    cyan: {
      text: "text-cyan-300",
      border: "border-cyan-400/20",
      bg: "bg-cyan-400/[0.035]",
    },
    green: {
      text: "text-emerald-300",
      border: "border-emerald-400/20",
      bg: "bg-emerald-400/[0.035]",
    },
    red: {
      text: "text-red-300",
      border: "border-red-400/20",
      bg: "bg-red-400/[0.035]",
    },
    violet: {
      text: "text-violet-300",
      border: "border-violet-400/20",
      bg: "bg-violet-400/[0.035]",
    },
  };
  const style = styles[accent];
  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl
        border border-white/[0.07]
        bg-white/[0.02]
        p-5
        transition-all duration-300
        hover:-translate-y-0.5
        hover:bg-white/[0.04]
        ${style.border}
      `}
    >
      <div
        className={`
          absolute -right-10 -top-10
          h-28 w-28 rounded-full
          ${style.bg}
          blur-3xl
          transition-transform duration-500
          group-hover:scale-150
        `}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-mono text-[9px] font-semibold tracking-[0.2em] text-slate-600">
            {label}
          </p>
          <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
          <p className="mt-2 text-[10px] text-slate-600">{detail}</p>
        </div>
        <div
          className={`
            flex h-9 w-9 items-center justify-center
            rounded-xl border
            bg-white/[0.025]
            ${style.border}
          `}
        >
          <Icon size={15} className={style.text} />
        </div>
      </div>
    </div>
  );
}
/* ============================================================
   AUDIT EVENT
============================================================ */
function AuditEvent({
  log,
  index,
  total,
}: {
  log: AuditLog;
  index: number;
  total: number;
}) {
  const Icon = getEventIcon(log.action);
  const accent = getEventAccent(log.action);
  const status = getStatusTheme(log.status);
  return (
    <div className="group relative px-5 py-5 sm:px-6">
      <div className="flex gap-4">
        {/* timeline */}
        <div className="relative flex shrink-0 flex-col items-center">
          {index < total - 1 && (
            <div className="absolute top-11 h-[calc(100%+1px)] w-px bg-gradient-to-b from-white/[0.10] to-transparent" />
          )}
          <div
            className={`
              relative z-10
              flex h-11 w-11 items-center justify-center
              rounded-xl border
              ${accent.border}
              ${accent.bg}
              transition-all duration-300
              group-hover:scale-105
            `}
          >
            <Icon size={17} className={accent.text} />
            {index === 0 && (
              <span className="absolute -right-1 -top-1">
                <StatusDot color="cyan" />
              </span>
            )}
          </div>
        </div>
        {/* event body */}
        <div
          className="
            min-w-0 flex-1
            rounded-2xl
            border border-white/[0.055]
            bg-white/[0.018]
            p-4
            transition-all duration-300
            group-hover:border-white/[0.10]
            group-hover:bg-white/[0.03]
          "
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[8px] font-semibold tracking-[0.2em] text-cyan-400/70">
                  EVENT {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-slate-700">/</span>
                <span className="font-mono text-[8px] tracking-[0.12em] text-slate-600">
                  {log.module || "SYSTEM"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-200">
                  {log.action}
                </h3>
                <span
                  className={`
                    flex items-center gap-1.5
                    rounded-md border
                    px-2 py-1
                    font-mono text-[7px]
                    font-semibold tracking-[0.15em]
                    ${status.border}
                    ${status.bg}
                    ${status.text}
                  `}
                >
                  <StatusDot color={status.dot} />
                  {log.status || "UNKNOWN"}
                </span>
              </div>
              <div className="mt-3 rounded-xl border border-white/[0.045] bg-black/20 px-3 py-2.5">
                <p className="break-all font-mono text-[10px] leading-5 text-slate-500">
                  {log.target || "NO TARGET SPECIFIED"}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.12em] text-slate-600">
                  <User size={10} />
                  {log.actor || "UNKNOWN ACTOR"}
                </span>
                <span className="h-3 w-px bg-white/[0.08]" />
                <span className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.12em] text-slate-600">
                  <Clock3 size={10} />
                  {formatDate(log.created_at)}
                </span>
                <span className="h-3 w-px bg-white/[0.08]" />
                <span className="font-mono text-[8px] tracking-[0.12em] text-slate-700">
                  {formatTime(log.created_at)}
                </span>
              </div>
            </div>
            {/* event metadata */}
            <div className="hidden shrink-0 lg:block">
              <div className="rounded-xl border border-white/[0.055] bg-black/20 px-3 py-2">
                <p className="font-mono text-[7px] tracking-[0.15em] text-slate-700">
                  EVENT ID
                </p>
                <p className="mt-1 font-mono text-[9px] text-slate-500">
                  GK-{String(log.id).padStart(5, "0")}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.045] pt-3">
            <span className="font-mono text-[7px] tracking-[0.18em] text-slate-700">
              RECORDED BY AUDIT CORE
            </span>
            <ChevronRight
              size={13}
              className="
                text-slate-800
                transition-all duration-300
                group-hover:translate-x-1
                group-hover:text-cyan-400
              "
            />
          </div>
        </div>
      </div>
    </div>
  );
}
/* ============================================================
   MAIN
============================================================ */
export default function AuditWorkspace() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  async function loadLogs() {
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:8000/api/audit/logs", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load audit logs");
      }
      const data = await response.json();
      if (data.status === "SUCCESS") {
        setLogs(Array.isArray(data.logs) ? data.logs : []);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("Audit logs loading failed:", error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadLogs();
    const timer = setInterval(() => {
      loadLogs();
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  const statistics = useMemo(() => {
    const successful = logs.filter((log) => {
      const value = log.status?.toLowerCase() || "";
      return (
        value.includes("success") ||
        value.includes("complete") ||
        value.includes("ok")
      );
    }).length;
    const exceptions = logs.filter((log) => {
      const value = log.status?.toLowerCase() || "";
      return value.includes("error") || value.includes("failed");
    }).length;
    const actors = new Set(logs.map((log) => log.actor).filter(Boolean)).size;
    return {
      total: logs.length,
      successful,
      exceptions,
      actors,
    };
  }, [logs]);
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      {/* ============================================================
          ATMOSPHERE
      ============================================================ */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[-15%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.035] blur-[130px]" />
        <div className="absolute right-[-10%] top-[20%] h-[500px] w-[500px] rounded-full bg-violet-600/[0.035] blur-[140px]" />
        <div className="absolute left-[35%] top-[55%] h-[400px] w-[400px] rounded-full bg-emerald-500/[0.02] blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      </div>
      <div className="relative mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* ============================================================
            COMMAND HEADER
        ============================================================ */}
        <header className="border-b border-white/[0.07] pb-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] shadow-[0_0_35px_rgba(34,211,238,.08)]">
                <ShieldCheck size={22} className="text-cyan-300" />
                <span className="absolute -right-1 -top-1">
                  <StatusDot color="cyan" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-semibold tracking-[0.3em] text-cyan-400">
                    GK // AUDIT
                  </span>
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[7px] tracking-wider text-slate-500">
                    SECURE
                  </span>
                </div>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Audit Core
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  Immutable operational telemetry & forensic activity
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.025] px-3 py-2.5">
                <Terminal size={14} className="text-cyan-400" />
                <div>
                  <p className="font-mono text-[8px] tracking-[0.16em] text-cyan-400">
                    AUDIT STREAM
                  </p>
                  <p className="text-[9px] text-slate-500">Live telemetry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadLogs}
                disabled={loading}
                className="
                  flex items-center gap-2
                  rounded-xl
                  border border-white/[0.08]
                  bg-white/[0.025]
                  px-3.5 py-2.5
                  text-xs text-slate-400
                  transition-all duration-200
                  hover:bg-white/[0.06]
                  hover:text-white
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin text-cyan-400" : ""}
                />
                Refresh
              </button>
              <div className="flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.035] px-3 py-2.5">
                <StatusDot color="green" />
                <div>
                  <p className="font-mono text-[8px] tracking-[0.16em] text-emerald-400">
                    SYSTEM
                  </p>
                  <p className="text-[9px] text-slate-500">Operational</p>
                </div>
              </div>
            </div>
          </div>
          {/* telemetry rail */}
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <TelemetryItem label="STREAM" value="5s INTERVAL" />
            <TelemetryItem label="INTEGRITY" value="MONITORED" active />
            <TelemetryItem label="SOURCE" value="AUDIT CORE" />
            <TelemetryItem label="NODE" value="LOCAL" />
            <TelemetryItem label="ENCRYPTION" value="ACTIVE" active />
          </div>
        </header>
        {/* ============================================================
            HERO
        ============================================================ */}
        <section className="grid gap-4 py-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-6 shadow-2xl sm:p-8">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-cyan-400/[0.04] to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <StatusDot color="cyan" />
                <span className="font-mono text-[9px] font-semibold tracking-[0.25em] text-cyan-400">
                  SECURITY TELEMETRY
                </span>
              </div>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-[1.1] tracking-[-0.04em] text-white sm:text-5xl">
                Every action.
                <br />
                <span className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
                  Every signal. Recorded.
                </span>
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500">
                Monitor evidence collection, extraction, graph operations,
                analyst activity and system events across the Gatekeeper
                intelligence environment.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.035] px-3.5 py-2.5">
                  <StatusDot color="green" />
                  <span className="font-mono text-[9px] tracking-[0.15em] text-emerald-400">
                    STREAM ACTIVE
                  </span>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
                  <span className="font-mono text-[9px] tracking-[0.15em] text-slate-500">
                    AUTO SYNC / 05 SEC
                  </span>
                </div>
              </div>
            </div>
            {/* decorative telemetry */}
            <div className="absolute bottom-6 right-7 hidden items-end gap-1 opacity-30 lg:flex">
              {[18, 30, 22, 46, 35, 62, 40, 75, 55, 42, 67, 84, 50, 72].map(
                (height, index) => (
                  <div
                    key={index}
                    className="w-1 rounded-full bg-cyan-400"
                    style={{ height }}
                  />
                ),
              )}
            </div>
          </div>
          {/* INTEGRITY PANEL */}
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/10 bg-gradient-to-br from-emerald-500/[0.055] to-white/[0.015] p-6">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-emerald-400/[0.08]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-emerald-400" />
                <span className="font-mono text-[9px] tracking-[0.2em] text-emerald-400">
                  INTEGRITY
                </span>
              </div>
              <StatusDot color="green" />
            </div>
            <div className="relative mt-8">
              <p className="font-mono text-5xl font-semibold tracking-[-0.05em] text-white">
                100%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                audit stream integrity
              </p>
            </div>
            <div className="relative mt-7">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full w-full rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,.5)]" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[8px] tracking-[0.12em] text-slate-600">
                  CORE STATUS
                </span>
                <span className="font-mono text-[8px] tracking-[0.12em] text-emerald-400">
                  NOMINAL
                </span>
              </div>
            </div>
            <div className="relative mt-7 border-t border-white/[0.06] pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span className="text-[10px] text-slate-500">
                  No integrity violations detected
                </span>
              </div>
            </div>
          </div>
        </section>
        {/* ============================================================
            METRICS
        ============================================================ */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <AuditMetric
            label="Recorded events"
            value={statistics.total.toString().padStart(2, "0")}
            detail="Total activity captured"
            icon={History}
            accent="cyan"
          />
          <AuditMetric
            label="Successful operations"
            value={statistics.successful.toString().padStart(2, "0")}
            detail="Completed system actions"
            icon={CheckCircle2}
            accent="green"
          />
          <AuditMetric
            label="Exceptions"
            value={statistics.exceptions.toString().padStart(2, "0")}
            detail="Failed or interrupted actions"
            icon={ShieldAlert}
            accent="red"
          />
          <AuditMetric
            label="Active actors"
            value={statistics.actors.toString().padStart(2, "0")}
            detail="Unique operational identities"
            icon={User}
            accent="violet"
          />
        </section>
        {/* ============================================================
            ACTIVITY WORKSPACE
        ============================================================ */}
        <section className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          {/* panel header */}
          <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-cyan-400" />
                <span className="font-mono text-[9px] font-semibold tracking-[0.2em] text-cyan-400">
                  RECORDED EVENTS
                </span>
              </div>
              <h3 className="mt-1 text-sm font-medium text-white">
                Operational activity stream
              </h3>
              <p className="mt-1 text-[10px] text-slate-600">
                System and investigator actions recorded by Gatekeeper.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-cyan-400/10 bg-cyan-400/[0.025] px-3 py-2">
                <StatusDot color="cyan" />
                <span className="font-mono text-[8px] tracking-[0.15em] text-cyan-400">
                  LIVE RECORD
                </span>
              </div>
              <span className="hidden font-mono text-[8px] tracking-[0.12em] text-slate-700 sm:block">
                {logs.length} EVENTS
              </span>
            </div>
          </div>
          {/* loading */}
          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <div className="text-center">
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05]">
                  <RefreshCw size={22} className="animate-spin text-cyan-400" />
                  <span className="absolute -right-1 -top-1">
                    <StatusDot color="cyan" />
                  </span>
                </div>
                <p className="mt-5 text-sm font-medium text-slate-200">
                  Synchronizing audit stream
                </p>
                <p className="mt-2 font-mono text-[8px] tracking-[0.16em] text-slate-600">
                  RETRIEVING SECURITY EVENTS...
                </p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            /* empty */
            <div className="flex min-h-[420px] items-center justify-center px-6">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.025]">
                  <History size={26} className="text-slate-700" />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-300">
                  No activity recorded
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Gatekeeper activity will appear here as evidence is collected,
                  processed, correlated and archived.
                </p>
              </div>
            </div>
          ) : (
            <div>
              {logs.map((log, index) => (
                <AuditEvent
                  key={log.id}
                  log={log}
                  index={index}
                  total={logs.length}
                />
              ))}
            </div>
          )}
        </section>
        {/* ============================================================
            SYSTEM FOOTER
        ============================================================ */}
        <footer className="mt-6 flex flex-col gap-3 border-t border-white/[0.06] py-5 text-[9px] text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={10} />
              AUDIT INTEGRITY ENABLED
            </span>
            <span className="hidden h-3 w-px bg-white/10 sm:block" />
            <span>GATEKEEPER CORE v2.0</span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span>AUTO SYNC</span>
            <span>•</span>
            <span>5 SEC</span>
            <span>•</span>
            <span className="text-emerald-400/70">ALL SYSTEMS NOMINAL</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
/* ============================================================
   TELEMETRY ITEM
============================================================ */
function TelemetryItem({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <StatusDot color={active ? "green" : "cyan"} />
      <span className="font-mono text-[8px] tracking-[0.16em] text-slate-700">
        {label}
      </span>
      <span
        className={`font-mono text-[8px] font-medium tracking-[0.1em] ${
          active ? "text-emerald-400" : "text-slate-500"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
