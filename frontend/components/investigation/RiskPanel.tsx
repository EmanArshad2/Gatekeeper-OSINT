"use client";
import {
  AlertTriangle,
  Activity,
  Database,
  Network,
  ShieldAlert,
  Wallet,
  Radio,
  Layers3,
} from "lucide-react";
interface RiskPanelProps {
  riskScore: number;
  indicators: number;
  osintMatches: number;
  nodeCount: number;
  edgeCount: number;
  suspiciousWallets: number;
  transactions: number;
  // Investigation depth telemetry
  investigationDepth?: number;
  depthCounts?: Record<number, number>;
}
export default function RiskPanel({
  riskScore,
  indicators,
  osintMatches,
  nodeCount,
  edgeCount,
  suspiciousWallets,
  transactions,
  investigationDepth = 1,
  depthCounts = {},
}: RiskPanelProps) {
  function riskLabel(score: number) {
    if (score >= 90) return "CRITICAL";
    if (score >= 70) return "HIGH";
    if (score >= 40) return "MEDIUM";
    return "LOW";
  }
  function riskColor(score: number) {
    if (score >= 90) return "text-red-400";
    if (score >= 70) return "text-orange-400";
    if (score >= 40) return "text-amber-300";
    return "text-emerald-400";
  }
  function riskBar(score: number) {
    if (score >= 90) return "bg-red-400";
    if (score >= 70) return "bg-orange-400";
    if (score >= 40) return "bg-amber-300";
    return "bg-emerald-400";
  }
  const depthOne = depthCounts[1] ?? 0;
  const depthTwo = depthCounts[2] ?? 0;
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#080d17]/80 backdrop-blur-xl">
      {/* TOP ACCENT */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/[0.05]">
            <ShieldAlert size={14} className="text-red-400" />
          </div>
          <div>
            <div className="font-mono text-[9px] font-semibold tracking-[0.18em] text-slate-500">
              THREAT INTELLIGENCE
            </div>
            <div className="text-xs font-semibold text-slate-200">
              Investigation telemetry
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[8px] tracking-wider text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.6)]" />
          LIVE
        </div>
      </div>
      {/* PRIMARY METRICS */}
      <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.05] sm:grid-cols-4 lg:grid-cols-8 lg:divide-y-0">
        <Metric
          icon={<ShieldAlert size={13} />}
          label="Risk Score"
          value={`${riskScore}/100`}
          color={riskColor(riskScore)}
        />
        <Metric
          icon={<AlertTriangle size={13} />}
          label="Threat"
          value={riskLabel(riskScore)}
          color={riskColor(riskScore)}
        />
        <Metric
          icon={<Activity size={13} />}
          label="Indicators"
          value={indicators}
          color="text-cyan-300"
        />
        <Metric
          icon={<Radio size={13} />}
          label="OSINT"
          value={osintMatches}
          color="text-violet-300"
        />
        <Metric
          icon={<Wallet size={13} />}
          label="Wallet Nodes"
          value={nodeCount}
          color="text-sky-300"
        />
        <Metric
          icon={<Network size={13} />}
          label="Transactions"
          value={transactions}
          color="text-cyan-300"
        />
        <Metric
          icon={<Database size={13} />}
          label="Graph Links"
          value={edgeCount}
          color="text-slate-300"
        />
        <Metric
          icon={<AlertTriangle size={13} />}
          label="High Risk"
          value={suspiciousWallets}
          color="text-red-400"
        />
      </div>
      {/* INVESTIGATION DEPTH TELEMETRY */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-t border-white/[0.05]">
        <DepthMetric
          label="ACTIVE DEPTH"
          value={`LEVEL ${investigationDepth}`}
          icon={<Layers3 size={12} />}
          color="text-cyan-300"
        />
        <DepthMetric
          label="DEPTH 1"
          value={depthOne}
          icon={<Network size={12} />}
          color="text-sky-300"
        />
        <DepthMetric
          label="DEPTH 2"
          value={depthTwo}
          icon={<Network size={12} />}
          color="text-violet-300"
        />
      </div>
      {/* DEPTH VISUALIZATION */}
      {investigationDepth > 1 && (
        <div className="border-t border-white/[0.05] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers3 size={12} className="text-cyan-400" />
              <span className="font-mono text-[8px] font-semibold tracking-[0.15em] text-slate-500">
                INVESTIGATION EXPANSION
              </span>
            </div>
            <span className="font-mono text-[8px] font-bold tracking-wider text-cyan-400">
              {investigationDepth} LEVELS
            </span>
          </div>
          <div className="mt-2 flex h-1 overflow-hidden rounded-full bg-white/[0.04]">
            {Array.from(
              { length: investigationDepth + 1 },
              (_, index) => index,
            ).map((level) => {
              const count = level === 0 ? 1 : (depthCounts[level] ?? 0);
              const width =
                nodeCount > 0 ? Math.max((count / nodeCount) * 100, 2) : 0;
              return (
                <div
                  key={level}
                  className={`h-full ${
                    level === 0
                      ? "bg-emerald-400"
                      : level === 1
                        ? "bg-cyan-400"
                        : "bg-violet-400"
                  }`}
                  style={{
                    width: `${width}%`,
                  }}
                  title={`Depth ${level}: ${count} nodes`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {Array.from({ length: investigationDepth + 1 }, (_, level) => {
              const count = level === 0 ? 1 : (depthCounts[level] ?? 0);
              return (
                <div
                  key={level}
                  className="flex items-center gap-1.5 font-mono text-[7px] text-slate-600"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      level === 0
                        ? "bg-emerald-400"
                        : level === 1
                          ? "bg-cyan-400"
                          : "bg-violet-400"
                    }`}
                  />
                  LEVEL {level}
                  <span className="text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* RISK BAR */}
      <div className="border-t border-white/[0.05] px-4 py-2.5">
        <div className="flex items-center justify-between font-mono text-[8px] tracking-wider">
          <span className="text-slate-600">THREAT INDEX</span>
          <span className={riskColor(riskScore)}>{riskLabel(riskScore)}</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className={`h-full rounded-full transition-all ${riskBar(
              riskScore,
            )}`}
            style={{
              width: `${Math.min(Math.max(riskScore, 0), 100)}%`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
function Metric({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="min-w-0 px-3 py-3 transition-colors hover:bg-white/[0.01]">
      <div className="flex items-center gap-1.5 text-slate-600">
        {icon}
        <span className="truncate font-mono text-[8px] font-medium tracking-wider">
          {label}
        </span>
      </div>
      <div className={`mt-1.5 truncate font-mono text-base font-bold ${color}`}>
        {value}
      </div>
    </div>
  );
}
function DepthMetric({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="min-w-0 px-3 py-2.5 transition-colors hover:bg-white/[0.015]">
      <div className="flex items-center gap-1.5 text-slate-600">
        {icon}
        <span className="truncate font-mono text-[7px] font-semibold tracking-[0.16em]">
          {label}
        </span>
      </div>
      <div className={`mt-1 truncate font-mono text-[11px] font-bold ${color}`}>
        {value}
      </div>
    </div>
  );
}
