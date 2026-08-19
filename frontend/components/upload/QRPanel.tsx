"use client";
import { useState } from "react";
import {
  Check,
  Copy,
  QrCode,
  ShieldCheck,
  ExternalLink,
  Database,
  Activity,
} from "lucide-react";
interface QRPanelProps {
  qrCodes: string[];
}
export default function QRPanel({ qrCodes }: QRPanelProps) {
  const [copied, setCopied] = useState<number | null>(null);
  async function copyQR(value: string, index: number) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(index);
      window.setTimeout(() => {
        setCopied(null);
      }, 1600);
    } catch (error) {
      console.error("Failed to copy QR data:", error);
    }
  }
  const hasDetections = qrCodes.length > 0;
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080b12] shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
      {/* FORENSIC BACKGROUND GRID */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.025) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* CYAN AMBIENT GLOW */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-cyan-400/[0.035] blur-3xl" />
      {/* VIOLET AMBIENT GLOW */}
      <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-violet-500/[0.02] blur-3xl" />
      {/* HEADER */}
      <div className="relative border-b border-white/[0.07]">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {/* ICON */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.045] shadow-[0_0_25px_rgba(34,211,238,0.035)]">
              <QrCode size={17} className="text-cyan-400" />
              <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                <span
                  className={[
                    "absolute inline-flex h-full w-full rounded-full",
                    hasDetections
                      ? "animate-ping bg-emerald-400 opacity-20"
                      : "bg-slate-500 opacity-20",
                  ].join(" ")}
                />
                <span
                  className={[
                    "relative h-2.5 w-2.5 rounded-full",
                    hasDetections
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                      : "bg-slate-600",
                  ].join(" ")}
                />
              </span>
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[8px] font-semibold tracking-[0.22em] text-cyan-400/80">
                GK // QR INTELLIGENCE
              </div>
              <h2 className="mt-1 truncate text-base font-semibold tracking-tight text-slate-100">
                QR Intelligence
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Machine-readable artifacts recovered from submitted evidence
              </p>
            </div>
          </div>
          {/* STATUS */}
          <div
            className={[
              "flex w-fit items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[8px] font-bold tracking-[0.12em]",
              hasDetections
                ? "border-emerald-400/20 bg-emerald-400/[0.035] text-emerald-400"
                : "border-white/[0.07] bg-white/[0.02] text-slate-500",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                hasDetections
                  ? "bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.65)]"
                  : "bg-slate-600",
              ].join(" ")}
            />
            {hasDetections ? "DETECTION COMPLETE" : "NO DETECTIONS"}
          </div>
        </div>
      </div>
      {/* SUMMARY */}
      <div className="relative grid grid-cols-2 border-b border-white/[0.07]">
        <div className="border-r border-white/[0.07] px-5 py-4 lg:px-6">
          <div className="font-mono text-[7px] font-semibold tracking-[0.17em] text-slate-600">
            QR CODES DETECTED
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-cyan-400">
            {qrCodes.length}
          </div>
        </div>
        <div className="px-5 py-4 lg:px-6">
          <div className="font-mono text-[7px] font-semibold tracking-[0.17em] text-slate-600">
            EXTRACTION STATUS
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <ShieldCheck
              size={14}
              className={hasDetections ? "text-emerald-400" : "text-slate-600"}
            />
            <span
              className={[
                "font-mono text-xs font-semibold",
                hasDetections ? "text-emerald-400" : "text-slate-500",
              ].join(" ")}
            >
              {hasDetections ? "SUCCESSFUL" : "PENDING"}
            </span>
          </div>
        </div>
      </div>
      {/* EMPTY */}
      {!hasDetections ? (
        <div className="relative flex min-h-[250px] items-center justify-center px-6">
          <div className="max-w-sm text-center">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/[0.10] bg-[#0b0f17]">
              <QrCode size={23} className="text-slate-600" />
              <div className="absolute inset-2 rounded-lg border border-cyan-400/[0.04]" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-300">
              No QR evidence detected
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              QR extraction did not identify any machine-readable codes in the
              current evidence artifact.
            </p>
            <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-md border border-white/[0.07] bg-[#0b0f17] px-2.5 py-1.5">
              <Activity size={10} className="text-slate-600" />
              <span className="font-mono text-[7px] tracking-[0.14em] text-slate-600">
                QR ENGINE STANDBY
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* LIST HEADER */}
          <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#070a10]/70 px-5 py-3 lg:px-6">
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-cyan-400" />
              <span className="font-mono text-[8px] font-semibold tracking-[0.17em] text-slate-400">
                EXTRACTED ARTIFACTS
              </span>
            </div>
            <span className="font-mono text-[7px] tracking-wider text-slate-600">
              {qrCodes.length} RECORD
              {qrCodes.length !== 1 ? "S" : ""}
            </span>
          </div>
          {/* RECORDS */}
          <div className="divide-y divide-white/[0.045]">
            {qrCodes.map((qr, index) => {
              const type = detectQRType(qr);
              const isCopied = copied === index;
              return (
                <div
                  key={`${qr}-${index}`}
                  className="group px-5 py-5 transition-colors hover:bg-cyan-400/[0.012] lg:px-6"
                >
                  <div className="flex gap-4">
                    {/* INDEX */}
                    <div className="hidden w-8 shrink-0 pt-1 text-center font-mono text-[8px] text-slate-700 sm:block">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    {/* QR ICON */}
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/[0.025]">
                      <QrCode size={15} className="text-cyan-400/80" />
                      <span className="absolute bottom-0 left-0 h-px w-full bg-cyan-400/30 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    {/* DATA */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[8px] font-semibold tracking-[0.14em] text-slate-600">
                              QR ARTIFACT #{index + 1}
                            </span>
                            <span className={getTypeBadge(type)}>{type}</span>
                          </div>
                          {/* VALUE */}
                          <div className="relative mt-2 overflow-hidden rounded-lg border border-white/[0.07] bg-[#060910]">
                            <div className="absolute bottom-0 left-0 top-0 w-px bg-cyan-400/30" />
                            <p
                              className="break-all px-3 py-2.5 font-mono text-[10px] leading-5 text-slate-300"
                              title={qr}
                            >
                              {formatQRValue(qr)}
                            </p>
                          </div>
                        </div>
                        {/* COPY */}
                        <button
                          type="button"
                          onClick={() => copyQR(qr, index)}
                          className={[
                            "flex shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 font-mono text-[7px] font-semibold tracking-[0.12em] transition-all",
                            isCopied
                              ? "border-emerald-400/25 bg-emerald-400/[0.05] text-emerald-400"
                              : "border-white/[0.07] bg-white/[0.02] text-slate-500 hover:border-cyan-400/25 hover:bg-cyan-400/[0.035] hover:text-cyan-400",
                          ].join(" ")}
                        >
                          {isCopied ? (
                            <>
                              <Check size={12} />
                              COPIED
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              COPY DATA
                            </>
                          )}
                        </button>
                      </div>
                      {/* META */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <MetaItem label="SOURCE" value="DIGITAL EVIDENCE" />
                        <MetaItem label="FORMAT" value={type} />
                        {isLikelyURL(qr) && (
                          <span className="flex items-center gap-1.5 font-mono text-[7px] text-violet-400/80">
                            <ExternalLink size={10} />
                            WEB RESOURCE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* FOOTER */}
      <div className="relative border-t border-white/[0.07] bg-[#05070b] px-5 py-3 lg:px-6">
        <div className="flex flex-col gap-2 font-mono text-[7px] tracking-[0.13em] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                hasDetections
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                  : "bg-slate-700",
              ].join(" ")}
            />
            <span>QR ENGINE / EVIDENCE RECOVERY</span>
          </div>
          <span>
            {hasDetections
              ? `${qrCodes.length} ARTIFACT${
                  qrCodes.length !== 1 ? "S" : ""
                } RECOVERED`
              : "AWAITING ARTIFACTS"}
          </span>
        </div>
      </div>
    </section>
  );
}
/* ===============================================================
   META
   =============================================================== */
function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[7px]">
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-400">{value}</span>
    </div>
  );
}
/* ===============================================================
   TYPE BADGE
   =============================================================== */
function getTypeBadge(type: string) {
  const base =
    "rounded-md border px-2 py-0.5 font-mono text-[7px] font-semibold tracking-[0.1em]";
  if (type === "BITCOIN URI") {
    return `${base} border-orange-400/20 bg-orange-400/[0.04] text-orange-400`;
  }
  if (type === "ETHEREUM URI") {
    return `${base} border-violet-400/20 bg-violet-400/[0.04] text-violet-400`;
  }
  if (type === "TRON URI") {
    return `${base} border-red-400/20 bg-red-400/[0.04] text-red-400`;
  }
  if (type === "URL") {
    return `${base} border-cyan-400/20 bg-cyan-400/[0.04] text-cyan-400`;
  }
  if (type === "CONTACT") {
    return `${base} border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-400`;
  }
  if (type === "ENCODED DATA") {
    return `${base} border-violet-400/20 bg-violet-400/[0.04] text-violet-400`;
  }
  return `${base} border-white/[0.08] bg-white/[0.025] text-slate-400`;
}
/* ===============================================================
   VALUE FORMAT
   =============================================================== */
function formatQRValue(value: string) {
  if (!value) return "EMPTY ARTIFACT";
  if (value.length <= 140) {
    return value;
  }
  return `${value.slice(0, 70)}...${value.slice(-55)}`;
}
/* ===============================================================
   URL DETECTION
   =============================================================== */
function isLikelyURL(value: string) {
  return /^https?:\/\//i.test(value.trim());
}
/* ===============================================================
   QR TYPE DETECTION
   =============================================================== */
function detectQRType(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("bitcoin:")) {
    return "BITCOIN URI";
  }
  if (normalized.startsWith("ethereum:")) {
    return "ETHEREUM URI";
  }
  if (normalized.startsWith("tron:")) {
    return "TRON URI";
  }
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return "URL";
  }
  if (
    normalized.startsWith("mailto:") ||
    (normalized.includes("@") && normalized.includes("."))
  ) {
    return "CONTACT";
  }
  if (/^[a-z0-9+/=_-]{20,}$/i.test(value)) {
    return "ENCODED DATA";
  }
  return "TEXT DATA";
}
