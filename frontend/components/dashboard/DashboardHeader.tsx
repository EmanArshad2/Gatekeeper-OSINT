"use client";
import { Radio, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
interface DashboardHeaderProps {
  system?: {
    backend?: string;
    database?: string;
    ocr?: string;
    graph?: string;
  };
  metrics?: {
    high_risk?: number;
    investigations?: number;
    wallets?: number;
    osint_matches?: number;
  };
}
/* ================================================================
   STATUS DOT
================================================================ */
function StatusDot({
  color = "cyan",
}: {
  color?: "cyan" | "red" | "amber" | "green";
}) {
  const colors = {
    cyan: "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,.8)]",
    red: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.8)]",
    amber: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,.8)]",
    green: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]",
  };
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${colors[color]}`}
      />
      <span className={`relative h-1.5 w-1.5 rounded-full ${colors[color]}`} />
    </span>
  );
}
/* ================================================================
   DASHBOARD HEADER
================================================================ */
export default function DashboardHeader({
  system = {},
  metrics = {},
}: DashboardHeaderProps) {
  const highRisk = metrics.high_risk ?? 0;
  const critical = highRisk > 0;
  return (
    <header className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] shadow-2xl backdrop-blur-xl">
      {/* =========================================================
          ATMOSPHERE
      ========================================================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[-180px] h-[380px] w-[600px] rounded-full bg-cyan-500/[0.035] blur-[120px]" />
        <div className="absolute right-[-120px] top-[-100px] h-[320px] w-[420px] rounded-full bg-violet-600/[0.025] blur-[120px]" />
      </div>
      {/* =========================================================
          TOP ACCENT
      ========================================================= */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      {/* =========================================================
          MAIN HEADER
      ========================================================= */}
      <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        {/* =======================================================
            IDENTITY
        ======================================================= */}
        <div className="flex items-center gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] shadow-[0_0_35px_rgba(34,211,238,.08)]">
            <ShieldCheck
              size={22}
              strokeWidth={1.7}
              className="text-cyan-300"
            />
            <span className="absolute -right-1 -top-1">
              <StatusDot color="cyan" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-semibold tracking-[0.24em] text-cyan-300">
                GK COMMAND
              </span>
              <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[8px] font-medium tracking-[0.12em] text-slate-400">
                SECURE
              </span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <span className="h-3 w-px bg-white/10" />
                <span className="font-mono text-[8px] font-medium tracking-[0.14em] text-slate-500">
                  LIVE NODE
                </span>
              </span>
            </div>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Threat Intelligence Command Center
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Intelligence & forensic operations environment
            </p>
          </div>
        </div>
        {/* =======================================================
            THREAT STATE
        ======================================================= */}
        <div
          className={`relative overflow-hidden rounded-2xl border px-4 py-3 ${
            critical
              ? "border-red-400/15 bg-red-500/[0.05]"
              : "border-emerald-400/10 bg-emerald-400/[0.035]"
          }`}
        >
          <div
            className={`absolute inset-y-0 left-0 w-px ${
              critical ? "bg-red-500/70" : "bg-emerald-400/60"
            }`}
          />
          <div className="flex items-center gap-4">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                critical
                  ? "border-red-400/15 bg-red-500/[0.06] text-red-400"
                  : "border-emerald-400/10 bg-emerald-400/[0.05] text-emerald-400"
              }`}
            >
              {critical ? (
                <ShieldAlert size={16} strokeWidth={1.7} />
              ) : (
                <ShieldCheck size={16} strokeWidth={1.7} />
              )}
            </div>
            <div>
              <p className="font-mono text-[9px] font-semibold tracking-[0.16em] text-slate-500">
                THREAT MONITOR
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <StatusDot color={critical ? "red" : "green"} />
                <span
                  className={`font-mono text-[10px] font-semibold tracking-[0.1em] ${
                    critical ? "text-red-300" : "text-emerald-300"
                  }`}
                >
                  {critical ? "ATTENTION REQUIRED" : "SYSTEM CLEAR"}
                </span>
              </div>
              {critical && (
                <p className="mt-1 font-mono text-[9px] font-medium text-red-300/70">
                  {highRisk} HIGH-RISK SIGNAL
                  {highRisk !== 1 ? "S" : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* =======================================================
          INTELLIGENCE STREAM
      ======================================================= */}
      <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.025]">
            <Radio size={14} strokeWidth={1.6} className="text-cyan-400" />
          </div>
          <div>
            <p className="font-mono text-[9px] font-semibold tracking-[0.16em] text-slate-500">
              INTELLIGENCE STREAM
            </p>
            <div className="mt-1 flex items-center gap-2">
              <StatusDot color="green" />
              <span className="font-mono text-[9px] font-semibold tracking-[0.08em] text-emerald-300/90">
                COLLECTION ACTIVE
              </span>
            </div>
          </div>
        </div>
        <div className="hidden items-end gap-1 sm:flex">
          {[18, 28, 22, 38, 26, 44, 32, 50, 36, 42].map((height, index) => (
            <span
              key={index}
              className="w-1 rounded-full bg-cyan-400/30"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
/* ================================================================
   SYSTEM STATE
================================================================ */
function SystemState({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  const normalized = value.toLowerCase();
  const healthy = !["offline", "error", "failed", "disconnected"].includes(
    normalized,
  );
  return (
    <div className="flex min-h-[62px] items-center gap-3 px-4 py-3">
      {/* Icon */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
          healthy
            ? "border-cyan-400/10 bg-cyan-400/[0.025] text-cyan-400/80"
            : "border-red-400/10 bg-red-400/[0.025] text-red-400/80"
        }`}
      >
        {icon}
      </div>
      {/* Information */}
      <div className="min-w-0">
        <p className="font-mono text-[9px] font-semibold tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              healthy
                ? "bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.35)]"
                : "bg-red-400 shadow-[0_0_7px_rgba(248,113,113,.35)]"
            }`}
          />
          <span
            className={`truncate font-mono text-[9px] font-semibold tracking-[0.05em] ${
              healthy ? "text-emerald-300/90" : "text-red-300/90"
            }`}
          >
            {value.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
