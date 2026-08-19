"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  FileImage,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Database,
  ScanSearch,
  HardDrive,
  Download,
  Trash2,
  Activity,
} from "lucide-react";
interface EvidencePreviewProps {
  file: File | null;
  onRemove?: () => void;
}
export default function EvidencePreview({
  file,
  onRemove,
}: EvidencePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);
  const metadata = useMemo(() => {
    if (!file) {
      return {
        type: "UNKNOWN",
        extension: "—",
        size: "—",
        mime: "—",
        isImage: false,
        isPdf: false,
      };
    }
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.toUpperCase() || "FILE"
      : "FILE";
    let size = `${file.size} B`;
    if (file.size >= 1024 * 1024) {
      size = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    } else if (file.size >= 1024) {
      size = `${(file.size / 1024).toFixed(2)} KB`;
    }
    return {
      type: isPdf
        ? "PDF DOCUMENT"
        : isImage
          ? "IMAGE EVIDENCE"
          : "DIGITAL FILE",
      extension,
      size,
      mime: file.type || "UNKNOWN",
      isImage,
      isPdf,
    };
  }, [file]);
  const handleDownload = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };
  /*
   * ============================================================
   * EMPTY STATE
   * ============================================================
   */
  if (!file) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#05070b]">
        {/* FORENSIC AMBIENCE */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.025] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-violet-500/[0.018] blur-3xl" />
        {/* GRID */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.025) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* HEADER */}
        <div className="relative flex items-center justify-between border-b border-white/[0.07] bg-white/[0.015] px-5 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.045]">
              <Eye size={15} className="text-cyan-400" />
              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-slate-700" />
            </div>
            <div>
              <p className="font-mono text-[8px] font-semibold tracking-[0.22em] text-cyan-400/65">
                GATEKEEPER / EVIDENCE CORE
              </p>
              <h2 className="mt-1 text-lg font-medium tracking-tight text-slate-100">
                Evidence Preview
              </h2>
            </div>
          </div>
          <span className="hidden rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[7px] font-semibold tracking-[0.14em] text-slate-600 sm:block">
            AWAITING EVIDENCE
          </span>
        </div>
        {/* EMPTY */}
        <div className="relative flex min-h-[300px] items-center justify-center px-6">
          <div className="max-w-sm text-center">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.018]">
              <Database size={24} className="text-slate-600" />
              <span className="absolute inset-0 rounded-2xl border border-cyan-400/[0.035]" />
            </div>
            <p className="mt-5 font-mono text-[9px] font-semibold tracking-[0.16em] text-slate-500">
              NO EVIDENCE LOADED
            </p>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-600">
              Upload an image or document to initialize evidence inspection and
              forensic extraction.
            </p>
          </div>
        </div>
        {/* FOOTER */}
        <div className="relative border-t border-white/[0.07] bg-black/20 px-5 py-3">
          <div className="flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
            <span className="font-mono text-[7px] tracking-[0.18em] text-slate-700">
              EVIDENCE CORE // STANDBY
            </span>
          </div>
        </div>
      </section>
    );
  }
  /*
   * ============================================================
   * LOADED STATE
   * ============================================================
   */
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#05070b]">
      {/* FORENSIC AMBIENCE */}
      <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-cyan-400/[0.025] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-64 w-64 rounded-full bg-violet-500/[0.018] blur-3xl" />
      {/* FORENSIC GRID */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.025) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative">
        {/* ======================================================
            HEADER
           ====================================================== */}
        <div className="flex flex-col gap-4 border-b border-white/[0.07] bg-white/[0.012] px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.045]">
              <Eye size={15} className="text-cyan-400" />
              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.65)]" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[8px] font-semibold tracking-[0.22em] text-cyan-400/65">
                FORENSIC EVIDENCE INSPECTOR
              </p>
              <h2 className="mt-1 truncate text-lg font-medium tracking-tight text-slate-100">
                Evidence Preview
              </h2>
              <p className="mt-1 truncate font-mono text-[8px] tracking-[0.12em] text-slate-600">
                {file.name}
              </p>
            </div>
          </div>
          {/* ACTIONS */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.035] px-2.5 py-1.5 font-mono text-[7px] font-semibold tracking-[0.14em] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.65)]" />
              LOADED
            </span>
            <span className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[7px] font-semibold tracking-[0.14em] text-slate-500">
              {metadata.extension}
            </span>
            <EvidenceAction title="Download evidence" onClick={handleDownload}>
              <Download size={13} />
            </EvidenceAction>
            {onRemove && (
              <EvidenceAction title="Remove evidence" danger onClick={onRemove}>
                <Trash2 size={13} />
              </EvidenceAction>
            )}
          </div>
        </div>
        {/* ======================================================
            TELEMETRY
           ====================================================== */}
        <div className="grid grid-cols-2 border-b border-white/[0.07] sm:grid-cols-4">
          <EvidenceStat
            label="FILE TYPE"
            value={metadata.type}
            icon={
              metadata.isImage ? (
                <FileImage size={12} />
              ) : (
                <FileText size={12} />
              )
            }
          />
          <EvidenceStat
            label="SIZE"
            value={metadata.size}
            icon={<HardDrive size={12} />}
          />
          <EvidenceStat
            label="FORMAT"
            value={metadata.extension}
            icon={<Database size={12} />}
          />
          <EvidenceStat
            label="INSPECTION"
            value="READY"
            icon={<ScanSearch size={12} />}
            accent
          />
        </div>
        {/* ======================================================
            SOURCE MEDIA
           ====================================================== */}
        <div className="p-5 lg:p-6">
          <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#030508]">
            {/* CANVAS HEADER */}
            <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.015] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_7px_rgba(34,211,238,.55)]" />
                <span className="font-mono text-[7px] font-semibold tracking-[0.18em] text-slate-600">
                  SOURCE MEDIA
                </span>
              </div>
              <span className="font-mono text-[7px] tracking-[0.14em] text-slate-700">
                READ ONLY
              </span>
            </div>
            {/* PREVIEW */}
            <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden p-5 sm:min-h-[390px]">
              {/* GRID */}
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(148,163,184,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.035) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />
              {/* GLOW */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/[0.018] blur-3xl" />
              {previewUrl ? (
                <ImageEvidencePreview
                  previewUrl={previewUrl}
                  fileName={file.name}
                />
              ) : (
                <DocumentEvidencePreview isPdf={metadata.isPdf} />
              )}
            </div>
            {/* CANVAS FOOTER */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] bg-white/[0.012] px-4 py-2.5">
              <div className="flex items-center gap-3 font-mono text-[7px] tracking-[0.14em] text-slate-700">
                <span>ORIGINAL SOURCE</span>
                <span>•</span>
                <span>READ ONLY</span>
              </div>
              <div className="font-mono text-[7px] tracking-[0.14em] text-slate-700">
                GATEKEEPER / EVIDENCE CORE
              </div>
            </div>
          </div>
        </div>
        {/* ======================================================
            FILE IDENTITY
           ====================================================== */}
        <div className="border-t border-white/[0.07] p-5 lg:px-6 lg:pb-6">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.012]">
            <div className="flex items-center gap-3 px-4 py-3.5">
              {metadata.isImage ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04]">
                  <ImageIcon size={15} className="text-cyan-400" />
                </div>
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-400/[0.04]">
                  <FileText size={15} className="text-violet-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[7px] font-semibold tracking-[0.16em] text-slate-700">
                  EVIDENCE FILE
                </p>
                <p
                  title={file.name}
                  className="mt-1 truncate font-mono text-[10px] font-semibold text-slate-300"
                >
                  {file.name}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="font-mono text-[7px] tracking-[0.14em] text-slate-700">
                  SIZE
                </p>
                <p className="mt-1 font-mono text-[9px] font-semibold text-slate-400">
                  {metadata.size}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/[0.07] sm:grid-cols-3">
              <DetailItem label="MIME TYPE" value={metadata.mime} />
              <DetailItem label="FORMAT" value={metadata.extension} />
              <DetailItem
                label="INSPECTION"
                value={
                  metadata.isImage
                    ? "IMAGE PREVIEW READY"
                    : metadata.isPdf
                      ? "DOCUMENT READY"
                      : "FILE READY"
                }
                className="col-span-2 sm:col-span-1"
                accent
              />
            </div>
          </div>
        </div>
        {/* ======================================================
            FOOTER TELEMETRY
           ====================================================== */}
        <div className="border-t border-white/[0.07] bg-black/20 px-5 py-3 lg:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Activity size={10} className="text-cyan-400/60" />
              <span className="font-mono text-[7px] tracking-[0.14em] text-slate-700">
                EVIDENCE LOADED // READY FOR PROCESSING
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={10} className="text-emerald-400/70" />
              <span className="font-mono text-[7px] tracking-[0.14em] text-slate-700">
                SOURCE PRESERVED
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
/* ===============================================================
   IMAGE PREVIEW
   =============================================================== */
function ImageEvidencePreview({
  previewUrl,
  fileName,
}: {
  previewUrl: string;
  fileName: string;
}) {
  return (
    <div className="relative z-10 flex max-h-[400px] w-full items-center justify-center">
      <div className="relative max-w-full overflow-hidden rounded-xl border border-cyan-400/10 bg-black/40 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
        <img
          src={previewUrl}
          alt={`Evidence preview: ${fileName}`}
          className="max-h-[390px] max-w-full rounded-lg object-contain"
        />
        {/* FORENSIC CORNERS */}
        <span className="pointer-events-none absolute left-2 top-2 h-5 w-5 border-l border-t border-cyan-400/40" />
        <span className="pointer-events-none absolute right-2 top-2 h-5 w-5 border-r border-t border-cyan-400/40" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-5 w-5 border-b border-l border-cyan-400/40" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-5 w-5 border-b border-r border-cyan-400/40" />
        {/* SCAN LINE */}
        <div className="pointer-events-none absolute left-2 right-2 top-1/2 h-px bg-cyan-400/10" />
      </div>
    </div>
  );
}
/* ===============================================================
   DOCUMENT PREVIEW
   =============================================================== */
function DocumentEvidencePreview({ isPdf }: { isPdf: boolean }) {
  return (
    <div className="relative z-10 max-w-sm px-6 text-center">
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-400/[0.035]">
        <FileText size={32} className="text-violet-400/75" />
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.6)]" />
      </div>
      <p className="mt-5 font-mono text-[8px] font-semibold tracking-[0.18em] text-violet-400/70">
        {isPdf ? "PDF DOCUMENT" : "DIGITAL DOCUMENT"}
      </p>
      <h3 className="mt-2 text-sm font-medium text-slate-300">
        Document loaded
      </h3>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        A visual preview is not available for this file type. The original
        evidence remains available for downstream forensic processing.
      </p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.035] px-3 py-2 font-mono text-[7px] font-semibold tracking-[0.14em] text-emerald-400">
        <ShieldCheck size={11} />
        READY
      </div>
    </div>
  );
}
/* ===============================================================
   TELEMETRY STAT
   =============================================================== */
function EvidenceStat({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 border-r border-white/[0.07] px-4 py-3.5 last:border-r-0 lg:px-5">
      <div className="flex items-center gap-1.5">
        <span className={accent ? "text-emerald-400/70" : "text-slate-700"}>
          {icon}
        </span>
        <span className="truncate font-mono text-[7px] font-semibold tracking-[0.14em] text-slate-600">
          {label}
        </span>
      </div>
      <p
        className={[
          "mt-1.5 truncate font-mono text-[9px] font-bold",
          accent ? "text-emerald-400" : "text-slate-300",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
/* ===============================================================
   ACTION BUTTON
   =============================================================== */
function EvidenceAction({
  children,
  onClick,
  title,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
        danger
          ? "border-red-500/15 bg-red-500/[0.025] text-red-400/70 hover:border-red-500/25 hover:bg-red-500/[0.06] hover:text-red-400"
          : "border-white/[0.07] bg-white/[0.018] text-slate-600 hover:border-cyan-400/20 hover:bg-cyan-400/[0.035] hover:text-cyan-400",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
/* ===============================================================
   DETAIL ITEM
   =============================================================== */
function DetailItem({
  label,
  value,
  className = "",
  accent = false,
}: {
  label: string;
  value: string;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "min-w-0 border-r border-white/[0.07] px-4 py-3.5 last:border-r-0",
        className,
      ].join(" ")}
    >
      <p className="font-mono text-[7px] font-semibold tracking-[0.14em] text-slate-700">
        {label}
      </p>
      <p
        title={value}
        className={[
          "mt-1 truncate font-mono text-[8px]",
          accent ? "text-emerald-400" : "text-slate-500",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
