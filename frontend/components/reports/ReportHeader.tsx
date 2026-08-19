"use client";
import { FileText, ShieldCheck } from "lucide-react";
interface ReportHeaderProps {
  caseId?: string;
  title?: string;
  status?: string;
}
export default function ReportHeader({
  caseId,
  title = "Forensic Investigation Report",
  status = "ACTIVE",
}: ReportHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070b12]/90 p-6 backdrop-blur-xl lg:p-7">
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-400/[0.05] blur-[100px]" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08]">
            <FileText size={22} className="text-cyan-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-400">
                CASE FILE
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-400">
                <ShieldCheck size={12} />
                {status}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-white lg:text-2xl">
              {title}
            </h1>
            <p className="mt-1 font-mono text-xs text-slate-500">
              Reference:{" "}
              <span className="text-cyan-400">
                {caseId ?? "No case selected"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
              Classification
            </span>
            <p className="mt-0.5 font-mono text-xs font-semibold text-slate-300">
              RESTRICTED // OSINT
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
