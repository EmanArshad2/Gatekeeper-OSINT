"use client";

import { Suspense } from "react";
import WalletWorkspace from "@/components/wallet/WalletWorkspace";

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs font-mono text-cyan-400">Loading wallet intelligence...</div>}>
      <WalletWorkspace />
    </Suspense>
  );
}
