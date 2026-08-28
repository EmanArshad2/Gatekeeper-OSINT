"use client";

import { Suspense } from "react";
import GraphWorkspace from "@/components/graph/GraphWorkSpace";

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs font-mono text-cyan-400">Loading entity graph...</div>}>
      <GraphWorkspace />
    </Suspense>
  );
}
