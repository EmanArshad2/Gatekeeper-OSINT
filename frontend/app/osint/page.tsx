"use client";

import { Suspense } from "react";
import OSINTWorkspace from "../../components/osint/OSINTWorkspace";

export default function OSINTPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs font-mono text-cyan-400">Loading OSINT workspace...</div>}>
      <OSINTWorkspace />
    </Suspense>
  );
}
