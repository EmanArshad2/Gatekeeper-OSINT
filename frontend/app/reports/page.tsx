"use client";

import { Suspense } from "react";
import ReportWorkspace from "@/components/reports/ReportWorkspace";

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs font-mono text-cyan-400">Loading reports workspace...</div>}>
      <ReportWorkspace />
    </Suspense>
  );
}
