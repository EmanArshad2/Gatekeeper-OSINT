"use client";
import {
  FolderOpen,
  FileImage,
  FileText,
  QrCode,
  Calendar,
  Search,
  Download,
  Eye,
  ShieldCheck,
  Database,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock3,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/services/api";
interface EvidenceItem {
  id: string;
  media_id: number;
  file: string;
  type: string;
  uploaded: string;
  size: string;
  view_url: string;
  download_url: string;
  available: boolean;
}
export default function EvidenceWorkspace() {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  /* ============================================================
     LOAD COMPLETE EVIDENCE REGISTRY
  ============================================================ */
  async function loadEvidence(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      const response = await api.get("/evidence");
      const files: EvidenceItem[] = Array.isArray(response.data?.files)
        ? response.data.files
        : [];
      const sortedEvidence = [...files].sort((a, b) => {
        const dateA = a.uploaded ? new Date(a.uploaded).getTime() : 0;
        const dateB = b.uploaded ? new Date(b.uploaded).getTime() : 0;
        return dateB - dateA;
      });
      setEvidence(sortedEvidence);
    } catch (err) {
      console.error("GATEKEEPER / EVIDENCE LOAD FAILED:", err);
      setError("Unable to synchronize the evidence registry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => {
    loadEvidence();
  }, []);
  /* ============================================================
     FILTER EVIDENCE
  ============================================================ */
  const filteredEvidence = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return evidence;
    }
    return evidence.filter((item) => {
      return (
        item.file?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q) ||
        item.id?.toLowerCase().includes(q) ||
        String(item.media_id).includes(q) ||
        item.size?.toLowerCase().includes(q) ||
        (item.available ? "available" : "unavailable").includes(q) ||
        (item.uploaded &&
          new Date(item.uploaded).toLocaleString().toLowerCase().includes(q))
      );
    });
  }, [evidence, searchQuery]);
  /* ============================================================
     LATEST EVIDENCE
  ============================================================ */
  const latestEvidenceId = useMemo(() => {
    if (!evidence.length) {
      return null;
    }
    return evidence[0]?.id ?? null;
  }, [evidence]);
  /* ============================================================
     METRICS
  ============================================================ */
  const images = evidence.filter(
    (item) => item.type?.toLowerCase() === "image",
  ).length;
  const documents = evidence.filter(
    (item) => item.type?.toLowerCase() === "pdf",
  ).length;
  const qrCodes = evidence.filter(
    (item) =>
      item.file?.toLowerCase().includes("qr") ||
      item.type?.toLowerCase().includes("qr"),
  ).length;
  const availableFiles = evidence.filter(
    (item) => item.available === true,
  ).length;
  /* ============================================================
     LOADING
  ============================================================ */
  if (loading) {
    return (
      <div className="relative flex min-h-[calc(100vh-110px)] items-center justify-center overflow-hidden bg-[#05070b]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.035] blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        </div>
        <div className="relative w-full max-w-md px-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-7 backdrop-blur-xl">
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            <div className="flex items-start gap-5">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06]">
                <div className="absolute inset-2 animate-spin rounded-full border border-cyan-400/10 border-t-cyan-400/70" />
                <Database
                  size={17}
                  strokeWidth={1.6}
                  className="text-cyan-300"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  </span>
                  <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-cyan-400">
                    GATEKEEPER // EVIDENCE
                  </p>
                </div>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">
                  Accessing evidence vault
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Synchronizing complete forensic evidence registry
                </p>
              </div>
            </div>
            <div className="mt-7 space-y-2">
              <div className="flex items-center justify-between font-mono text-[9px] tracking-wider">
                <span className="text-slate-500">EVIDENCE INDEX</span>
                <span className="font-semibold text-cyan-400">ACTIVE</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-cyan-400/20 via-cyan-400/60 to-cyan-400/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  /* ============================================================
     MAIN WORKSPACE
  ============================================================ */
  return (
    <main className="relative min-h-full overflow-hidden bg-[#05070b] pb-10 text-white">
      {/* ========================================================
          WORKSPACE ATMOSPHERE
      ======================================================== */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[20%] top-[-15%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.025] blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[450px] w-[450px] rounded-full bg-violet-600/[0.025] blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      </div>
      <div className="relative mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* ======================================================
            COMMAND HEADER
        ====================================================== */}
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          <div className="flex items-start justify-between gap-5 px-5 py-6 lg:px-7">
            <div className="min-w-0">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  Digital evidence
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white lg:text-[26px]">
                Evidence Vault
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
                Complete repository for uploaded media, documents, QR artifacts
                and forensic evidence.
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300">
              <FolderOpen size={18} strokeWidth={1.6} />
            </div>
          </div>
          {/* HEADER TELEMETRY */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-3.5 lg:px-7">
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={12}
                strokeWidth={1.7}
                className="text-emerald-400"
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400">
                Complete evidence repository secured
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                {evidence.length.toString().padStart(2, "0")} ARTIFACTS INDEXED
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.5)]" />
                {availableFiles} AVAILABLE
              </span>
              <button
                type="button"
                onClick={() => loadEvidence(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.07em] text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={10}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
              <Link
                href="/reports"
                className="flex items-center gap-1.5 rounded-md border border-cyan-400/25 bg-cyan-400/[0.06] px-2.5 py-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.07em] text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
              >
                <FileText size={10} />
                Report on All Evidence
              </Link>
            </div>
          </div>
        </section>
        {/* ======================================================
            ERROR
        ====================================================== */}
        {error && (
          <section className="mt-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-red-400/15 bg-red-400/[0.04] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <XCircle size={15} strokeWidth={1.6} className="text-red-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-red-300">
                  {error}
                </span>
              </div>
              <button
                type="button"
                onClick={() => loadEvidence()}
                className="font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-red-300 hover:text-red-200"
              >
                Retry
              </button>
            </div>
          </section>
        )}
        {/* ======================================================
            SEARCH
        ====================================================== */}
        <section className="relative mt-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 backdrop-blur-xl">
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/[0.18] to-transparent" />
            <div className="flex items-center gap-3">
              <Search
                size={15}
                strokeWidth={1.6}
                className="shrink-0 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search complete evidence registry..."
                className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="shrink-0 font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400 transition hover:text-cyan-300"
                >
                  Clear
                </button>
              )}
              <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500 sm:block">
                SEARCH INDEX
              </span>
            </div>
          </div>
        </section>
        {/* ======================================================
            EVIDENCE SNAPSHOT
        ====================================================== */}
        <section className="relative mt-8">
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <span className="h-px w-4 bg-cyan-400/60" />
              <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-cyan-400">
                EVIDENCE SNAPSHOT
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Repository overview
              </h2>
              <span className="rounded border border-emerald-400/20 bg-emerald-400/[0.05] px-2 py-1 font-mono text-[8px] font-semibold tracking-[0.12em] text-emerald-400">
                {evidence.length > 0 ? "INDEXED" : "EMPTY"}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
              Complete inventory of evidence artifacts available for forensic
              analysis, ordered from newest to oldest.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              title="Evidence files"
              value={String(evidence.length)}
              description="All indexed artifacts"
              icon={FolderOpen}
              tone="cyan"
              code="EVD-01"
            />
            <Metric
              title="Images"
              value={String(images)}
              description="Visual evidence artifacts"
              icon={FileImage}
              tone="violet"
              code="IMG-02"
            />
            <Metric
              title="Documents"
              value={String(documents)}
              description="PDF evidence records"
              icon={FileText}
              tone="cyan"
              code="DOC-03"
            />
            <Metric
              title="QR codes"
              value={String(qrCodes)}
              description="QR-related evidence"
              icon={QrCode}
              tone="green"
              code="QR-04"
            />
          </div>
        </section>
        {/* ======================================================
            EVIDENCE REGISTER
        ====================================================== */}
        <section className="relative mt-8">
          <div className="mb-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Database size={14} strokeWidth={1.7} className="text-cyan-400" />
              <span className="h-px w-3 bg-cyan-400/45" />
              <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-cyan-400">
                EVIDENCE REGISTER
              </span>
            </div>
            <div className="hidden items-center gap-1.5 font-mono text-[9px] text-slate-500 sm:flex">
              <span>
                {filteredEvidence.length.toString().padStart(2, "0")} RECORDS
              </span>
              <ArrowUpRight size={11} className="text-slate-500" />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/[0.18] to-transparent" />
            {/* TABLE HEADER */}
            <div className="hidden border-b border-white/[0.07] bg-white/[0.015] px-5 py-3.5 lg:grid lg:grid-cols-[0.75fr_2fr_0.8fr_1.2fr_0.8fr_110px] lg:items-center lg:gap-4">
              <TableHeading>ID</TableHeading>
              <TableHeading>Filename</TableHeading>
              <TableHeading>Type</TableHeading>
              <TableHeading>Indexed</TableHeading>
              <TableHeading>Size</TableHeading>
              <TableHeading>Actions</TableHeading>
            </div>
            {/* TABLE BODY */}
            <div className="divide-y divide-white/[0.06]">
              {filteredEvidence.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500">
                    <FolderOpen size={20} strokeWidth={1.5} />
                  </div>
                  <strong className="text-sm font-semibold text-white">
                    {searchQuery
                      ? "No matching evidence found"
                      : "No evidence recorded"}
                  </strong>
                  <span className="mt-1.5 max-w-[300px] text-xs leading-relaxed text-slate-400">
                    {searchQuery
                      ? "Try adjusting your search query parameters."
                      : "Uploaded forensic artifacts will appear here automatically."}
                  </span>
                </div>
              ) : (
                filteredEvidence.map((item, index) => (
                  <EvidenceRow
                    key={`${item.id}-${item.media_id}`}
                    item={item}
                    index={index}
                    isLatest={item.id === latestEvidenceId}
                  />
                ))
              )}
            </div>
            {/* FOOTER */}
            {evidence.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.015] px-5 py-3 lg:px-6">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                  Complete evidence trail registry
                </span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[9px] text-slate-500">
                    {evidence.length} TOTAL
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[9px] font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.5)]" />
                    SYNCHRONIZED
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
/* ================================================================
   EVIDENCE ROW
================================================================ */
function EvidenceRow({
  item,
  index,
  isLatest,
}: {
  item: EvidenceItem;
  index: number;
  isLatest: boolean;
}) {
  const type = item.type?.toLowerCase() || "unknown";
  const isImage = type === "image";
  const isPdf = type === "pdf";
  const isQr = type.includes("qr") || item.file?.toLowerCase().includes("qr");
  const Icon = isImage
    ? FileImage
    : isPdf
      ? FileText
      : isQr
        ? QrCode
        : FolderOpen;
  const typeClass = isImage
    ? "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300"
    : isPdf
      ? "border-violet-400/20 bg-violet-400/[0.06] text-violet-300"
      : isQr
        ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
        : "border-white/[0.08] bg-white/[0.025] text-slate-400";
  const formattedDate = item.uploaded
    ? new Date(item.uploaded).toLocaleDateString()
    : "N/A";
  const formattedTime = item.uploaded
    ? new Date(item.uploaded).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return (
    <div className="group relative px-5 py-4.5 transition-colors duration-200 hover:bg-white/[0.025] lg:px-6">
      {/* ROW ACCENT */}
      <span
        className={`absolute bottom-0 left-0 top-0 w-px transition-colors duration-200 ${
          isLatest
            ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,.6)]"
            : "bg-transparent group-hover:bg-cyan-400"
        }`}
      />
      {/* DESKTOP */}
      <div className="hidden lg:grid lg:grid-cols-[0.75fr_2fr_0.8fr_1.2fr_0.8fr_110px] lg:items-center lg:gap-4">
        {/* ID */}
        <div>
          <div className="font-mono text-[9px] font-medium tracking-[0.06em] text-slate-400">
            {String(index + 1).padStart(2, "0")} / {item.id}
          </div>
          <div className="mt-1.5 font-mono text-[8px] text-slate-500">
            MEDIA {item.media_id}
          </div>
        </div>
        {/* FILE */}
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${typeClass}`}
          >
            <Icon size={15} strokeWidth={1.6} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <strong
                className="block truncate text-xs font-semibold text-slate-200"
                title={item.file}
              >
                {item.file}
              </strong>
              {isLatest && (
                <span className="flex shrink-0 items-center gap-1 rounded border border-cyan-400/20 bg-cyan-400/[0.05] px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-cyan-300">
                  <Clock3 size={9} />
                  Latest
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              {item.available ? (
                <span className="flex items-center gap-1 font-mono text-[8px] font-medium uppercase tracking-[0.06em] text-emerald-400">
                  <CheckCircle2 size={10} />
                  Available
                </span>
              ) : (
                <span className="flex items-center gap-1 font-mono text-[8px] font-medium uppercase tracking-[0.06em] text-slate-500">
                  <XCircle size={10} />
                  Storage unavailable
                </span>
              )}
              <span className="h-0.5 w-0.5 rounded-full bg-slate-600" />
              <span className="font-mono text-[8px] text-slate-500">
                FORENSIC ARTIFACT
              </span>
            </div>
          </div>
        </div>
        {/* TYPE */}
        <div>
          <span
            className={`inline-flex rounded-md border px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.06em] ${typeClass}`}
          >
            {item.type}
          </span>
        </div>
        {/* DATE */}
        <div className="flex flex-col gap-1 font-mono text-[9px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Calendar size={11} strokeWidth={1.5} />
            {formattedDate}
          </span>
          <span className="pl-[18px] text-[8px] text-slate-500">
            {formattedTime}
          </span>
        </div>
        {/* SIZE */}
        <div className="font-mono text-[9px] font-medium text-slate-300">
          {item.size}
        </div>
        {/* ACTIONS */}
        <EvidenceActions item={item} />
      </div>
      {/* MOBILE / TABLET */}
      <div className="flex items-start gap-3 lg:hidden">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${typeClass}`}
        >
          <Icon size={16} strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <strong
                  className="block truncate text-xs font-semibold text-slate-200"
                  title={item.file}
                >
                  {item.file}
                </strong>
                {isLatest && (
                  <span className="shrink-0 rounded border border-cyan-400/20 bg-cyan-400/[0.05] px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] text-cyan-300">
                    Latest
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[9px] text-slate-400">
                  {item.id}
                </span>
                <span className="h-0.5 w-0.5 rounded-full bg-slate-600" />
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] ${typeClass}`}
                >
                  {item.type}
                </span>
              </div>
            </div>
            <EvidenceActions item={item} />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-3 font-mono text-[9px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar size={11} />
              {formattedDate}
            </span>
            <span>{item.size}</span>
            {item.available ? (
              <span className="flex items-center gap-1 font-medium text-emerald-400">
                <CheckCircle2 size={10} />
                AVAILABLE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-500">
                <XCircle size={10} />
                UNAVAILABLE
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
/* ================================================================
   TABLE HEADING
================================================================ */
function TableHeading({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
      {children}
    </span>
  );
}
/* ================================================================
   EVIDENCE ACTIONS
================================================================ */
function EvidenceActions({ item }: { item: EvidenceItem }) {
  const getApiOrigin = () => {
    const configured =
      process.env.NEXT_PUBLIC_API_URL ||
      api.defaults.baseURL ||
      "http://127.0.0.1:8000";
    return configured.replace(/\/+$/, "");
  };
  const getFullUrl = (rawUrl: string) => {
    if (!rawUrl) {
      return "";
    }
    const value = rawUrl.trim();
    if (/^https?:\/\//i.test(value)) {
      return value;
    }
    const origin = getApiOrigin();
    let path = value.startsWith("/") ? value : `/${value}`;
    const originHasApi = origin.toLowerCase().endsWith("/api");
    const pathHasApi = path.toLowerCase().startsWith("/api/");
    if (originHasApi && pathHasApi) {
      path = path.substring(4);
    } else if (!originHasApi && !pathHasApi) {
      path = `/api${path}`;
    }
    return `${origin}${path}`;
  };
  /* ============================================================
     VIEW
  ============================================================ */
  const handleView = () => {
    if (!item.available) {
      console.warn("GATEKEEPER / EVIDENCE UNAVAILABLE:", item.file);
      return;
    }
    if (!item.view_url) {
      console.error("GATEKEEPER / MISSING VIEW URL:", item);
      return;
    }
    const url = getFullUrl(item.view_url);
    console.log("GATEKEEPER / VIEW EVIDENCE");
    console.log("File:", item.file);
    console.log("Media ID:", item.media_id);
    console.log("Raw view URL:", item.view_url);
    console.log("Resolved view URL:", url);
    if (!url) {
      console.error("GATEKEEPER / INVALID VIEW URL");
      return;
    }
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!newWindow) {
      console.warn("GATEKEEPER / BROWSER BLOCKED EVIDENCE WINDOW");
      window.location.href = url;
    }
  };
  /* ============================================================
     DOWNLOAD
  ============================================================ */
  const handleDownload = async () => {
    if (!item.available) {
      console.warn("GATEKEEPER / EVIDENCE UNAVAILABLE:", item.file);
      return;
    }
    if (!item.download_url) {
      console.error("GATEKEEPER / MISSING DOWNLOAD URL:", item);
      return;
    }
    const url = getFullUrl(item.download_url);
    console.log("GATEKEEPER / DOWNLOAD EVIDENCE");
    console.log("File:", item.file);
    console.log("Media ID:", item.media_id);
    console.log("Raw download URL:", item.download_url);
    console.log("Resolved download URL:", url);
    if (!url) {
      console.error("GATEKEEPER / INVALID DOWNLOAD URL");
      return;
    }
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          `Download request failed: ${response.status} ${response.statusText}`,
        );
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = item.file || `evidence-${item.media_id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
      console.log("GATEKEEPER / DOWNLOAD COMPLETE:", item.file);
    } catch (error) {
      console.error("GATEKEEPER / DOWNLOAD FAILED:", error);
      const fallbackLink = document.createElement("a");
      fallbackLink.href = url;
      fallbackLink.target = "_blank";
      fallbackLink.rel = "noopener noreferrer";
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      fallbackLink.remove();
    }
  };
  const viewDisabled = !item.available || !item.view_url;
  const downloadDisabled = !item.available || !item.download_url;
  /* ============================================================
     GENERATE REPORT FOR THIS EVIDENCE ITEM
     Resolves the wallets that were extracted from this specific
     file, then generates an ad-hoc PDF scoped to just those wallets
     — the per-row equivalent of the case/all-extracted reports on
     the Reports page.
  ============================================================ */
  const [generatingReport, setGeneratingReport] = useState(false);
  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      // getApiOrigin() may already end in "/api" depending on how
      // NEXT_PUBLIC_API_URL is set — strip it before appending "/api/..."
      // ourselves, or these requests double up to "/api/api/..." and 404
      // (the exact bug that was just fixed in InvestigationControls.tsx).
      const origin = getApiOrigin().replace(/\/api$/i, "");
      const walletsResponse = await fetch(
        `${origin}/api/evidence/${item.media_id}/wallets`,
        { cache: "no-store" },
      );
      if (!walletsResponse.ok) {
        throw new Error("Could not look up wallets for this evidence.");
      }
      const walletsData = await walletsResponse.json();
      const walletIds: number[] = (walletsData.wallets || []).map(
        (w: { id: number }) => w.id,
      );
      if (walletIds.length === 0) {
        alert(
          "No wallet addresses have been extracted from this evidence yet.",
        );
        return;
      }
      const reportResponse = await fetch(
        `${origin}/api/report/generate/adhoc`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_ids: walletIds,
            title: `Evidence Report — ${item.file}`,
          }),
        },
      );
      if (!reportResponse.ok) {
        throw new Error("Report generation failed.");
      }
      const blob = await reportResponse.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `gatekeeper-evidence-${item.media_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error("GATEKEEPER / EVIDENCE REPORT FAILED:", error);
      alert("Could not generate a report for this evidence item.");
    } finally {
      setGeneratingReport(false);
    }
  };
  return (
    <div className="flex shrink-0 items-center justify-end gap-1.5">
      {/* VIEW */}
      <button
        type="button"
        onClick={handleView}
        disabled={viewDisabled}
        aria-label={viewDisabled ? "Evidence unavailable" : `View ${item.file}`}
        title={viewDisabled ? "Evidence file is unavailable" : "View evidence"}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 ${
          viewDisabled
            ? "cursor-not-allowed border-white/[0.05] bg-white/[0.015] text-slate-700"
            : "border-cyan-400/20 bg-cyan-400/[0.04] text-cyan-400 hover:border-cyan-400/40 hover:bg-cyan-400/[0.10] hover:text-cyan-300"
        }`}
      >
        <Eye size={14} strokeWidth={1.6} />
      </button>
      {/* DOWNLOAD */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloadDisabled}
        aria-label={
          downloadDisabled ? "Evidence unavailable" : `Download ${item.file}`
        }
        title={
          downloadDisabled
            ? "Evidence file is unavailable"
            : "Download evidence"
        }
        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 ${
          downloadDisabled
            ? "cursor-not-allowed border-white/[0.05] bg-white/[0.015] text-slate-700"
            : "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-400 hover:border-emerald-400/40 hover:bg-emerald-400/[0.10] hover:text-emerald-300"
        }`}
      >
        <Download size={14} strokeWidth={1.6} />
      </button>
      {/* GENERATE REPORT FOR THIS EVIDENCE ITEM */}
      <button
        type="button"
        onClick={handleGenerateReport}
        disabled={generatingReport}
        aria-label={`Generate report for ${item.file}`}
        title="Generate report for this evidence item"
        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 ${
          generatingReport
            ? "cursor-not-allowed border-white/[0.05] bg-white/[0.015] text-slate-700"
            : "border-violet-400/20 bg-violet-400/[0.04] text-violet-400 hover:border-violet-400/40 hover:bg-violet-400/[0.10] hover:text-violet-300"
        }`}
      >
        {generatingReport ? (
          <RefreshCw size={14} strokeWidth={1.6} className="animate-spin" />
        ) : (
          <FileText size={14} strokeWidth={1.6} />
        )}
      </button>
    </div>
  );
}
/* ================================================================
   METRIC
================================================================ */
function Metric({
  title,
  value,
  description,
  icon: Icon,
  tone,
  code,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  tone: "cyan" | "violet" | "green";
  code: string;
}) {
  const styles = {
    cyan: {
      border: "border-cyan-400/20",
      icon: "text-cyan-300",
      glow: "bg-cyan-400",
    },
    violet: {
      border: "border-violet-400/20",
      icon: "text-violet-300",
      glow: "bg-violet-400",
    },
    green: {
      border: "border-emerald-400/15",
      icon: "text-emerald-300",
      glow: "bg-emerald-400",
    },
  }[tone];
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border ${styles.border} bg-white/[0.025] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.045]`}
    >
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.035] blur-2xl transition-all duration-500 group-hover:scale-150 ${styles.glow}`}
      />
      <span
        className={`absolute left-0 right-0 top-0 h-px opacity-40 transition-opacity duration-300 group-hover:opacity-100 ${styles.glow}`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </p>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-white">
              {value}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">{description}</p>
        </div>
        <div
          className={`rounded-xl border border-white/10 bg-white/[0.04] p-2.5 ${styles.icon}`}
        >
          <Icon size={18} strokeWidth={1.6} />
        </div>
      </div>
      <div className="relative mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${styles.glow}`} />
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Indexed
          </span>
        </div>
        <span className="font-mono text-[9px] tracking-[0.1em] text-slate-500">
          {code}
        </span>
      </div>
    </article>
  );
}
