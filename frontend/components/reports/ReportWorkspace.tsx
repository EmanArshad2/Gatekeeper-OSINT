"use client";

import { useEffect, useState } from "react";
import ReportHeader from "./ReportHeader";
import ReportSummary from "./ReportSummary";
import ReportExport from "./ReportExport";

const API = "http://127.0.0.1:8000/api";

interface ReportSummaryData {
  evidence_count: number;
  wallet_count: number;
  risk_score: number;
  osint_matches: number;
  generated_at: string;
}

export default function ReportWorkspace() {
  const [summary, setSummary] = useState<ReportSummaryData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${API}/reports/summary/adhoc`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        setSummary(data.summary);
      } catch (error) {
        console.error("Failed to load report summary:", error);
      }
    })();
  }, []);

  return (
    <div className="space-y-6 pb-10">
      <ReportHeader
        title="Evidence & Extraction Forensic Report"
        status="INTELLIGENCE READY"
      />
      <ReportSummary
        evidenceCount={summary?.evidence_count ?? 0}
        walletCount={summary?.wallet_count ?? 0}
        riskScore={summary?.risk_score ?? 0}
        osintMatches={summary?.osint_matches ?? 0}
        generatedAt={
          summary?.generated_at
            ? new Date(summary.generated_at).toLocaleString()
            : "Live Telemetry"
        }
      />
      <ReportExport />
    </div>
  );
}
