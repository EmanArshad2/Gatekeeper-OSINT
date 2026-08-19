"use client";
import { useEffect, useState } from "react";
import { ChevronDown, FolderSearch } from "lucide-react";
import ReportHeader from "./ReportHeader";
import ReportSummary from "./ReportSummary";
import ReportExport from "./ReportExport";
const API = "http://127.0.0.1:8000/api";
interface CaseOption {
  id: number;
  name: string;
  status: string;
  wallet_count: number;
}
interface ReportSummaryData {
  evidence_count: number;
  wallet_count: number;
  risk_score: number;
  osint_matches: number;
  generated_at: string;
}
export default function ReportWorkspace() {
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseOption | null>(null);
  const [summary, setSummary] = useState<ReportSummaryData | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${API}/cases`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const loadedCases: CaseOption[] = data.cases ?? [];
        setCases(loadedCases);
        // Default to whatever case is currently active on the
        // Investigation page (if any) instead of always opening
        // un-scoped across every wallet ever extracted. This is what
        // was generating a report for "every evidence" even when you
        // clearly had a specific case selected elsewhere.
        try {
          const stored = localStorage.getItem("gatekeeper:activeCase");
          if (stored) {
            const parsed = JSON.parse(stored);
            const match = loadedCases.find((c) => c.id === parsed?.id);
            if (match) {
              setSelectedCase(match);
            }
          }
        } catch {
          // Ignore malformed/unavailable localStorage data.
        }
      } catch (error) {
        console.error("Failed to load cases:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        // No case selected -> summarize everything extracted so far
        // (uploads, Telegram, X/Twitter, websites), not just case-scoped
        // wallets. This is what lets a report be generated straight from
        // the Evidence workspace or OSINT data without creating a case.
        const endpoint = selectedCase
          ? `${API}/reports/summary/${selectedCase.id}`
          : `${API}/reports/summary/adhoc`;
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        setSummary(data.summary);
      } catch (error) {
        console.error("Failed to load report summary:", error);
      }
    })();
  }, [selectedCase]);
  return (
    <div className="space-y-6 pb-10">
      {/* CASE PICKER — this is what was missing entirely before */}
      <div className="relative z-50 rounded-2xl border border-white/[0.07] bg-[#070b12]/90 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-300">
            <FolderSearch size={15} />
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em]">
              REPORT SCOPE
            </span>
          </div>
          <div className="relative z-[60]">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[11px] text-slate-200 transition-colors hover:border-cyan-400/25"
            >
              {selectedCase
                ? selectedCase.name
                : "All extracted data (no case)"}
              <ChevronDown size={12} className="text-slate-500" />
            </button>
            {pickerOpen && (
              <div className="absolute left-0 top-full z-[9999] mt-2 w-72 rounded-lg border border-white/[0.10] bg-[#0B1416] p-2 shadow-2xl">
                <button
                  onClick={() => {
                    setSelectedCase(null);
                    setPickerOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                    selectedCase === null
                      ? "bg-cyan-400/[0.08] text-cyan-200"
                      : "text-slate-300 hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="truncate">All extracted data (no case)</span>
                  <span className="ml-2 shrink-0 font-mono text-[9px] text-slate-500">
                    OSINT / evidence
                  </span>
                </button>
                {loading && (
                  <p className="px-2 py-3 font-mono text-[9px] text-slate-600">
                    Loading cases...
                  </p>
                )}
                {!loading && cases.length === 0 && (
                  <p className="px-2 py-3 font-mono text-[9px] text-slate-600">
                    No cases yet — you can still report on everything extracted
                    so far, above.
                  </p>
                )}
                {cases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCase(c);
                      setPickerOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                      selectedCase?.id === c.id
                        ? "bg-cyan-400/[0.08] text-cyan-200"
                        : "text-slate-300 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="ml-2 shrink-0 font-mono text-[9px] text-slate-500">
                      {c.wallet_count} wallet{c.wallet_count === 1 ? "" : "s"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <ReportHeader
        caseId={
          selectedCase
            ? `GK-${String(selectedCase.id).padStart(4, "0")}`
            : undefined
        }
        title={
          selectedCase
            ? `${selectedCase.name} — Forensic Report`
            : "All Extracted Intelligence — Forensic Report"
        }
        status={selectedCase?.status ?? "ALL EXTRACTED DATA"}
      />
      <ReportSummary
        caseName={selectedCase ? selectedCase.name : "All extracted data"}
        evidenceCount={summary?.evidence_count ?? 0}
        walletCount={summary?.wallet_count ?? 0}
        riskScore={summary?.risk_score ?? 0}
        osintMatches={summary?.osint_matches ?? 0}
        generatedAt={
          summary?.generated_at
            ? new Date(summary.generated_at).toLocaleString()
            : "—"
        }
      />
      <ReportExport caseId={selectedCase?.id ?? null} />
    </div>
  );
}
