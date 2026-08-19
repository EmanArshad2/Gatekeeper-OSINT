"use client";
import { useState } from "react";
import { Download, FileText, Database, Loader2 } from "lucide-react";
interface ReportExportProps {
  caseId: number | null;
}
const API = "http://127.0.0.1:8000/api";
export default function ReportExport({ caseId }: ReportExportProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  // No case selected no longer disables export — it now targets the
  // backend's /adhoc endpoints, which cover every wallet extracted so
  // far (uploads, Telegram, X/Twitter, websites) instead of requiring
  // a case to be created first.
  const disabled = false;
  async function generatePDF() {
    try {
      setIsGeneratingPDF(true);
      const endpoint =
        caseId === null
          ? `${API}/report/generate/adhoc`
          : `${API}/report/generate/${caseId}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers:
          caseId === null ? { "Content-Type": "application/json" } : undefined,
        body: caseId === null ? JSON.stringify({}) : undefined,
      });
      if (!response.ok) throw new Error("Report generation failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        caseId === null
          ? "gatekeeper-all-extracted.pdf"
          : `gatekeeper-case-${caseId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF Export Error:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  }
  async function exportJSON() {
    try {
      setIsExportingJSON(true);
      // Pulls the real case + wallet data from the backend — previously
      // this built a fake 2-field JSON blob entirely client-side.
      const endpoint =
        caseId === null
          ? `${API}/report/export-json/adhoc`
          : `${API}/report/export-json/${caseId}`;
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error("JSON export failed");
      const report = await response.json();
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        caseId === null
          ? "gatekeeper-all-extracted.json"
          : `gatekeeper-case-${caseId}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("JSON Export Error:", error);
    } finally {
      setIsExportingJSON(false);
    }
  }
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#070b12]/90 p-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08]">
          <Download size={16} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">
            Export Investigation Report
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {caseId === null
              ? "No case selected — this covers every wallet extracted so far"
              : "Download a certified PDF brief or raw JSON telemetry"}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={generatePDF}
          disabled={isGeneratingPDF || disabled}
          className="flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] px-5 py-3 text-sm font-semibold text-cyan-300 transition-all hover:border-cyan-400/40 hover:bg-cyan-400/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isGeneratingPDF ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <FileText size={17} className="text-cyan-400" />
          )}
          {isGeneratingPDF ? "Generating PDF..." : "Generate PDF Brief"}
        </button>
        <button
          type="button"
          onClick={exportJSON}
          disabled={isExportingJSON || disabled}
          className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-3 text-sm font-medium text-slate-300 transition-all hover:border-cyan-400/20 hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isExportingJSON ? (
            <Loader2 size={17} className="animate-spin text-cyan-400" />
          ) : (
            <Database size={17} className="text-cyan-400" />
          )}
          {isExportingJSON ? "Exporting JSON..." : "Export Raw JSON"}
        </button>
      </div>
    </div>
  );
}
