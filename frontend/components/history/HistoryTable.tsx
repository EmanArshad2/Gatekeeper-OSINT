"use client";
import { HistoryItem } from "@/services/history";
import { useState, useMemo } from "react";
import {
  Search,
  FileText,
  Calendar,
  ShieldAlert,
  ArrowUpRight,
  Database,
} from "lucide-react";
interface Props {
  history: HistoryItem[];
}
export default function HistoryTable({ history }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (item) =>
        item.filename?.toLowerCase().includes(q) ||
        String(item.id).toLowerCase().includes(q) ||
        String(item.wallet_count).toLowerCase().includes(q) ||
        String(item.risk_score).toLowerCase().includes(q),
    );
  }, [history, searchQuery]);
  return (
    <div className="space-y-4">
      {/* ============================================================
          SEARCH TOOLBAR
      ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 backdrop-blur-xl">
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/[0.18] to-transparent" />
        <div className="flex items-center gap-3">
          <Search
            size={14}
            strokeWidth={1.6}
            className="shrink-0 text-slate-600"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search investigation history..."
            className="
              w-full
              bg-transparent
              font-mono
              text-[10px]
              text-slate-200
              placeholder:text-slate-600
              focus:outline-none
            "
          />
          <span className="hidden shrink-0 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-600 sm:block">
            LOG FILTER
          </span>
        </div>
      </div>
      {/* ============================================================
          TABLE CONTAINER
      ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl">
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/[0.18] to-transparent" />
        {/* DESKTOP TABLE HEADER */}
        <div className="hidden border-b border-white/[0.06] bg-white/[0.015] px-5 py-3 lg:grid lg:grid-cols-[2fr_1fr_1fr_1.2fr] lg:items-center lg:gap-4">
          <TableHeading>Investigation File</TableHeading>
          <TableHeading>Wallets</TableHeading>
          <TableHeading>Risk Score</TableHeading>
          <TableHeading>Timestamp</TableHeading>
        </div>
        {/* TABLE BODY */}
        <div className="divide-y divide-white/[0.06]">
          {filteredHistory.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-600">
                <FileText size={19} strokeWidth={1.5} />
              </div>
              <strong className="text-sm font-medium text-white">
                {searchQuery
                  ? "No matching investigations found"
                  : "No investigations recorded"}
              </strong>
              <span className="mt-1 max-w-[280px] text-[11px] leading-relaxed text-slate-500">
                {searchQuery
                  ? "Try adjusting your search query parameters."
                  : "Completed forensic scans will appear here automatically."}
              </span>
            </div>
          ) : (
            filteredHistory.map((item, index) => {
              const risk = item.risk_score ?? 0;
              return (
                <div
                  key={item.id ?? index}
                  className="
                    group
                    relative
                    px-5
                    py-4
                    transition-colors
                    duration-200
                    hover:bg-white/[0.025]
                    lg:px-6
                  "
                >
                  {/* ROW ACCENT */}
                  <span className="absolute bottom-0 left-0 top-0 w-px bg-transparent transition-colors duration-200 group-hover:bg-cyan-400" />
                  {/* DESKTOP ROW */}
                  <div className="hidden lg:grid lg:grid-cols-[2fr_1fr_1fr_1.2fr] lg:items-center lg:gap-4">
                    {/* FILE */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300">
                        <FileText size={14} strokeWidth={1.6} />
                      </div>
                      <div className="min-w-0">
                        <strong
                          className="block truncate text-[11px] font-medium text-slate-200"
                          title={item.filename}
                        >
                          {item.filename || "Untitled Investigation"}
                        </strong>
                        <span className="mt-0.5 block font-mono text-[8px] text-slate-600">
                          ID: {item.id}
                        </span>
                      </div>
                    </div>
                    {/* WALLETS */}
                    <div className="font-mono text-[10px] text-slate-300">
                      <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1">
                        {item.wallet_count ?? 0} WALLETS
                      </span>
                    </div>
                    {/* RISK */}
                    <div>
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] ${
                          risk >= 70
                            ? "border-red-400/20 bg-red-400/[0.06] text-red-400"
                            : risk >= 40
                              ? "border-amber-400/20 bg-amber-400/[0.06] text-amber-400"
                              : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400"
                        }`}
                      >
                        RISK {risk}
                      </span>
                    </div>
                    {/* DATE */}
                    <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
                      <Calendar
                        size={12}
                        strokeWidth={1.5}
                        className="text-slate-600"
                      />
                      {item.uploaded_at
                        ? new Date(item.uploaded_at).toLocaleString()
                        : "N/A"}
                    </div>
                  </div>
                  {/* MOBILE / TABLET ROW */}
                  <div className="flex items-start gap-3 lg:hidden">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300">
                      <FileText size={15} strokeWidth={1.6} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <strong
                            className="block truncate text-[11px] font-medium text-slate-200"
                            title={item.filename}
                          >
                            {item.filename || "Untitled Investigation"}
                          </strong>
                          <span className="mt-0.5 block font-mono text-[8px] text-slate-600">
                            ID: {item.id}
                          </span>
                        </div>
                        <span
                          className={`rounded-md border px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] ${
                            risk >= 70
                              ? "border-red-400/20 bg-red-400/[0.06] text-red-400"
                              : risk >= 40
                                ? "border-amber-400/20 bg-amber-400/[0.06] text-amber-400"
                                : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400"
                          }`}
                        >
                          RISK {risk}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[9px] text-slate-500">
                        <span className="rounded border border-white/[0.08] bg-white/[0.025] px-1.5 py-0.5 text-slate-300">
                          {item.wallet_count ?? 0} WALLETS
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={10} className="text-slate-600" />
                          {item.uploaded_at
                            ? new Date(item.uploaded_at).toLocaleString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* FOOTER */}
        {filteredHistory.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.015] px-5 py-2.5 lg:px-6">
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-600">
              Showing {filteredHistory.length} of {history.length} records
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[8px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.5)]" />
              REGISTRY SECURED
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
function TableHeading({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[8px] font-medium uppercase tracking-[0.14em] text-slate-600">
      {children}
    </span>
  );
}
