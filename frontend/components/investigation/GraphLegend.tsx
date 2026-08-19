"use client";
import {
  AlertTriangle,
  Circle,
  CircleDot,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from "lucide-react";
interface GraphLegendProps {
  className?: string;
}
export default function GraphLegend({ className = "" }: GraphLegendProps) {
  return (
    <div
      className={`
        pointer-events-auto
        relative
        overflow-hidden
        rounded-2xl
        border
        border-white/[0.07]
        bg-white/[0.025]
        shadow-[0_12px_30px_rgba(0,0,0,0.35)]
        backdrop-blur-xl
        ${className}
      `}
    >
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06]">
            <CircleDot size={12} className="text-cyan-400" strokeWidth={1.8} />
          </div>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Graph Legend
          </span>
        </div>
        <span className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-emerald-400">
          Live
        </span>
      </div>
      <div className="space-y-4 p-4">
        {/* Entity */}
        <LegendSection title="ENTITY STATUS">
          <LegendItem
            icon={
              <div className="flex h-6 w-6 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/[0.08] backdrop-blur-xl">
                <Wallet size={11} className="text-cyan-300" />
              </div>
            }
            label="Wallet / Entity"
            description="Tracked blockchain entity"
          />
          <LegendItem
            icon={
              <div className="relative flex h-6 w-6 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-cyan-400/70 animate-pulse" />
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
              </div>
            }
            label="Root Entity"
            description="Investigation origin"
          />
        </LegendSection>
        {/* Risk */}
        <LegendSection title="RISK CLASSIFICATION">
          <RiskItem
            color="bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
            label="LOW"
            range="0–39"
          />
          <RiskItem
            color="bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
            label="MEDIUM"
            range="40–69"
          />
          <RiskItem
            color="bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]"
            label="HIGH"
            range="70–89"
          />
          <RiskItem
            color="bg-red-500 shadow-[0_0_8px_rgba(248,113,113,0.5)]"
            label="CRITICAL"
            range="90–100"
          />
        </LegendSection>
        {/* Indicators */}
        <LegendSection title="INDICATORS">
          <LegendItem
            icon={
              <div className="flex h-6 w-6 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/[0.06]">
                <AlertTriangle size={12} className="text-red-400" />
              </div>
            }
            label="Threat Flag"
            description="Elevated risk signature"
          />
          <LegendItem
            icon={
              <div className="flex h-6 w-6 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/[0.06]">
                <ShieldAlert size={12} className="text-orange-400" />
              </div>
            }
            label="High Risk"
            description="Risk score ≥ 70"
          />
          <LegendItem
            icon={
              <div className="flex h-6 w-6 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06]">
                <ShieldCheck size={12} className="text-emerald-400" />
              </div>
            }
            label="Monitored"
            description="No elevated threat"
          />
        </LegendSection>
        {/* Connection */}
        <LegendSection title="RELATIONSHIPS">
          <LegendItem
            icon={
              <div className="flex h-6 w-6 items-center justify-center">
                <span className="relative h-px w-5 bg-slate-500">
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 border-y-[3px] border-l-[4px] border-y-transparent border-l-slate-500" />
                </span>
              </div>
            }
            label="Transaction"
            description="Directed wallet flow"
          />
          <LegendItem
            icon={
              <div className="flex h-6 w-6 items-center justify-center">
                <span className="h-px w-5 bg-cyan-400/60 shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
              </div>
            }
            label="Active Link"
            description="Selected relationship"
          />
        </LegendSection>
      </div>
      {/* Footer */}
      <div className="border-t border-white/[0.06] bg-white/[0.015] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-slate-500">
            Forensic Topology Mode
          </span>
        </div>
      </div>
    </div>
  );
}
/* =========================================================
   LEGEND SECTION
   ========================================================= */
function LegendSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
/* =========================================================
   GENERIC LEGEND ITEM
   ========================================================= */
function LegendItem({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-white/[0.06] hover:bg-white/[0.03]">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[9px] font-semibold tracking-wide text-slate-200">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 truncate font-mono text-[8px] text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
/* =========================================================
   RISK ITEM
   ========================================================= */
function RiskItem({
  color,
  label,
  range,
}: {
  color: string;
  label: string;
  range: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-white/[0.06] hover:bg-white/[0.03]">
      <div className="flex items-center gap-3">
        <span
          className={`
            h-2
            w-2
            rounded-full
            ${color}
          `}
        />
        <span className="font-mono text-[9px] font-semibold tracking-wide text-slate-200">
          {label}
        </span>
      </div>
      <span className="font-mono text-[8px] text-slate-500">{range}</span>
    </div>
  );
}
