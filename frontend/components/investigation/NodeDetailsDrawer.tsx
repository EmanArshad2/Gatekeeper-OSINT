"use client";
import { useMemo, useState } from "react";
import {
  X,
  AlertTriangle,
  ShieldCheck,
  Wallet,
  Globe,
  Database,
  Activity,
  Search,
  Loader2,
  Radio,
  Building2,
  ExternalLink,
  Network,
  Fingerprint,
  FileWarning,
} from "lucide-react";
interface Props {
  node: any;
  onClose(): void;
}
export default function NodeDetailsDrawer({ node, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [osint, setOsint] = useState<any>(null);
  const [scanError, setScanError] = useState("");
  if (!node) return null;
  const p = node.properties || {};
  const score = Number(p.risk_score || 0);
  const risk = useMemo(() => {
    if (score >= 90) {
      return {
        label: "CRITICAL",
        text: "text-red-300",
        icon: "text-red-400",
        border: "border-red-400/30",
        bg: "bg-red-400/[0.07]",
        bar: "bg-red-400",
        glow: "shadow-[0_0_24px_rgba(239,68,68,0.12)]",
      };
    }
    if (score >= 70) {
      return {
        label: "HIGH",
        text: "text-orange-300",
        icon: "text-orange-400",
        border: "border-orange-400/30",
        bg: "bg-orange-400/[0.07]",
        bar: "bg-orange-400",
        glow: "shadow-[0_0_24px_rgba(249,115,22,0.1)]",
      };
    }
    if (score >= 40) {
      return {
        label: "MEDIUM",
        text: "text-amber-300",
        icon: "text-amber-300",
        border: "border-amber-300/30",
        bg: "bg-amber-300/[0.06]",
        bar: "bg-amber-300",
        glow: "shadow-[0_0_24px_rgba(252,211,77,0.08)]",
      };
    }
    return {
      label: "LOW",
      text: "text-emerald-300",
      icon: "text-emerald-400",
      border: "border-emerald-400/30",
      bg: "bg-emerald-400/[0.06]",
      bar: "bg-emerald-400",
      glow: "shadow-[0_0_24px_rgba(52,211,153,0.08)]",
    };
  }, [score]);
  async function scanOSINT() {
    if (!p.address) return;
    try {
      setLoading(true);
      setScanError("");
      const response = await fetch(
        `http://127.0.0.1:8000/api/osint/${encodeURIComponent(p.address)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "OSINT scan failed");
      }
      setOsint(data);
    } catch (error) {
      console.error("OSINT scan failed:", error);
      setScanError(
        error instanceof Error ? error.message : "OSINT scan failed",
      );
    } finally {
      setLoading(false);
    }
  }
  const riskReasons = Array.isArray(p.risk_reasons)
    ? p.risk_reasons
    : p.risk_reasons
      ? [p.risk_reasons]
      : [];
  const labels = osint?.labels ?? p.labels ?? [];
  const sources = osint?.sources ?? p.sources ?? [];
  const confidence = Number(osint?.osint_confidence ?? p.osint_confidence ?? 0);
  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* DRAWER */}
      <aside
        className="
          fixed
          right-0
          top-0
          z-50
          flex
          h-[100dvh]
          w-[min(460px,100vw)]
          flex-col
          overflow-hidden
          border-l
          border-white/[0.08]
          bg-[#05080d]
          shadow-[-30px_0_80px_rgba(0,0,0,0.55)]
        "
      >
        {/* TOP ACCENT */}
        <div
          className={`absolute left-0 right-0 top-0 h-px ${
            score >= 70
              ? "bg-gradient-to-r from-transparent via-red-400/60 to-transparent"
              : "bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
          }`}
        />
        {/* HEADER */}
        <header className="shrink-0 border-b border-white/[0.06] bg-[#070b12]/95 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  ${risk.border}
                  ${risk.bg}
                  ${risk.glow}
                `}
              >
                {score >= 70 ? (
                  <AlertTriangle size={17} className={risk.icon} />
                ) : (
                  <Wallet size={17} className="text-cyan-300" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-400/80">
                  NODE INTELLIGENCE
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-slate-100">
                  Wallet Investigation
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-[8px] text-slate-600">
                    NODE
                  </span>
                  <span className="truncate font-mono text-[8px] text-slate-500">
                    {node.id || "UNKNOWN"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close node details"
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-white/[0.07]
                bg-white/[0.02]
                text-slate-500
                transition-all
                hover:border-white/[0.14]
                hover:bg-white/[0.05]
                hover:text-slate-200
              "
            >
              <X size={14} />
            </button>
          </div>
          {/* ADDRESS */}
          <div className="border-t border-white/[0.04] bg-black/10 px-5 py-3">
            <div className="flex items-center gap-2">
              <Fingerprint size={11} className="text-cyan-400/60" />
              <span className="font-mono text-[8px] font-semibold tracking-[0.16em] text-slate-600">
                WALLET ADDRESS
              </span>
            </div>
            <div className="mt-1.5 break-all font-mono text-[9px] leading-4 text-slate-300">
              {p.address || "Unknown"}
            </div>
          </div>
        </header>
        {/* CONTENT */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* RISK SUMMARY */}
          <section
            className={`
              rounded-xl
              border
              ${risk.border}
              ${risk.bg}
              p-4
            `}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className={risk.icon} />
                  <span className="font-mono text-[9px] font-bold tracking-[0.18em] text-slate-400">
                    THREAT ASSESSMENT
                  </span>
                </div>
                <div
                  className={`mt-2 text-2xl font-bold tracking-tight ${risk.text}`}
                >
                  {score}
                  <span className="ml-1 text-sm font-normal text-slate-600">
                    /100
                  </span>
                </div>
              </div>
              <div
                className={`
                  rounded-lg
                  border
                  ${risk.border}
                  ${risk.bg}
                  px-3
                  py-1.5
                  font-mono
                  text-[9px]
                  font-bold
                  tracking-[0.16em]
                  ${risk.text}
                `}
              >
                {risk.label}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between font-mono text-[7px] tracking-widest text-slate-600">
                <span>RISK INDEX</span>
                <span>{Math.min(Math.max(score, 0), 100)}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/40">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${risk.bar}`}
                  style={{
                    width: `${Math.min(Math.max(score, 0), 100)}%`,
                  }}
                />
              </div>
            </div>
          </section>
          {/* OSINT ACTION */}
          <section className="mt-4">
            <button
              onClick={scanOSINT}
              disabled={loading || !p.address}
              className="
                group
                flex
                h-10
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-violet-400/25
                bg-violet-400/[0.06]
                font-mono
                text-[9px]
                font-bold
                tracking-[0.16em]
                text-violet-300
                shadow-[0_0_20px_rgba(167,139,250,0.06)]
                transition-all
                hover:border-violet-400/45
                hover:bg-violet-400/[0.1]
                hover:shadow-[0_0_25px_rgba(167,139,250,0.12)]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Search
                  size={13}
                  className="transition-transform group-hover:scale-110"
                />
              )}
              {loading ? "SCANNING LIVE INTELLIGENCE..." : "SCAN LIVE OSINT"}
              {!loading && (
                <ExternalLink size={10} className="ml-auto mr-2 opacity-40" />
              )}
            </button>
            {scanError && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-400/15 bg-red-400/[0.04] px-3 py-2.5">
                <AlertTriangle
                  size={12}
                  className="mt-0.5 shrink-0 text-red-400"
                />
                <span className="font-mono text-[8px] leading-4 text-red-300">
                  {scanError}
                </span>
              </div>
            )}
          </section>
          {/* ENTITY ATTRIBUTES */}
          <Panel title="ENTITY ATTRIBUTES" icon={<Database size={12} />}>
            <InfoRow
              icon={<Wallet size={12} />}
              label="WALLET"
              value={p.address}
              mono
            />
            <InfoRow
              icon={<Globe size={12} />}
              label="BLOCKCHAIN"
              value={p.chain}
            />
            <InfoRow
              icon={<Database size={12} />}
              label="ENTITY TYPE"
              value={p.entity_type}
            />
            <InfoRow
              icon={<Activity size={12} />}
              label="RISK LEVEL"
              value={p.risk_level || risk.label}
            />
            <InfoRow
              icon={<Building2 size={12} />}
              label="ORGANIZATION"
              value={p.organization}
            />
          </Panel>
          {/* OSINT INTELLIGENCE */}
          <Panel title="OSINT INTELLIGENCE" icon={<Radio size={12} />}>
            <InfoRow
              label="CONFIDENCE"
              value={`${confidence}%`}
              valueClass={
                confidence >= 70 ? "text-violet-300" : "text-slate-300"
              }
            />
            <InfoRow
              label="SOURCES"
              value={sources.length}
              valueClass="text-violet-300"
            />
            <InfoRow
              label="LABELS"
              value={labels.length}
              valueClass="text-violet-300"
            />
            <InfoRow
              label="TRANSACTIONS"
              value={osint?.tx_count ?? p.tx_count ?? 0}
              valueClass="text-cyan-300"
            />
          </Panel>
          {/* RISK INDICATORS */}
          <Panel title="RISK INDICATORS" icon={<FileWarning size={12} />}>
            {riskReasons.length > 0 ? (
              <div className="space-y-2">
                {riskReasons.map((reason: string, index: number) => (
                  <div
                    key={`${reason}-${index}`}
                    className="
                      flex
                      items-start
                      gap-2.5
                      rounded-lg
                      border
                      border-red-400/10
                      bg-red-400/[0.035]
                      px-3
                      py-2.5
                    "
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-red-400/20 bg-red-400/[0.06] font-mono text-[8px] font-bold text-red-400">
                      !
                    </span>
                    <span className="font-mono text-[8px] leading-4 text-red-300">
                      {reason}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-1 font-mono text-[8px] text-slate-600">
                <ShieldCheck size={12} className="text-emerald-400/50" />
                NO ACTIVE RISK INDICATORS
              </div>
            )}
          </Panel>
          {/* NETWORK TELEMETRY */}
          <Panel title="NETWORK TELEMETRY" icon={<Network size={12} />}>
            <div className="grid grid-cols-2 gap-2">
              <TelemetryBox
                label="TX COUNT"
                value={osint?.tx_count ?? p.tx_count ?? 0}
              />
              <TelemetryBox
                label="NODE RISK"
                value={`${score}/100`}
                danger={score >= 70}
              />
              <TelemetryBox label="OSINT LABELS" value={labels.length} />
              <TelemetryBox label="SOURCES" value={sources.length} />
            </div>
          </Panel>
          {/* LIVE OSINT RESULT */}
          {osint && (
            <Panel title="LIVE OSINT RESULT" icon={<Radio size={12} />}>
              <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.035] p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span className="font-mono text-[8px] font-bold tracking-[0.16em] text-emerald-300">
                      INTELLIGENCE RECEIVED
                    </span>
                  </div>
                  <Radio size={12} className="text-cyan-400/50" />
                </div>
                <InfoRow label="ENTITY" value={osint.entity_type} />
                <InfoRow label="COUNTRY" value={osint.country} />
                <InfoRow label="ORGANIZATION" value={osint.organization} />
                <InfoRow
                  label="CONFIDENCE"
                  value={`${osint.osint_confidence ?? 0}%`}
                  valueClass="text-violet-300"
                />
              </div>
            </Panel>
          )}
          {/* LABELS */}
          {labels.length > 0 && (
            <Panel title="INTELLIGENCE LABELS" icon={<Activity size={12} />}>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((label: any, index: number) => (
                  <span
                    key={`${String(label)}-${index}`}
                    className="
                      rounded-md
                      border
                      border-violet-400/15
                      bg-violet-400/[0.05]
                      px-2
                      py-1
                      font-mono
                      text-[7px]
                      font-semibold
                      tracking-wider
                      text-violet-300
                    "
                  >
                    {String(label)}
                  </span>
                ))}
              </div>
            </Panel>
          )}
          <div className="h-2" />
        </div>
      </aside>
    </>
  );
}
/* ===============================================================
   PANEL
   =============================================================== */
function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-white/[0.06] bg-[#080d17]/80">
      <div className="flex items-center gap-2 border-b border-white/[0.045] bg-white/[0.012] px-3.5 py-2.5">
        <span className="text-slate-600">{icon}</span>
        <span className="font-mono text-[8px] font-bold tracking-[0.18em] text-slate-500">
          {title}
        </span>
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  );
}
/* ===============================================================
   INFO ROW
   =============================================================== */
function InfoRow({
  icon,
  label,
  value,
  valueClass = "text-slate-300",
  mono = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: any;
  valueClass?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 border-b border-white/[0.035] py-2.5 last:border-0 last:pb-0 first:pt-0">
      <div className="flex shrink-0 items-center gap-1.5 text-slate-600">
        {icon}
        <span className="font-mono text-[8px] font-medium tracking-wider">
          {label}
        </span>
      </div>
      <span
        className={`
          min-w-0
          max-w-[65%]
          break-all
          text-right
          text-[8px]
          leading-4
          ${mono ? "font-mono" : "font-mono"}
          ${valueClass}
        `}
      >
        {value !== undefined && value !== null && value !== ""
          ? String(value)
          : "-"}
      </span>
    </div>
  );
}
/* ===============================================================
   TELEMETRY BOX
   =============================================================== */
function TelemetryBox({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div
      className={`
        rounded-lg
        border
        px-3
        py-2.5
        ${
          danger
            ? "border-red-400/15 bg-red-400/[0.035]"
            : "border-white/[0.05] bg-black/15"
        }
      `}
    >
      <div className="font-mono text-[7px] font-semibold tracking-[0.16em] text-slate-600">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-sm font-bold ${
          danger ? "text-red-300" : "text-slate-200"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
