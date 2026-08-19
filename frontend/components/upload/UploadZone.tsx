"use client";
import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import {
  UploadCloud,
  FileImage,
  FileText,
  Loader2,
  ShieldCheck,
  ScanSearch,
  QrCode,
  WalletCards,
  FileCheck2,
  AlertCircle,
  Fingerprint,
} from "lucide-react";
interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  loading: boolean;
}
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const SUPPORTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];
export default function UploadZone({ onUpload, loading }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  function isSupportedFile(file: File): boolean {
    return SUPPORTED_TYPES.includes(file.type);
  }
  async function upload(file: File): Promise<void> {
    if (loading) return;
    setError(null);
    if (!isSupportedFile(file)) {
      setError("Unsupported file type. Upload PNG, JPG, JPEG, WEBP or PDF.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File exceeds the 25 MB maximum size.");
      return;
    }
    setSelectedFile(file);
    try {
      await onUpload(file);
    } catch (err) {
      console.error("Evidence upload failed:", err);
      setError("Evidence processing failed. Please try again.");
    }
  }
  async function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    await upload(file);
    event.target.value = "";
  }
  async function handleDrop(event: DragEvent<HTMLDivElement>): Promise<void> {
    event.preventDefault();
    if (loading) return;
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await upload(file);
  }
  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    if (!loading) {
      event.dataTransfer.dropEffect = "copy";
    }
  }
  function openFilePicker(): void {
    if (loading) return;
    inputRef.current?.click();
  }
  const isPdf = selectedFile?.type === "application/pdf";
  return (
    <div className="space-y-3">
      {/* =====================================================
          INGESTION CONSOLE
          ===================================================== */}
      <div
        onClick={openFilePicker}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!loading) {
            setDragging(true);
          }
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) {
            setDragging(false);
          }
        }}
        className={[
          "group relative min-h-[390px] overflow-hidden rounded-2xl",
          "border transition-all duration-300",
          dragging
            ? "border-cyan-400/40 bg-cyan-400/[0.06] shadow-[0_0_45px_rgba(34,211,238,.12)]"
            : "border-white/[0.07] bg-white/[0.02] hover:border-cyan-400/20 hover:bg-white/[0.035]",
          loading ? "cursor-not-allowed opacity-80" : "cursor-pointer",
        ].join(" ")}
      >
        {/* AMBIENT GRID */}
        <div
          className={[
            "pointer-events-none absolute inset-0 opacity-30",
            "[background-image:linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)]",
            "[background-size:32px_32px]",
          ].join(" ")}
        />
        {/* CYAN ATMOSPHERE */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/[0.025] blur-3xl" />
        {/* TOP STATUS */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between border-b border-white/[0.06] bg-[#05070b]/70 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                loading
                  ? "animate-pulse bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,.9)]"
                  : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,.7)]"
              }`}
            />
            <span className="font-mono text-[8px] font-semibold tracking-[0.18em] text-slate-400">
              EVIDENCE INGESTION
            </span>
          </div>
          <span className="font-mono text-[8px] tracking-wider text-slate-600">
            SECURE CHANNEL
          </span>
        </div>
        {/* CENTER CONTENT */}
        <div className="relative flex min-h-[390px] flex-col items-center justify-center px-6 py-16 text-center">
          {/* ICON */}
          <div
            className={[
              "relative flex h-20 w-20 items-center justify-center",
              "rounded-2xl border transition-all duration-300",
              dragging
                ? "border-cyan-400/50 bg-cyan-400/[0.12] shadow-[0_0_35px_rgba(34,211,238,.2)]"
                : "border-cyan-400/20 bg-cyan-400/[0.05] shadow-[0_0_25px_rgba(34,211,238,.06)]",
            ].join(" ")}
          >
            {loading ? (
              <Loader2 size={34} className="animate-spin text-cyan-300" />
            ) : (
              <UploadCloud
                size={34}
                className={[
                  "transition-transform duration-300",
                  dragging
                    ? "-translate-y-1 text-cyan-300"
                    : "text-cyan-300 group-hover:-translate-y-1",
                ].join(" ")}
              />
            )}
            {!loading && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/20 bg-[#05070b]">
                <ShieldCheck size={11} className="text-emerald-400" />
              </span>
            )}
          </div>
          {/* HEADING */}
          <div className="mt-6">
            <p className="font-mono text-[8px] font-semibold tracking-[0.22em] text-cyan-400/70">
              GK // FORENSIC INGESTION
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {loading
                ? "Analyzing Evidence"
                : dragging
                  ? "Release to Ingest"
                  : "Upload Forensic Evidence"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
              {loading
                ? "The evidence pipeline is processing the submitted artifact."
                : "Drop an image or PDF into the secure evidence zone, or select a file from your system."}
            </p>
          </div>
          {/* CTA */}
          {!loading && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openFilePicker();
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 font-mono text-[9px] font-semibold tracking-wider text-slate-950 transition-all hover:bg-cyan-300 hover:shadow-[0_0_30px_rgba(34,211,238,.18)]"
            >
              <UploadCloud size={14} />
              SELECT EVIDENCE
            </button>
          )}
          {/* SUPPORTED FORMATS */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <FormatBadge icon={<FileImage size={11} />} label="PNG" />
            <FormatBadge icon={<FileImage size={11} />} label="JPG" />
            <FormatBadge icon={<FileImage size={11} />} label="WEBP" />
            <FormatBadge icon={<FileText size={11} />} label="PDF" />
            <span className="font-mono text-[8px] text-slate-600">
              MAX 25 MB
            </span>
          </div>
        </div>
        {/* =====================================================
            PROCESSING PIPELINE
            ===================================================== */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] bg-[#05070b]/80 px-5 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <PipelineItem icon={<ScanSearch size={11} />} label="OCR" />
            <PipelineLine />
            <PipelineItem
              icon={<WalletCards size={11} />}
              label="WALLET DETECTION"
            />
            <PipelineLine />
            <PipelineItem icon={<QrCode size={11} />} label="QR ANALYSIS" />
            <PipelineLine />
            <PipelineItem
              icon={<Fingerprint size={11} />}
              label="ENTITY CORRELATION"
            />
            <PipelineLine />
            <PipelineItem
              icon={<ShieldCheck size={11} />}
              label="RISK SCORING"
            />
          </div>
        </div>
        {/* LOADING SCAN */}
        {loading && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-0 right-0 top-0 h-px animate-[scan_2s_linear_infinite] bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,.9)]" />
          </div>
        )}
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={handleChange}
        />
      </div>
      {/* =====================================================
          SELECTED FILE
          ===================================================== */}
      {selectedFile && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center",
                "rounded-lg border",
                isPdf
                  ? "border-orange-500/20 bg-orange-500/[0.05]"
                  : "border-cyan-400/20 bg-cyan-400/[0.05]",
              ].join(" ")}
            >
              {isPdf ? (
                <FileText size={17} className="text-orange-400" />
              ) : (
                <FileImage size={17} className="text-cyan-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-mono text-[10px] font-semibold text-slate-200">
                  {selectedFile.name}
                </p>
                {!loading && (
                  <FileCheck2 size={13} className="shrink-0 text-emerald-400" />
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
                  {isPdf ? "PDF DOCUMENT" : "IMAGE EVIDENCE"}
                </span>
                <span className="h-0.5 w-0.5 rounded-full bg-slate-700" />
                <span className="font-mono text-[8px] text-slate-600">
                  {formatBytes(selectedFile.size)}
                </span>
              </div>
            </div>
            <div className="hidden shrink-0 sm:block">
              <span className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.05] px-2 py-1 font-mono text-[8px] font-semibold tracking-wider text-emerald-400">
                QUEUED
              </span>
            </div>
          </div>
        </div>
      )}
      {/* =====================================================
          PROCESSING STATUS
          ===================================================== */}
      {loading && (
        <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.035] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10">
              <Loader2 size={14} className="animate-spin text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[9px] font-semibold tracking-wider text-cyan-400">
                ANALYSIS PIPELINE ACTIVE
              </p>
              <p className="mt-0.5 text-[10px] text-slate-600">
                OCR · QR extraction · wallet detection · correlation
              </p>
            </div>
            <span className="ml-auto hidden font-mono text-[8px] text-cyan-400/60 sm:block">
              PROCESSING
            </span>
          </div>
        </div>
      )}
      {/* =====================================================
          ERROR
          ===================================================== */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/15 bg-red-500/[0.04] p-4">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
          <div>
            <p className="font-mono text-[9px] font-semibold tracking-wider text-red-400">
              INGESTION ERROR
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{error}</p>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateY(385px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
/* ===============================================================
   FORMAT BADGE
   =============================================================== */
function FormatBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-[8px] font-semibold text-slate-600">
      {icon}
      {label}
    </span>
  );
}
/* ===============================================================
   PIPELINE ITEM
   =============================================================== */
function PipelineItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[7px] font-semibold tracking-wider text-slate-600">
      <span className="text-cyan-400/70">{icon}</span>
      {label}
    </div>
  );
}
/* ===============================================================
   PIPELINE LINE
   =============================================================== */
function PipelineLine() {
  return <span className="hidden h-px w-4 bg-white/[0.06] sm:block" />;
}
/* ===============================================================
   FILE SIZE
   =============================================================== */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
