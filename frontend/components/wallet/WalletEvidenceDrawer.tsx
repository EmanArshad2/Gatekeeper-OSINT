"use client";
import { useEffect, useState } from "react";
import {
  X,
  Globe,
  Radio,
  Upload,
  FileText,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
const API = "http://127.0.0.1:8000/api";
interface EvidenceItem {
  wallet_row_id: number;
  page_number: number;
  ocr_corrected: boolean;
  confidence: number;
  risk_score: number;
  risk_level: string;
  risk_reasons: string[];
  found_at: string;
  source_type: string;
  source_url: string | null;
  filename: string | null;
  snippet: string | null;
}
interface EvidenceResponse {
  status: string;
  address: string;
  chain: string;
  occurrence_count: number;
  evidence: EvidenceItem[];
}
const SOURCE_ICON: Record<string, typeof Globe> = {
  website: Globe,
  telegram: Radio,
  twitter: X,
  upload: Upload,
};
const SOURCE_LABEL: Record<string, string> = {
  website: "WEBSITE",
  telegram: "TELEGRAM",
  twitter: "X / TWITTER",
  upload: "MANUAL UPLOAD",
};
export default function WalletEvidenceDrawer({
  walletId,
  onClose,
}: {
  walletId: number;
  onClose: () => void;
}) {
  const [data, setData] = useState<EvidenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/wallets/${walletId}/evidence`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to load evidence trail.");
        const result: EvidenceResponse = await response.json();
        if (!cancelled) setData(result);
      } catch (err) {
        console.error("Wallet evidence error:", err);
        if (!cancelled)
          setError("Could not load evidence trail for this wallet.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [walletId]);
  return (
    <div
      className="fixed inset-0 z-[90] flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-[#1B2E31] bg-[#070b12]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#152225] bg-[#070b12]/95 px-5 py-4 backdrop-blur">
          <div>
            <div className="font-mono text-[9px] font-semibold tracking-[0.14em] text-cyan-400/70">
              WALLET EVIDENCE TRAIL
            </div>
            {data && (
              <div className="mt-1 font-mono text-xs text-slate-200">
                {data.address}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.07] text-slate-500 hover:text-slate-200"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-5">
          {loading && (
            <p className="font-mono text-[10px] text-slate-500">
              Loading evidence trail...
            </p>
          )}
          {!loading && error && (
            <p className="font-mono text-[10px] text-red-400">{error}</p>
          )}
          {!loading && data && data.evidence.length === 0 && (
            <p className="font-mono text-[10px] text-slate-500">
              No evidence records found for this wallet.
            </p>
          )}
          {!loading && data && data.evidence.length > 0 && (
            <>
              <p className="mb-4 font-mono text-[10px] text-slate-500">
                Found in{" "}
                <span className="text-slate-300">{data.occurrence_count}</span>{" "}
                place{data.occurrence_count === 1 ? "" : "s"} across your
                evidence base.
                {data.occurrence_count > 1 && (
                  <span className="text-amber-400/80">
                    {" "}
                    Multiple independent sources increases confidence this is a
                    real, actively used address.
                  </span>
                )}
              </p>
              <div className="space-y-3">
                {data.evidence.map((item) => {
                  const Icon = SOURCE_ICON[item.source_type] ?? FileText;
                  return (
                    <div
                      key={item.wallet_row_id}
                      className="rounded-lg border border-white/[0.07] bg-white/[0.015] p-4"
                    >
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon size={13} className="text-cyan-400/80" />
                          <span className="font-mono text-[9px] font-semibold tracking-wider text-cyan-300/90">
                            {SOURCE_LABEL[item.source_type] ??
                              item.source_type.toUpperCase()}
                          </span>
                          {item.page_number > 0 && (
                            <span className="font-mono text-[8px] text-slate-600">
                              · PAGE {item.page_number}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[8px] text-slate-600">
                          {item.found_at
                            ? new Date(item.found_at).toLocaleString()
                            : ""}
                        </span>
                      </div>
                      {item.filename && (
                        <div className="mb-2 font-mono text-[10px] text-slate-400">
                          {item.filename}
                        </div>
                      )}
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mb-2 flex items-center gap-1.5 font-mono text-[9px] text-cyan-400/80 hover:text-cyan-300"
                        >
                          <ExternalLink size={10} /> {item.source_url}
                        </a>
                      )}
                      {item.snippet && (
                        <div className="mb-3 rounded-md border border-white/[0.05] bg-black/30 p-2.5 font-mono text-[10px] leading-relaxed text-slate-400">
                          &hellip;{item.snippet}&hellip;
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 font-mono text-[8px] font-semibold tracking-wider ${
                            item.risk_level === "HIGH" ||
                            item.risk_level === "CRITICAL"
                              ? "border-red-400/25 bg-red-400/[0.08] text-red-300"
                              : item.risk_level === "MEDIUM"
                                ? "border-amber-400/25 bg-amber-400/[0.08] text-amber-300"
                                : "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                          }`}
                        >
                          RISK {item.risk_score} · {item.risk_level}
                        </span>
                        <span className="rounded-md border border-white/[0.07] px-2 py-0.5 font-mono text-[8px] text-slate-500">
                          CONFIDENCE {item.confidence}
                        </span>
                        {item.ocr_corrected && (
                          <span className="flex items-center gap-1 rounded-md border border-amber-400/25 bg-amber-400/[0.06] px-2 py-0.5 font-mono text-[8px] text-amber-300">
                            <AlertTriangle size={9} /> OCR CORRECTED
                          </span>
                        )}
                      </div>
                      {item.risk_reasons?.length > 0 && (
                        <div className="mt-2.5 space-y-1 border-t border-white/[0.04] pt-2.5">
                          {item.risk_reasons.map((reason, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-1.5 font-mono text-[9px] text-slate-500"
                            >
                              <ShieldAlert
                                size={10}
                                className="mt-0.5 shrink-0 text-slate-600"
                              />
                              {reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
