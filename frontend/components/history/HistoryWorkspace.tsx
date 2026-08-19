"use client";
import { useEffect, useState } from "react";
import { getHistory, HistoryItem } from "@/services/history";
import HistoryTable from "./HistoryTable";
import { History, ShieldCheck } from "lucide-react";
export default function HistoryWorkspace() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      try {
        const data = await getHistory();
        setHistory(data);
      } catch (error) {
        console.error(error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);
  /* ============================================================
     LOADING STATE
  ============================================================ */
  if (loading) {
    return (
      <div className="relative flex min-h-[calc(100vh-110px)] items-center justify-center overflow-hidden bg-[#05070b] text-white">
        {/* ========================================================
            LOADING ATMOSPHERE
        ======================================================== */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.035] blur-[140px]" />
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
        {/* ========================================================
            LOADING CARD
        ======================================================== */}
        <div className="relative w-full max-w-md px-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.03] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/55 to-transparent" />
            <div className="flex items-start gap-5">
              {/* ICON */}
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07]">
                <div className="absolute inset-2 animate-spin rounded-full border border-cyan-400/10 border-t-cyan-400/80" />
                <History
                  size={18}
                  strokeWidth={1.7}
                  className="text-cyan-300"
                />
              </div>
              {/* TEXT */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  </span>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                    GATEKEEPER // LOGS
                  </p>
                </div>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">
                  Loading history logs
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  Synchronizing forensic audit trail
                </p>
              </div>
            </div>
            {/* PROGRESS */}
            <div className="mt-7 space-y-2.5">
              <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.12em]">
                <span className="text-slate-500">AUDIT REGISTRY</span>
                <span className="font-semibold text-cyan-300">CONNECTING</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-cyan-400/20 via-cyan-400/70 to-cyan-400/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  /* ============================================================
     MAIN WORKSPACE
  ============================================================ */
  return (
    <main className="relative min-h-full overflow-hidden bg-[#05070b] pb-10 text-white">
      {/* ========================================================
          WORKSPACE ATMOSPHERE
      ======================================================== */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[20%] top-[-15%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.025] blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[450px] w-[450px] rounded-full bg-violet-600/[0.025] blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      </div>
      <div className="relative mx-auto max-w-[1700px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* ======================================================
            COMMAND HEADER
        ====================================================== */}
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] shadow-[0_18px_55px_rgba(0,0,0,0.15)] backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />
          <div className="flex items-start justify-between gap-5 px-5 py-6 lg:px-7">
            <div className="min-w-0">
              {/* SECTION LABEL */}
              <div className="mb-2.5 flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Audit Trail
                </span>
              </div>
              {/* TITLE */}
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[26px]">
                Execution History
              </h1>
              {/* DESCRIPTION */}
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
                Secure chronological log of past forensic scans, intelligence
                queries and graph analyses.
              </p>
            </div>
            {/* HEADER ICON */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300">
              <History size={18} strokeWidth={1.7} />
            </div>
          </div>
          {/* ====================================================
              HEADER TELEMETRY
          ==================================================== */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] bg-white/[0.012] px-5 py-3.5 lg:px-7">
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={13}
                strokeWidth={1.7}
                className="text-emerald-400"
              />
              <span className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-slate-400">
                Immutable audit registry active
              </span>
            </div>
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              {history.length.toString().padStart(2, "0")} RECORDS LOGGED
            </span>
          </div>
        </section>
        {/* ======================================================
            HISTORY TABLE
        ====================================================== */}
        <HistoryTable history={history} />
      </div>
    </main>
  );
}
