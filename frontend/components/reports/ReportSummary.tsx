"use client";
import {
  FileText,
  Wallet,
  ShieldAlert,
  Globe,
  Clock,
  Fingerprint,
  Activity,
} from "lucide-react";
interface ReportSummaryProps {
  caseName: string;
  evidenceCount: number;
  walletCount: number;
  riskScore: number;
  osintMatches: number;
  generatedAt: string;
}
export default function ReportSummary({
  caseName,
  evidenceCount,
  walletCount,
  riskScore,
  osintMatches,
  generatedAt,
}: ReportSummaryProps) {
  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-400 bg-red-500/[0.08] border-red-500/20";
    if (score >= 40)
      return "text-amber-400 bg-amber-500/[0.08] border-amber-500/20";
    return "text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/20";
  };
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#070b12]/90 p-6 backdrop-blur-xl lg:p-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08]">
            <Activity size={18} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Investigation Summary
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Live telemetry for the selected case
            </p>
          </div>
        </div>
        <span className="hidden rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1 font-mono text-[10px] text-cyan-400 sm:inline-block">
          TELEMETRY // SYNCED
        </span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Case"
          value={caseName}
          icon={<Fingerprint size={15} className="text-cyan-400" />}
          mono
        />
        <SummaryCard
          title="Evidence Items"
          value={String(evidenceCount)}
          icon={<FileText size={15} className="text-cyan-400" />}
        />
        <SummaryCard
          title="Wallets Detected"
          value={String(walletCount)}
          icon={<Wallet size={15} className="text-cyan-400" />}
        />
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 transition-all hover:border-cyan-400/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Risk Score
            </span>
            <ShieldAlert
              size={15}
              className={riskScore >= 70 ? "text-red-400" : "text-amber-400"}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="break-all text-lg font-semibold text-white">
              {riskScore}
            </span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <div className="mt-2">
            <span
              className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[9px] font-semibold ${getRiskColor(riskScore)}`}
            >
              {riskScore >= 70
                ? "CRITICAL RISK"
                : riskScore >= 40
                  ? "MODERATE RISK"
                  : "LOW RISK"}
            </span>
          </div>
        </div>
        <SummaryCard
          title="OSINT Matches"
          value={String(osintMatches)}
          icon={<Globe size={15} className="text-emerald-400" />}
        />
        <SummaryCard
          title="Generated At"
          value={generatedAt}
          icon={<Clock size={15} className="text-slate-400" />}
          mono
        />
      </div>
    </div>
  );
}
function SummaryCard({
  title,
  value,
  icon,
  mono = false,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 transition-all hover:border-cyan-400/20">
      <div className="flex items-center justify-between text-slate-400">
        <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {icon}
      </div>
      <p
        className={`mt-3 break-all text-base font-semibold text-white ${mono ? "font-mono text-sm tracking-wide text-cyan-300" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
