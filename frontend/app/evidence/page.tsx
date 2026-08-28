"use client";

import { Suspense } from "react";
import EvidenceWorkspace from "@/components/evidence/EvidenceWorkspace";

export default function EvidencePage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs font-mono text-cyan-400">Loading Evidence Vault...</div>}>
      <EvidenceWorkspace />
    </Suspense>
  );
}
