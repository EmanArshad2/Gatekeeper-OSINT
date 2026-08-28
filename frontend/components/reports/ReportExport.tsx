"use client";

import { useState } from "react";
import { Download, FileText, Database, Table, Loader2 } from "lucide-react";

const API = "http://127.0.0.1:8000/api";

export default function ReportExport() {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);

  async function generatePDF() {
    try {
      setIsGeneratingPDF(true);
      const response = await fetch(`${API}/report/generate/adhoc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Gatekeeper Forensic Investigation Report" }),
      });
      if (!response.ok) throw new Error("Report generation failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "gatekeeper-forensic-report.pdf";
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
      const response = await fetch(`${API}/report/export-json/adhoc`, { cache: "no-store" });
      if (!response.ok) throw new Error("JSON export failed");
      const report = await response.json();
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "gatekeeper-forensic-report.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("JSON Export Error:", error);
    } finally {
      setIsExportingJSON(false);
    }
  }

  async function exportCSV() {
    try {
      setIsExportingCSV(true);
      const response = await fetch(`${API}/wallets`, { cache: "no-store" });
      if (!response.ok) throw new Error("CSV export failed");
      const data = await response.json();
      const wallets = data.wallets || [];

      let csv = "ID,Address,Blockchain,Risk Level,Risk Score,Confidence,Balance,Blacklisted,Created At\n";
      for (const w of wallets) {
        csv += `"${w.id}","${w.address}","${w.chain}","${w.risk_level}",${w.risk_score},${w.confidence},${w.balance},${w.blacklisted},"${w.created_at}"\n`;
      }

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "gatekeeper-wallet-attribution.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV Export Error:", error);
    } finally {
      setIsExportingCSV(false);
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
            Export Investigation Reports & Intelligence
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Download certified PDF briefs, raw JSON telemetry, or CSV attribution spreadsheets
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={generatePDF}
          disabled={isGeneratingPDF}
          className="flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] px-5 py-3 text-sm font-semibold text-cyan-300 transition-all hover:border-cyan-400/40 hover:bg-cyan-400/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isGeneratingPDF ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <FileText size={17} className="text-cyan-400" />
          )}
          {isGeneratingPDF ? "Generating PDF..." : "Download PDF Report"}
        </button>

        <button
          type="button"
          onClick={exportJSON}
          disabled={isExportingJSON}
          className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-3 text-sm font-medium text-slate-300 transition-all hover:border-cyan-400/20 hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isExportingJSON ? (
            <Loader2 size={17} className="animate-spin text-cyan-400" />
          ) : (
            <Database size={17} className="text-cyan-400" />
          )}
          {isExportingJSON ? "Exporting JSON..." : "Export Raw JSON"}
        </button>

        <button
          type="button"
          onClick={exportCSV}
          disabled={isExportingCSV}
          className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-3 text-sm font-medium text-slate-300 transition-all hover:border-cyan-400/20 hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isExportingCSV ? (
            <Loader2 size={17} className="animate-spin text-cyan-400" />
          ) : (
            <Table size={17} className="text-emerald-400" />
          )}
          {isExportingCSV ? "Exporting CSV..." : "Export CSV Spreadsheet"}
        </button>
      </div>
    </div>
  );
}
