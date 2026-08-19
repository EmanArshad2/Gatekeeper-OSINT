"use client";
import {
  Activity,
  AlertTriangle,
  AtSign,
  FileSearch,
  Globe2,
  MessageCircle,
  Phone,
  QrCode,
  ScanSearch,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  Radio,
  Database,
} from "lucide-react";
import { ExtractionResponse } from "@/types/extraction";
import GKCard from "@/components/common/GKCard";
import GKEmpty from "@/components/common/GKEmpty";
interface SummaryPanelProps {
  result: ExtractionResponse | null;
}
export default function SummaryPanel({ result }: SummaryPanelProps) {
  if (!result) {
    return (
      <GKCard className="h-full overflow-hidden">
        <div className="relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#05070b]">
          <AmbientGrid />
          <div className="relative border-b border-white/[0.07] px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <ForensicIcon icon={<FileSearch size={15} />} />
                <div>
                  <div className="font-mono text-[8px] font-semibold tracking-[0.22em] text-cyan-400/70">
                    EVIDENCE PROCESSING
                  </div>
                  <h2 className="mt-1 text-base font-semibold text-slate-100">
                    Extraction Console
                  </h2>
                </div>
              </div>
              <StatusBadge label="AWAITING INPUT" tone="neutral" />
            </div>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-6 py-10">
            <GKEmpty
              title="No Evidence Loaded"
              description="Submit source material to initialize the forensic extraction workstation."
              icon={<ScanSearch size={18} />}
            />
          </div>
          <div className="relative grid grid-cols-3 border-t border-white/[0.07] bg-black/20">
            <ConsoleState label="SOURCE" value="WAITING" />
            <ConsoleState label="ENGINE" value="STANDBY" />
            <ConsoleState label="ANALYSIS" value="IDLE" />
          </div>
        </div>
      </GKCard>
    );
  }
  const wallets = result.wallets ?? [];
  const qrCodes = result.qr_codes ?? [];
  const telegramUsers = result.telegram_users ?? [];
  const emails = result.emails ?? [];
  const websites = result.websites ?? [];
  const phones = result.phones ?? [];
  const ocrText = result.ocr_text ?? "";
  const highRisk = wallets.filter(
    (wallet) => Number(wallet.risk_score ?? 0) >= 70,
  ).length;
  const mediumRisk = wallets.filter((wallet) => {
    const score = Number(wallet.risk_score ?? 0);
    return score >= 40 && score < 70;
  }).length;
  const validWallets = wallets.filter((wallet) => wallet.valid).length;
  const totalIndicators =
    wallets.length +
    qrCodes.length +
    telegramUsers.length +
    emails.length +
    websites.length +
    phones.length;
  const highestRisk =
    wallets.length > 0
      ? wallets.reduce(
          (max, wallet) => Math.max(max, Number(wallet.risk_score ?? 0)),
          0,
        )
      : null;
  const riskLevel =
    highestRisk === null
      ? "NOT ASSESSED"
      : highestRisk >= 90
        ? "CRITICAL"
        : highestRisk >= 70
          ? "HIGH"
          : highestRisk >= 40
            ? "MEDIUM"
            : "LOW";
  const hasRiskData = highestRisk !== null;
  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#05070b]">
      <AmbientGrid />
      <div className="relative">
        {/* =========================================================
            COMMAND HEADER
        ========================================================= */}
        <div className="border-b border-white/[0.07] px-5 py-5 lg:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <ForensicIcon icon={<Activity size={15} />} />
              <div className="min-w-0">
                <div className="font-mono text-[8px] font-semibold tracking-[0.22em] text-cyan-400/70">
                  FORENSIC PROCESSING
                </div>
                <h2 className="mt-1 text-base font-semibold text-slate-100">
                  Evidence Intelligence
                </h2>
                <p className="mt-1 truncate text-[10px] text-slate-600">
                  Consolidated extraction state for submitted evidence
                </p>
              </div>
            </div>
            <StatusBadge
              label="ANALYSIS COMPLETE"
              tone={highRisk > 0 ? "danger" : "success"}
            />
          </div>
        </div>
        {/* =========================================================
            PROCESSING STATE
        ========================================================= */}
        <div className="border-b border-white/[0.07] bg-black/20 px-5 py-4 lg:px-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={11} className="text-cyan-400" />
              <span className="font-mono text-[8px] font-semibold tracking-[0.18em] text-slate-500">
                EXTRACTION PIPELINE
              </span>
            </div>
            <span className="font-mono text-[7px] tracking-wider text-emerald-400/70">
              VERIFIED
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            <PipelineState label="INGEST" complete />
            <PipelineState label="OCR" complete={ocrText.length > 0} />
            <PipelineState
              label="WALLET"
              complete={wallets.length > 0}
              warning={ocrText.length > 0 && wallets.length === 0}
            />
            <PipelineState label="QR" complete={qrCodes.length > 0} />
            <PipelineState
              label="ENTITY"
              complete={
                telegramUsers.length +
                  emails.length +
                  websites.length +
                  phones.length >
                0
              }
            />
            <PipelineState
              label="RISK"
              complete={hasRiskData}
              warning={!hasRiskData}
            />
          </div>
        </div>
        {/* =========================================================
            PRIMARY FORENSIC STATE
        ========================================================= */}
        <div className="p-5 lg:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* RISK */}
            <div
              className={[
                "relative overflow-hidden rounded-2xl border p-4",
                highRisk > 0
                  ? "border-red-500/20 bg-red-500/[0.035]"
                  : hasRiskData
                    ? "border-emerald-400/15 bg-emerald-400/[0.025]"
                    : "border-amber-400/15 bg-amber-400/[0.025]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[7px] font-semibold tracking-[0.18em] text-slate-600">
                    THREAT ASSESSMENT
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className={[
                        "font-mono text-3xl font-bold",
                        highRisk > 0
                          ? "text-red-400"
                          : hasRiskData
                            ? "text-emerald-400"
                            : "text-amber-400",
                      ].join(" ")}
                    >
                      {hasRiskData ? highestRisk : "—"}
                    </span>
                    {hasRiskData && (
                      <span className="font-mono text-[8px] text-slate-600">
                        /100
                      </span>
                    )}
                  </div>
                  <div
                    className={[
                      "mt-1 font-mono text-[8px] font-bold tracking-[0.12em]",
                      highRisk > 0
                        ? "text-red-400"
                        : hasRiskData
                          ? "text-emerald-400"
                          : "text-amber-400",
                    ].join(" ")}
                  >
                    {riskLevel}
                  </div>
                </div>
                <ShieldCheck
                  size={18}
                  className={
                    highRisk > 0
                      ? "text-red-400/60"
                      : hasRiskData
                        ? "text-emerald-400/60"
                        : "text-amber-400/60"
                  }
                />
              </div>
              {hasRiskData ? (
                <div className="mt-4">
                  <div className="h-1 overflow-hidden rounded-full bg-black/50">
                    <div
                      className={
                        highRisk > 0
                          ? "h-full rounded-full bg-red-500"
                          : "h-full rounded-full bg-emerald-400"
                      }
                      style={{
                        width: `${Math.min(highestRisk ?? 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-amber-400/10 bg-amber-400/[0.025] px-3 py-2">
                  <span className="font-mono text-[7px] text-amber-400/70">
                    NO WALLET THREAT DATA AVAILABLE
                  </span>
                </div>
              )}
            </div>
            {/* EVIDENCE STATS */}
            <div className="grid grid-cols-2 gap-2">
              <PrimaryMetric
                icon={<Wallet size={13} />}
                label="WALLETS"
                value={wallets.length}
              />
              <PrimaryMetric
                icon={<Activity size={13} />}
                label="INDICATORS"
                value={totalIndicators}
              />
              <PrimaryMetric
                icon={<AlertTriangle size={13} />}
                label="HIGH RISK"
                value={highRisk}
                danger={highRisk > 0}
              />
              <PrimaryMetric
                icon={<ScanSearch size={13} />}
                label="OCR CHARS"
                value={ocrText.length}
              />
            </div>
          </div>
          {/* =======================================================
              EXTRACTION MATRIX
          ======================================================= */}
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={11} className="text-violet-400" />
                <span className="font-mono text-[8px] font-semibold tracking-[0.18em] text-slate-500">
                  RECOVERED INDICATORS
                </span>
              </div>
              <span className="font-mono text-[7px] text-slate-600">
                {totalIndicators} TOTAL
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <EvidenceIndicator
                icon={<Wallet size={12} />}
                label="Wallets"
                value={wallets.length}
                tone="cyan"
              />
              <EvidenceIndicator
                icon={<QrCode size={12} />}
                label="QR Codes"
                value={qrCodes.length}
              />
              <EvidenceIndicator
                icon={<MessageCircle size={12} />}
                label="Telegram"
                value={telegramUsers.length}
              />
              <EvidenceIndicator
                icon={<AtSign size={12} />}
                label="Emails"
                value={emails.length}
              />
              <EvidenceIndicator
                icon={<Globe2 size={12} />}
                label="Websites"
                value={websites.length}
              />
              <EvidenceIndicator
                icon={<Phone size={12} />}
                label="Phones"
                value={phones.length}
              />
              <EvidenceIndicator
                icon={<CheckCircle2 size={12} />}
                label="Valid Wallets"
                value={validWallets}
                tone="green"
              />
              <EvidenceIndicator
                icon={<ScanSearch size={12} />}
                label="OCR"
                value={ocrText.length > 0 ? "READY" : "NONE"}
                tone={ocrText.length > 0 ? "green" : "neutral"}
              />
            </div>
          </div>
          {/* =======================================================
              EXTRACTION WARNING
          ======================================================= */}
          {ocrText.length > 0 && wallets.length === 0 && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.025] px-3.5 py-3">
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0 text-amber-400"
              />
              <div>
                <div className="font-mono text-[8px] font-bold tracking-[0.12em] text-amber-400">
                  EXTRACTION REVIEW REQUIRED
                </div>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  OCR recovered text, but no blockchain wallet was validated
                  from the extracted content.
                </p>
              </div>
            </div>
          )}
          {/* =======================================================
              WALLET RISK DISTRIBUTION
          ======================================================= */}
          {wallets.length > 0 && (
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[7px] font-semibold tracking-[0.16em] text-slate-600">
                  WALLET RISK DISTRIBUTION
                </span>
                <span className="font-mono text-[7px] text-slate-700">
                  {wallets.length} ANALYZED
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <RiskStat
                  label="LOW"
                  value={Math.max(wallets.length - highRisk - mediumRisk, 0)}
                  tone="emerald"
                />
                <RiskStat label="MEDIUM" value={mediumRisk} tone="amber" />
                <RiskStat label="HIGH" value={highRisk} tone="red" />
              </div>
            </div>
          )}
          {/* =======================================================
              TELEMETRY
          ======================================================= */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-4">
            <Telemetry label="OCR" value={ocrText.length > 0 ? "YES" : "NO"} />
            <Telemetry label="VALIDATED" value={validWallets} />
            <Telemetry
              label="OSINT"
              value={websites.length + telegramUsers.length}
            />
            <Telemetry label="QR" value={qrCodes.length} />
            <div className="ml-auto flex items-center gap-2">
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  highRisk > 0
                    ? "bg-red-400 shadow-[0_0_7px_rgba(248,113,113,.7)]"
                    : "bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.7)]",
                ].join(" ")}
              />
              <span className="font-mono text-[7px] tracking-[0.14em] text-slate-600">
                PIPELINE COMPLETE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ================================================================
   AMBIENT GRID
================================================================ */
function AmbientGrid() {
  return (
    <>
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/[0.025] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-64 w-64 rounded-full bg-violet-500/[0.018] blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.025) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </>
  );
}
/* ================================================================
   FORENSIC ICON
================================================================ */
function ForensicIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.045] shadow-[0_0_20px_rgba(34,211,238,.035)] text-cyan-400">
      {icon}
      <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]" />
    </div>
  );
}
/* ================================================================
   STATUS BADGE
================================================================ */
function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "danger" | "neutral";
}) {
  const styles = {
    success: "border-emerald-400/15 bg-emerald-400/[0.035] text-emerald-400",
    danger: "border-red-500/15 bg-red-500/[0.035] text-red-400",
    neutral: "border-white/[0.08] bg-white/[0.025] text-slate-500",
  };
  return (
    <span
      className={`flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[7px] font-semibold tracking-[0.13em] ${styles[tone]}`}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          tone === "success"
            ? "bg-emerald-400"
            : tone === "danger"
              ? "bg-red-400"
              : "bg-slate-600",
        ].join(" ")}
      />
      {label}
    </span>
  );
}
/* ================================================================
   PIPELINE STATE
================================================================ */
function PipelineState({
  label,
  complete,
  warning = false,
}: {
  label: string;
  complete: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={[
        "relative rounded-md border px-2 py-2 text-center",
        warning
          ? "border-amber-400/15 bg-amber-400/[0.025]"
          : complete
            ? "border-emerald-400/10 bg-emerald-400/[0.02]"
            : "border-white/[0.05] bg-white/[0.01]",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto mb-1 h-1 w-1 rounded-full",
          warning
            ? "bg-amber-400"
            : complete
              ? "bg-emerald-400"
              : "bg-slate-700",
        ].join(" ")}
      />
      <span
        className={[
          "font-mono text-[6px] tracking-wider",
          warning
            ? "text-amber-400"
            : complete
              ? "text-emerald-400/70"
              : "text-slate-700",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}
/* ================================================================
   PRIMARY METRIC
================================================================ */
function PrimaryMetric({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-3",
        danger
          ? "border-red-500/15 bg-red-500/[0.025]"
          : "border-white/[0.06] bg-white/[0.015]",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center gap-2",
          danger ? "text-red-400" : "text-slate-600",
        ].join(" ")}
      >
        {icon}
        <span className="font-mono text-[7px] font-semibold tracking-[0.13em]">
          {label}
        </span>
      </div>
      <div
        className={[
          "mt-2 font-mono text-lg font-bold",
          danger ? "text-red-400" : "text-slate-100",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
/* ================================================================
   EVIDENCE INDICATOR
================================================================ */
function EvidenceIndicator({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "cyan" | "green" | "neutral";
}) {
  const styles = {
    cyan: {
      icon: "bg-cyan-400/[0.05] text-cyan-400",
      value: "text-cyan-400",
    },
    green: {
      icon: "bg-emerald-400/[0.045] text-emerald-400",
      value: "text-emerald-400",
    },
    neutral: {
      icon: "bg-white/[0.025] text-slate-500",
      value: "text-slate-200",
    },
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.012] px-3 py-2.5">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles[tone].icon}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate font-mono text-[7px] tracking-[0.1em] text-slate-600">
          {label}
        </div>
        <div
          className={`mt-0.5 font-mono text-sm font-bold ${styles[tone].value}`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
/* ================================================================
   RISK STAT
================================================================ */
function RiskStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "red";
}) {
  const styles = {
    emerald: {
      border: "border-emerald-400/10 bg-emerald-400/[0.02]",
      text: "text-emerald-400",
    },
    amber: {
      border: "border-orange-400/10 bg-orange-400/[0.02]",
      text: "text-orange-400",
    },
    red: {
      border: "border-red-500/10 bg-red-500/[0.02]",
      text: "text-red-400",
    },
  };
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${styles[tone].border}`}
    >
      <span className="font-mono text-[7px] tracking-wider text-slate-600">
        {label}
      </span>
      <span className={`font-mono text-sm font-bold ${styles[tone].text}`}>
        {value}
      </span>
    </div>
  );
}
/* ================================================================
   TELEMETRY
================================================================ */
function Telemetry({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[6px] tracking-wider text-slate-700">
        {label}
      </span>
      <span className="font-mono text-[7px] font-semibold text-slate-500">
        {value}
      </span>
    </div>
  );
}
/* ================================================================
   EMPTY CONSOLE STATE
================================================================ */
function ConsoleState({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-white/[0.05] px-3 py-3 text-center last:border-r-0">
      <div className="font-mono text-[6px] tracking-[0.14em] text-slate-700">
        {label}
      </div>
      <div className="mt-1 font-mono text-[7px] font-semibold text-slate-500">
        {value}
      </div>
    </div>
  );
}
