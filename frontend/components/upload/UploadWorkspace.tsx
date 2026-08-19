"use client";
import { useMemo, useState } from "react";
import {
  Upload,
  FileSearch,
  ScanSearch,
  Wallet,
  QrCode,
  Mail,
  Send,
  Globe2,
  Phone,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Database,
  Activity,
  ChevronDown,
  Fingerprint,
  AlertTriangle,
  Radio,
  Cpu,
  Zap,
  Eye,
  FileText,
  LockKeyhole,
  Search,
  CircleDot,
} from "lucide-react";
import UploadZone from "./UploadZone";
import EvidencePreview from "./EvidencePreview";
import OCRViewer from "./OCRViewer";
import WalletTable from "./WalletTable";
import QRPanel from "./QRPanel";
import RiskPanel from "./RiskPanel";
import CorrelationPanel from "./CorrelationPanel";
import SummaryPanel from "./SummaryPanel";
import { extractMedia } from "@/services/extraction";
import { ExtractionResponse } from "@/types/extraction";
type StatusColor = "cyan" | "red" | "amber" | "green";
function StatusDot({ color = "cyan" }: { color?: StatusColor }) {
  const colors = {
    cyan: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,.9)]",
    red: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,.9)]",
    amber: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,.9)]",
    green: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]",
  };
  return (
    <span className="relative flex h-2 w-2">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${colors[color]}`}
      />
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${colors[color]}`}
      />
    </span>
  );
}
export default function UploadWorkspace() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  async function handleUpload(file: File) {
    try {
      setSelectedFile(file);
      setResult(null);
      setLoading(true);
      const response = await extractMedia(file);
      setResult(response);
    } catch (error) {
      console.error("Evidence extraction failed:", error);
    } finally {
      setLoading(false);
    }
  }
  const statistics = useMemo(() => {
    if (!result) {
      return {
        wallets: 0,
        qrCodes: 0,
        emails: 0,
        telegram: 0,
        websites: 0,
        phones: 0,
        highRisk: 0,
        totalEntities: 0,
      };
    }
    const wallets = result.wallets?.length || 0;
    const qrCodes = result.qr_codes?.length || 0;
    const emails = result.emails?.length || 0;
    const telegram = result.telegram_users?.length || 0;
    const websites = result.websites?.length || 0;
    const phones = result.phones?.length || 0;
    const highRisk =
      result.wallets?.filter((wallet) => (wallet.risk_score ?? 0) >= 70)
        .length || 0;
    return {
      wallets,
      qrCodes,
      emails,
      telegram,
      websites,
      phones,
      highRisk,
      totalEntities: wallets + qrCodes + emails + telegram + websites + phones,
    };
  }, [result]);
  const ocrCharacters = result?.ocr_text?.length || 0;
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070b] pb-12 text-white">
      {/* ============================================================
          FORENSIC ATMOSPHERE
      ============================================================ */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[-180px] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.025] blur-[150px]" />
        <div className="absolute right-[-180px] top-[20%] h-[520px] w-[520px] rounded-full bg-violet-600/[0.02] blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      </div>
      <div className="relative mx-auto max-w-[1800px] space-y-4 px-4 py-4 lg:px-6">
        {/* ============================================================
            FORENSIC COMMAND HEADER
        ============================================================ */}
        <header className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080b11]/90 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.055]">
                <FileSearch size={20} className="text-cyan-300" />
                <span className="absolute -right-1 -top-1">
                  <StatusDot color={loading ? "cyan" : "green"} />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[8px] font-bold tracking-[0.28em] text-cyan-400">
                    GK // EVIDENCE CORE
                  </span>
                  <span className="rounded border border-white/[0.07] bg-white/[0.025] px-1.5 py-0.5 font-mono text-[7px] tracking-wider text-slate-600">
                    FORENSIC INTAKE
                  </span>
                </div>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
                  Evidence Intelligence
                </h1>
                <p className="mt-0.5 max-w-2xl text-[11px] text-slate-500">
                  Secure ingestion and forensic extraction of digital evidence.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HeaderStat
                label="ARTIFACT"
                value={selectedFile ? "LOADED" : "WAITING"}
                color={selectedFile ? "cyan" : "slate"}
              />
              <HeaderStat
                label="ENTITIES"
                value={statistics.totalEntities.toString()}
                color={result ? "green" : "slate"}
              />
              <HeaderStat
                label="ENGINE"
                value={loading ? "ACTIVE" : "READY"}
                color={loading ? "cyan" : "green"}
              />
            </div>
          </div>
          {/* ============================================================
              PIPELINE RAIL
          ============================================================ */}
          <div className="border-t border-white/[0.06] bg-black/20 px-5 py-3">
            <div className="flex items-center overflow-x-auto">
              <PipelineItem
                icon={<Upload size={11} />}
                label="INGEST"
                state={loading ? "active" : selectedFile ? "complete" : "idle"}
              />
              <PipelineConnector active={loading || !!selectedFile} />
              <PipelineItem
                icon={<ScanSearch size={11} />}
                label="OCR"
                state={loading ? "active" : result ? "complete" : "idle"}
              />
              <PipelineConnector active={loading || !!result} />
              <PipelineItem
                icon={<Wallet size={11} />}
                label="WALLET"
                state={loading ? "active" : result ? "complete" : "idle"}
              />
              <PipelineConnector active={loading || !!result} />
              <PipelineItem
                icon={<QrCode size={11} />}
                label="QR"
                state={loading ? "active" : result ? "complete" : "idle"}
              />
              <PipelineConnector active={loading || !!result} />
              <PipelineItem
                icon={<Fingerprint size={11} />}
                label="ENTITY"
                state={loading ? "active" : result ? "complete" : "idle"}
              />
              <PipelineConnector active={loading || !!result} />
              <PipelineItem
                icon={<ShieldCheck size={11} />}
                label="RISK"
                state={loading ? "active" : result ? "complete" : "idle"}
              />
            </div>
          </div>
        </header>
        {/* ============================================================
            INTAKE WORKSPACE
        ============================================================ */}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,.75fr)]">
          {/* PRIMARY INTAKE */}
          <section className="relative overflow-hidden rounded-2xl border border-cyan-400/[0.12] bg-[#080b11]/90">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/[0.05]">
                  <LockKeyhole size={14} className="text-cyan-300" />
                </div>
                <div>
                  <div className="font-mono text-[7px] font-bold tracking-[0.2em] text-cyan-400/80">
                    01 / SECURE CHANNEL
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-white">
                    Evidence Intake
                  </div>
                </div>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <StatusDot color={loading ? "cyan" : "green"} />
                <span className="font-mono text-[7px] tracking-[0.16em] text-slate-500">
                  {loading ? "PROCESSING" : "CHANNEL READY"}
                </span>
              </div>
            </div>
            <div className="p-5 lg:p-6">
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <IntakeCapability icon={<ScanSearch size={13} />} label="OCR" />
                <IntakeCapability icon={<Wallet size={13} />} label="WALLET" />
                <IntakeCapability icon={<QrCode size={13} />} label="QR" />
                <IntakeCapability
                  icon={<Fingerprint size={13} />}
                  label="ENTITY"
                />
              </div>
              <UploadZone onUpload={handleUpload} loading={loading} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Radio size={11} className="text-emerald-400" />
                  <span className="font-mono text-[7px] tracking-[0.15em] text-slate-600">
                    SECURE EVIDENCE CHANNEL
                  </span>
                </div>
                <span className="font-mono text-[7px] tracking-wider text-slate-600">
                  PNG / JPG / WEBP / PDF · MAX 25 MB
                </span>
              </div>
            </div>
          </section>
          {/* INTELLIGENCE SNAPSHOT */}
          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#080b11]/90">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <div className="font-mono text-[7px] font-bold tracking-[0.2em] text-violet-400/80">
                  INTELLIGENCE SNAPSHOT
                </div>
                <div className="mt-0.5 text-sm font-semibold text-white">
                  Investigation Status
                </div>
              </div>
              <Activity size={14} className="text-slate-600" />
            </div>
            <div className="p-4">
              <SummaryPanel result={result} />
            </div>
          </section>
        </section>
        {/* ============================================================
            PROCESSING
        ============================================================ */}
        {loading && <ProcessingPanel />}
        {/* ============================================================
            SOURCE EVIDENCE
        ============================================================ */}
        {selectedFile && (
          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#080b11]/90">
            <SectionHeader
              icon={<Eye size={14} />}
              eyebrow="02 / SOURCE EVIDENCE"
              title="Evidence Inspector"
              description="Original media supplied to the extraction engine"
              meta="READ ONLY"
            />
            <div className="p-5 lg:p-6">
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <EvidenceMeta
                  icon={<FileText size={12} />}
                  label="SOURCE FILE"
                  value={selectedFile.name}
                  truncate
                />
                <EvidenceMeta
                  icon={<Database size={12} />}
                  label="MEDIA TYPE"
                  value={getFileType(selectedFile)}
                />
                <EvidenceMeta
                  icon={<Zap size={12} />}
                  label="PAYLOAD SIZE"
                  value={formatFileSize(selectedFile.size)}
                />
              </div>
              <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#05070b]">
                <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <CircleDot size={10} className="text-cyan-400" />
                    <span className="font-mono text-[7px] font-semibold tracking-[0.16em] text-slate-500">
                      ORIGINAL SOURCE
                    </span>
                  </div>
                  <span className="font-mono text-[7px] tracking-wider text-slate-700">
                    READ ONLY
                  </span>
                </div>
                <div className="p-4">
                  <EvidencePreview file={selectedFile} />
                </div>
              </div>
            </div>
          </section>
        )}
        {/* ============================================================
            EXTRACTION RESULTS
        ============================================================ */}
        {result && (
          <>
            <section className="overflow-hidden rounded-2xl border border-emerald-400/[0.1] bg-[#080b11]/90">
              <SectionHeader
                icon={<Database size={14} />}
                eyebrow="03 / EXTRACTION ENGINE"
                title="Recovered Intelligence"
                description="Indicators recovered from submitted evidence"
                meta="EXTRACTION COMPLETE"
                success
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                <ResultMetric
                  icon={<Wallet size={14} />}
                  label="WALLETS"
                  value={statistics.wallets}
                  accent
                  danger={statistics.highRisk > 0}
                />
                <ResultMetric
                  icon={<QrCode size={14} />}
                  label="QR CODES"
                  value={statistics.qrCodes}
                />
                <ResultMetric
                  icon={<Mail size={14} />}
                  label="EMAILS"
                  value={statistics.emails}
                />
                <ResultMetric
                  icon={<Send size={14} />}
                  label="TELEGRAM"
                  value={statistics.telegram}
                />
                <ResultMetric
                  icon={<Globe2 size={14} />}
                  label="WEBSITES"
                  value={statistics.websites}
                />
                <ResultMetric
                  icon={<Phone size={14} />}
                  label="PHONES"
                  value={statistics.phones}
                />
              </div>
              {statistics.highRisk > 0 && (
                <div className="flex items-start gap-3 border-t border-red-500/15 bg-red-500/[0.035] px-5 py-3.5">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0 text-red-400"
                  />
                  <div>
                    <div className="font-mono text-[7px] font-bold tracking-[0.18em] text-red-400">
                      ELEVATED THREAT
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {statistics.highRisk} wallet
                      {statistics.highRisk === 1 ? "" : "s"} require
                      elevated-risk review.
                    </div>
                  </div>
                </div>
              )}
            </section>
            {/* ========================================================
                FORENSIC ANALYSIS
            ======================================================== */}
            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#080b11]/90">
              <details open>
                <summary className="group flex cursor-pointer list-none items-center justify-between px-5 py-4 lg:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.05]">
                      <Cpu size={15} className="text-violet-300" />
                    </div>
                    <div>
                      <div className="font-mono text-[7px] font-bold tracking-[0.2em] text-violet-400/80">
                        04 / FORENSIC ENGINE
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-white">
                        Detailed Intelligence
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 font-mono text-[7px] text-slate-600 sm:block">
                      {statistics.totalEntities} INDICATORS
                    </span>
                    <ChevronDown
                      size={16}
                      className="text-slate-600 transition-transform group-open:rotate-180"
                    />
                  </div>
                </summary>
                <div className="border-t border-white/[0.06] p-4 lg:p-5">
                  <div className="grid gap-4">
                    {/* OCR */}
                    <ForensicModule
                      variant="cyan"
                      icon={<ScanSearch size={15} />}
                      index="01"
                      title="OCR Extraction"
                      description="Recovered textual evidence from the source artifact."
                      value={
                        ocrCharacters
                          ? `${ocrCharacters.toLocaleString()} CHARS`
                          : "NO TEXT"
                      }
                    >
                      <OCRViewer text={result.ocr_text ?? ""} />
                    </ForensicModule>
                    {/* WALLET */}
                    <ForensicModule
                      variant="violet"
                      icon={<Wallet size={15} />}
                      index="02"
                      title="Wallet Detection"
                      description="Blockchain addresses recovered from source evidence."
                      value={`${statistics.wallets} DETECTED`}
                    >
                      <WalletTable wallets={result.wallets ?? []} />
                    </ForensicModule>
                    {/* RISK */}
                    <ForensicModule
                      variant={statistics.highRisk > 0 ? "red" : "amber"}
                      icon={<ShieldCheck size={15} />}
                      index="03"
                      title="Risk Assessment"
                      description="Threat scoring and behavioral analysis of recovered wallets."
                      value={
                        statistics.highRisk > 0
                          ? `${statistics.highRisk} HIGH RISK`
                          : "ANALYZED"
                      }
                    >
                      <RiskPanel wallets={result.wallets ?? []} />
                    </ForensicModule>
                    {/* ENTITY */}
                    <ForensicModule
                      variant="blue"
                      icon={<Fingerprint size={15} />}
                      index="04"
                      title="Entity Correlation"
                      description="Cross-channel identity and communication correlation."
                      value={`${statistics.telegram + statistics.emails + statistics.websites + statistics.phones} MATCHES`}
                    >
                      <CorrelationPanel
                        telegramUsers={result.telegram_users ?? []}
                        emails={result.emails ?? []}
                        websites={result.websites ?? []}
                        phones={result.phones ?? []}
                      />
                    </ForensicModule>
                    {/* QR */}
                    <ForensicModule
                      variant="green"
                      icon={<QrCode size={15} />}
                      index="05"
                      title="QR Intelligence"
                      description="Machine-readable artifacts decoded from source media."
                      value={`${statistics.qrCodes} DETECTED`}
                    >
                      <QRPanel qrCodes={result.qr_codes ?? []} />
                    </ForensicModule>
                  </div>
                </div>
              </details>
            </section>
          </>
        )}
        {/* ============================================================
            EMPTY STATE
        ============================================================ */}
        {!selectedFile && !result && !loading && (
          <section className="relative overflow-hidden rounded-2xl border border-dashed border-white/[0.08] bg-[#080b11]/60 px-6 py-12 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.025),transparent_55%)]" />
            <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.025]">
              <FileSearch size={19} className="text-slate-600" />
            </div>
            <div className="relative mt-4 font-mono text-[8px] font-bold tracking-[0.24em] text-cyan-400/70">
              FORENSIC WORKSPACE READY
            </div>
            <h3 className="relative mt-2 text-sm font-medium text-white">
              Awaiting source evidence
            </h3>
            <p className="relative mx-auto mt-2 max-w-xl text-[11px] leading-5 text-slate-600">
              Upload an image or PDF to initialize the evidence extraction
              pipeline.
            </p>
            <div className="relative mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2">
              {[
                "OCR EXTRACTION",
                "WALLET ANALYSIS",
                "QR DECODING",
                "ENTITY CORRELATION",
                "RISK ASSESSMENT",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[7px] tracking-wider text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
/* ================================================================
   HEADER STAT
================================================================ */
function HeaderStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "cyan" | "green" | "slate";
}) {
  const styles = {
    cyan: "border-cyan-400/10 bg-cyan-400/[0.03] text-cyan-400",
    green: "border-emerald-400/10 bg-emerald-400/[0.03] text-emerald-400",
    slate: "border-white/[0.06] bg-white/[0.02] text-slate-500",
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${styles[color]}`}>
      <div className="font-mono text-[6px] tracking-[0.16em] opacity-60">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[9px] font-semibold">{value}</div>
    </div>
  );
}
/* ================================================================
   PIPELINE
================================================================ */
function PipelineItem({
  icon,
  label,
  state,
}: {
  icon: React.ReactNode;
  label: string;
  state: "idle" | "active" | "complete";
}) {
  const styles = {
    idle: "text-slate-700",
    active: "text-cyan-400",
    complete: "text-emerald-400/80",
  };
  return (
    <div className={`flex shrink-0 items-center gap-1.5 ${styles[state]}`}>
      {state === "complete" ? (
        <CheckCircle2 size={11} />
      ) : state === "active" ? (
        <Loader2 size={11} className="animate-spin" />
      ) : (
        icon
      )}
      <span className="font-mono text-[7px] tracking-[0.12em]">{label}</span>
    </div>
  );
}
function PipelineConnector({ active }: { active: boolean }) {
  return (
    <div
      className={`mx-3 h-px w-6 shrink-0 ${
        active ? "bg-cyan-400/20" : "bg-white/[0.05]"
      }`}
    />
  );
}
/* ================================================================
   INTAKE CAPABILITY
================================================================ */
function IntakeCapability({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2.5">
      <span className="text-cyan-400/70">{icon}</span>
      <span className="font-mono text-[7px] font-semibold tracking-[0.14em] text-slate-500">
        {label}
      </span>
    </div>
  );
}
/* ================================================================
   PROCESSING
================================================================ */
function ProcessingPanel() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#080b11]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
      <div className="flex items-start gap-4 px-5 py-5 lg:px-6">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05]">
          <Loader2 size={18} className="animate-spin text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[8px] font-bold tracking-[0.2em] text-cyan-400">
                FORENSIC EXTRACTION RUNNING
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Evidence is being processed through the extraction engine.
              </div>
            </div>
            <span className="font-mono text-[7px] tracking-wider text-cyan-400/60">
              LIVE
            </span>
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.04]">
            <div className="relative h-full w-2/3 overflow-hidden rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,.3)]">
              <div className="absolute inset-y-0 -left-1/3 w-1/3 animate-[shimmer_1.5s_infinite] bg-white/30 blur-sm" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[7px] tracking-wider">
            <span className="text-cyan-400">OCR</span>
            <span className="text-cyan-400/60">WALLET</span>
            <span className="text-cyan-400/60">QR</span>
            <span className="text-cyan-400/60">ENTITY</span>
            <span className="text-cyan-400/60">RISK</span>
          </div>
        </div>
      </div>
    </section>
  );
}
/* ================================================================
   SECTION HEADER
================================================================ */
function SectionHeader({
  icon,
  eyebrow,
  title,
  description,
  meta,
  success = false,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
  success?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
            success
              ? "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-400"
              : "border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-300"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div
            className={`font-mono text-[7px] font-bold tracking-[0.2em] ${
              success ? "text-emerald-400/80" : "text-cyan-400/80"
            }`}
          >
            {eyebrow}
          </div>
          <div className="mt-0.5 text-sm font-semibold text-white">{title}</div>
          <div className="mt-0.5 truncate text-[10px] text-slate-600">
            {description}
          </div>
        </div>
      </div>
      {meta && (
        <div
          className={`flex shrink-0 items-center gap-2 font-mono text-[7px] font-semibold tracking-[0.14em] ${
            success ? "text-emerald-400/80" : "text-slate-600"
          }`}
        >
          {success && <CheckCircle2 size={11} />}
          {meta}
        </div>
      )}
    </div>
  );
}
/* ================================================================
   FORENSIC MODULE
================================================================ */
function ForensicModule({
  icon,
  index,
  title,
  description,
  value,
  variant,
  children,
}: {
  icon: React.ReactNode;
  index: string;
  title: string;
  description: string;
  value: string;
  variant: "cyan" | "violet" | "red" | "amber" | "green" | "blue";
  children: React.ReactNode;
}) {
  const variants = {
    cyan: {
      border: "border-cyan-400/10",
      icon: "border-cyan-400/15 bg-cyan-400/[0.04] text-cyan-300",
      eyebrow: "text-cyan-400/70",
    },
    violet: {
      border: "border-violet-400/10",
      icon: "border-violet-400/15 bg-violet-400/[0.04] text-violet-300",
      eyebrow: "text-violet-400/70",
    },
    red: {
      border: "border-red-500/15",
      icon: "border-red-500/15 bg-red-500/[0.04] text-red-400",
      eyebrow: "text-red-400/80",
    },
    amber: {
      border: "border-amber-400/10",
      icon: "border-amber-400/15 bg-amber-400/[0.04] text-amber-300",
      eyebrow: "text-amber-400/70",
    },
    green: {
      border: "border-emerald-400/10",
      icon: "border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-300",
      eyebrow: "text-emerald-400/70",
    },
    blue: {
      border: "border-blue-400/10",
      icon: "border-blue-400/15 bg-blue-400/[0.04] text-blue-300",
      eyebrow: "text-blue-400/70",
    },
  };
  const theme = variants[variant];
  return (
    <section
      className={`overflow-hidden rounded-xl border ${theme.border} bg-[#070a0f]`}
    >
      <div className="flex flex-col gap-3 border-b border-white/[0.05] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${theme.icon}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div
              className={`font-mono text-[6px] font-bold tracking-[0.18em] ${theme.eyebrow}`}
            >
              {index} / FORENSIC MODULE
            </div>
            <div className="mt-0.5 text-xs font-semibold text-slate-200">
              {title}
            </div>
            <div className="mt-0.5 truncate text-[9px] text-slate-600">
              {description}
            </div>
          </div>
        </div>
        <span className="shrink-0 rounded-md border border-white/[0.06] bg-white/[0.015] px-2 py-1 font-mono text-[6px] font-semibold tracking-[0.12em] text-slate-500">
          {value}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
/* ================================================================
   RESULT METRIC
================================================================ */
function ResultMetric({
  icon,
  label,
  value,
  accent = false,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="border-r border-b border-white/[0.05] px-4 py-4 last:border-r-0 lg:border-b-0">
      <div
        className={`flex items-center gap-2 ${
          danger
            ? "text-red-400"
            : accent
              ? "text-violet-300"
              : "text-slate-600"
        }`}
      >
        {icon}
        <span className="font-mono text-[6px] font-bold tracking-[0.16em]">
          {label}
        </span>
      </div>
      <div
        className={`mt-2 font-mono text-xl font-semibold ${
          danger ? "text-red-300" : "text-white"
        }`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
/* ================================================================
   EVIDENCE META
================================================================ */
function EvidenceMeta({
  icon,
  label,
  value,
  truncate = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] px-3.5 py-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-600">{icon}</span>}
        <span className="font-mono text-[6px] font-bold tracking-[0.16em] text-slate-600">
          {label}
        </span>
      </div>
      <div
        className={`mt-1.5 font-mono text-[9px] text-slate-400 ${
          truncate ? "truncate" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
/* ================================================================
   HELPERS
================================================================ */
function getFileType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop();
  return extension ? extension.toUpperCase() : "UNKNOWN";
}
function formatFileSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / Math.pow(1024, index)).toFixed(
    index === 0 ? 0 : 1,
  )} ${units[index]}`;
}
