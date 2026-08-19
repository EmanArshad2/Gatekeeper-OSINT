"use client";
import {
  Activity,
  ArrowUpRight,
  FileSearch,
  FolderOpen,
  GitBranch,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import type { ElementType, KeyboardEvent, ReactNode } from "react";
interface ThreatEntity {
  id?: string;
  address?: string;
  wallet?: string;
  chain?: string;
  risk_score?: number;
  riskScore?: number;
  severity?: string;
  type?: string;
}
interface IntelligenceEvent {
  id?: string;
  source?: string;
  title?: string;
  content?: string;
  risk_score?: number;
  riskScore?: number;
  created_at?: string;
  timestamp?: string;
}
interface DashboardData {
  highRiskEntities?: number;
  trackedWallets?: number;
  osintCorrelations?: number;
  activeInvestigations?: number;
  alerts?: ThreatEntity[];
  events?: IntelligenceEvent[];
}
const INITIAL_DATA: DashboardData = {
  highRiskEntities: 1,
  trackedWallets: 43,
  osintCorrelations: 16,
  activeInvestigations: 0,
  alerts: [],
  events: [],
};
export default function CommandCenter() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  /* ============================================================
     LOAD DASHBOARD
  ============================================================ */
  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    }
    try {
      const response = await api.get("/dashboard");
      if (response?.data) {
        setData((previous) => ({
          ...previous,
          ...response.data,
          alerts: Array.isArray(response.data.alerts)
            ? response.data.alerts
            : previous.alerts,
          events: Array.isArray(response.data.events)
            ? response.data.events
            : previous.events,
        }));
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed loading dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => {
      loadDashboard();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadDashboard]);
  const alerts = data.alerts || [];
  const events = data.events || [];
  /* ============================================================
     DERIVED VALUES
  ============================================================ */
  const highRiskCount = data.highRiskEntities ?? 0;
  const trackedWalletCount = data.trackedWallets ?? 0;
  const correlationCount = data.osintCorrelations ?? 0;
  const investigationCount = data.activeInvestigations ?? 0;
  const visibleAlerts = useMemo(() => {
    return alerts
      .slice()
      .sort((a, b) => {
        const scoreA = a.risk_score ?? a.riskScore ?? 0;
        const scoreB = b.risk_score ?? b.riskScore ?? 0;
        return scoreB - scoreA;
      })
      .slice(0, 6);
  }, [alerts]);
  /* ============================================================
     NAVIGATION
  ============================================================ */
  const handleViewWallet = (address: string) => {
    if (!address || address === "Unknown entity") {
      router.push("/wallet");
      return;
    }
    router.push(`/wallet?address=${encodeURIComponent(address)}`);
  };
  const handleViewAlerts = () => {
    router.push("/wallet");
  };
  const handleViewIntelligence = () => {
    router.push("/osint");
  };
  const handleStartInvestigation = () => {
    router.push("/investigation");
  };
  const handleIngestEvidence = () => {
    router.push("/upload");
  };
  return (
    <main className="relative min-h-full overflow-hidden bg-[#05070b] pb-10">
      {/* ============================================================
          AMBIENT COMMAND CENTER
      ============================================================ */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[650px] overflow-hidden">
        <div className="absolute left-[34%] top-[-250px] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-cyan-500/[0.025] blur-[160px]" />
        <div className="absolute right-[-220px] top-[40px] h-[420px] w-[420px] rounded-full bg-violet-500/[0.018] blur-[150px]" />
        <div className="absolute left-[-220px] top-[360px] h-[360px] w-[360px] rounded-full bg-red-500/[0.012] blur-[140px]" />
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
      </div>
      {/* ============================================================
          COMMAND HEADER
      ============================================================ */}
      <section className="relative">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] px-5 py-5 backdrop-blur-xl lg:px-6">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />
          <span className="pointer-events-none absolute left-0 top-0 h-8 w-8 border-l border-t border-cyan-400/20" />
          <span className="pointer-events-none absolute bottom-0 right-0 h-8 w-8 border-b border-r border-cyan-400/10" />
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Crypto OSINT • Forensic Intelligence
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Gatekeeper Overview
                </h1>
                <span className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.04] px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                  Operational
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-slate-400">
                Monitor collected intelligence, investigate wallet activity, and
                correlate entities across evidence and external sources.
              </p>
            </div>
            {/* Header actions */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                className="group flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 transition-all hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={13}
                  strokeWidth={1.7}
                  className={refreshing ? "animate-spin" : ""}
                />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={handleIngestEvidence}
                className="group flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] px-3.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-300 transition-all duration-200 hover:border-cyan-400/50 hover:bg-cyan-400/[0.12] hover:text-cyan-200"
              >
                <FolderOpen size={14} strokeWidth={1.7} />
                <span>Ingest Evidence</span>
                <ArrowUpRight
                  size={11}
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </div>
        </div>
      </section>
      {/* ============================================================
          SYSTEM STATUS STRIP
      ============================================================ */}
      <section className="relative mt-3">
        <div className="ml-auto flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden font-mono text-[8px] uppercase tracking-[0.1em] text-slate-600 md:block">
              UPDATED {formatTime(lastUpdated)}
            </span>
          )}
        </div>
      </section>
      {/* ============================================================
          THREAT OVERVIEW
      ============================================================ */}
      <section className="relative mt-7">
        <SectionHeader
          eyebrow="CURRENT INTELLIGENCE"
          title="Threat overview"
          description="Current entities, investigations and intelligence signals requiring analyst attention."
          tone="cyan"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IntelligenceMetric
            code="RISK  01"
            title="High-risk entities"
            value={String(highRiskCount)}
            description="Entities requiring analyst attention"
            icon={ShieldAlert}
            tone="red"
          />
          <IntelligenceMetric
            code="WALLET  02"
            title="Tracked wallets"
            value={String(trackedWalletCount)}
            description="Blockchain entities under monitoring"
            icon={Wallet}
            tone="cyan"
          />
          <IntelligenceMetric
            code="OSINT  03"
            title="OSINT correlations"
            value={String(correlationCount)}
            description="External intelligence matches"
            icon={FileSearch}
            tone="violet"
          />
          <IntelligenceMetric
            code="CASE  04"
            title="Active investigations"
            value={String(investigationCount)}
            description="Cases currently under analysis"
            icon={GitBranch}
            tone="emerald"
          />
        </div>
      </section>
      {/* ============================================================
          PRIORITY QUEUE
      ============================================================ */}
      <section className="relative mt-7">
        <div className="mb-3 flex items-end justify-between gap-4">
          <SectionHeader
            eyebrow="PRIORITY QUEUE"
            title="Wallets requiring investigation"
            description="Highest-risk blockchain entities identified by current intelligence and enrichment sources."
            tone="red"
          />
          <div className="hidden shrink-0 items-center gap-2 pb-1 sm:flex">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400">
              {String(alerts.length || 4).padStart(2, "0")} ACTIVE ALERTS
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.6)]" />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/25 to-transparent" />
          <div className="hidden border-b border-white/[0.06] bg-white/[0.012] px-5 py-3 lg:grid lg:grid-cols-[50px_1.5fr_1fr_120px_90px] lg:items-center lg:gap-4">
            <TableLabel>#</TableLabel>
            <TableLabel>Blockchain entity</TableLabel>
            <TableLabel>Classification</TableLabel>
            <TableLabel>Risk score</TableLabel>
            <TableLabel>Action</TableLabel>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {visibleAlerts.length > 0 ? (
              visibleAlerts.map((alert, index) => (
                <PriorityRow
                  key={alert.id || `${alert.address}-${index}`}
                  alert={alert}
                  index={index}
                  onView={handleViewWallet}
                />
              ))
            ) : (
              <DemoPriorityRows onView={handleViewWallet} />
            )}
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.012] px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-red-400" />
              <span className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-slate-500">
                Risk-ranked intelligence queue
              </span>
            </div>
            <button
              type="button"
              onClick={handleViewAlerts}
              className="group flex items-center gap-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-cyan-400 transition-colors hover:text-cyan-300"
            >
              View all alerts
              <ArrowUpRight
                size={10}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </div>
      </section>
      {/* ============================================================
          LOWER INTELLIGENCE PANELS
      ============================================================ */}
      <section className="mt-7 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        {/* ==========================================================
            RECENT INTELLIGENCE
        ========================================================== */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
          <div className="border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Radio
                    size={13}
                    strokeWidth={1.7}
                    className="text-cyan-400"
                  />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                    RECENT INTELLIGENCE
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  Collection activity
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Latest intelligence collected across monitored sources.
                </p>
              </div>
              <span className="font-mono text-[8px] text-slate-500">
                {String(events.length || 4).padStart(2, "0")} EVENTS
              </span>
            </div>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {events.length > 0 ? (
              events
                .slice(0, 4)
                .map((event, index) => (
                  <IntelligenceEventRow
                    key={event.id || index}
                    event={event}
                    onClick={handleViewIntelligence}
                  />
                ))
            ) : (
              <DemoEvents onClick={handleViewIntelligence} />
            )}
          </div>
          <div className="border-t border-white/[0.06] px-5 py-3">
            <button
              type="button"
              onClick={handleViewIntelligence}
              className="group flex items-center gap-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-cyan-400 transition-colors hover:text-cyan-300"
            >
              View intelligence stream
              <ArrowUpRight
                size={10}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </div>
        {/* ==========================================================
            INVESTIGATIONS
        ========================================================== */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent" />
          <div className="border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <GitBranch
                    size={13}
                    strokeWidth={1.7}
                    className="text-violet-400"
                  />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300">
                    INVESTIGATIONS
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  Recent cases
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Active investigations and evidence trails.
                </p>
              </div>
              <span className="font-mono text-[8px] text-slate-500">
                {String(investigationCount).padStart(2, "0")} ACTIVE
              </span>
            </div>
          </div>
          {investigationCount === 0 ? (
            <div className="flex min-h-[235px] flex-col items-center justify-center px-6 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-xl bg-violet-400/[0.05] blur-xl" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-500">
                  <GitBranch size={18} strokeWidth={1.5} />
                </div>
              </div>
              <h4 className="text-sm font-medium text-slate-200">
                No active investigations
              </h4>
              <p className="mt-1.5 max-w-[280px] text-[10px] leading-relaxed text-slate-500">
                Start an investigation from a flagged wallet, evidence artifact,
                or OSINT correlation.
              </p>
              <button
                type="button"
                onClick={handleStartInvestigation}
                className="mt-5 flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-3 py-2 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-violet-300 transition-all hover:border-violet-400/40 hover:bg-violet-400/[0.1] hover:text-violet-200"
              >
                <GitBranch size={12} />
                Start investigation
                <ArrowUpRight size={10} />
              </button>
            </div>
          ) : (
            <div className="p-4">
              <button
                type="button"
                onClick={handleStartInvestigation}
                className="group w-full rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4 text-left transition-all hover:border-violet-400/20 hover:bg-violet-400/[0.025]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-[8px] text-violet-400">
                      ACTIVE CASE
                    </span>
                    <h4 className="mt-2 text-sm font-medium text-slate-100">
                      Current intelligence investigation
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">
                      Evidence and entities currently under analysis.
                    </p>
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="text-slate-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-400"
                  />
                </div>
              </button>
            </div>
          )}
        </div>
      </section>
      {/* ============================================================
          OPERATIONAL FOOTER
      ============================================================ */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <ShieldCheck
            size={11}
            strokeWidth={1.7}
            className="text-emerald-400"
          />
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-slate-500">
            Secure local intelligence environment
          </span>
        </div>
        <div className="flex items-center gap-3" />
      </div>
      {/* ============================================================
          INITIAL LOADING
      ============================================================ */}
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute right-5 top-5 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#05070b]/85 px-2.5 py-1.5 backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-slate-400">
              Synchronizing
            </span>
          </div>
        </div>
      )}
    </main>
  );
}
/* ================================================================
   TELEMETRY ITEM
================================================================ */
function TelemetryItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "cyan" | "violet";
}) {
  const styles = {
    emerald: "bg-emerald-400 text-emerald-300",
    cyan: "bg-cyan-400 text-cyan-300",
    violet: "bg-violet-400 text-violet-300",
  }[tone];
  const [dot, text] = styles.split(" ");
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-1.5 w-1.5 rounded-full ${dot} shadow-[0_0_8px_currentColor]`}
      />
      <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-slate-600">
        {label}
      </span>
      <span
        className={`font-mono text-[8px] font-semibold uppercase tracking-[0.08em] ${text}`}
      >
        {value}
      </span>
    </div>
  );
}
/* ================================================================
   SYSTEM STATE
================================================================ */
function SystemState({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "cyan" | "violet";
}) {
  const toneClass = {
    emerald: "bg-emerald-400 text-emerald-300",
    cyan: "bg-cyan-400 text-cyan-300",
    violet: "bg-violet-400 text-violet-300",
  }[tone];
  const [dot, text] = toneClass.split(" ");
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`h-1.5 w-1.5 rounded-full ${dot} shadow-[0_0_8px_currentColor]`}
      />
      <span className="font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-slate-500">
        {label}
      </span>
      <span
        className={`font-mono text-[9px] font-semibold uppercase tracking-[0.08em] ${text}`}
      >
        {value}
      </span>
    </div>
  );
}
/* ================================================================
   SECTION HEADER
================================================================ */
function SectionHeader({
  eyebrow,
  title,
  description,
  tone,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone: "cyan" | "red" | "violet" | "emerald";
}) {
  const toneClass = {
    cyan: "bg-cyan-400 text-cyan-300",
    red: "bg-red-400 text-red-300",
    violet: "bg-violet-400 text-violet-300",
    emerald: "bg-emerald-400 text-emerald-300",
  }[tone];
  const [line, text] = toneClass.split(" ");
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5">
        <span className={`h-px w-5 ${line} opacity-70`} />
        <span
          className={`font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${text}`}
        >
          {eyebrow}
        </span>
      </div>
      <h2 className="mt-2.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {title}
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  );
}
/* ================================================================
   INTELLIGENCE METRIC
================================================================ */
function IntelligenceMetric({
  code,
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  code: string;
  title: string;
  value: string;
  description: string;
  icon: ElementType;
  tone: "red" | "cyan" | "violet" | "emerald";
}) {
  const styles = {
    red: {
      border: "border-red-400/20",
      icon: "border-red-400/25 bg-red-400/[0.07] text-red-300",
      accent: "bg-red-400",
      glow: "bg-red-400/[0.04]",
    },
    cyan: {
      border: "border-cyan-400/20",
      icon: "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300",
      accent: "bg-cyan-400",
      glow: "bg-cyan-400/[0.035]",
    },
    violet: {
      border: "border-violet-400/20",
      icon: "border-violet-400/20 bg-violet-400/[0.06] text-violet-300",
      accent: "bg-violet-400",
      glow: "bg-violet-400/[0.035]",
    },
    emerald: {
      border: "border-emerald-400/20",
      icon: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300",
      accent: "bg-emerald-400",
      glow: "bg-emerald-400/[0.035]",
    },
  }[tone];
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border ${styles.border} bg-white/[0.03] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.05]`}
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full ${styles.glow} blur-3xl`}
      />
      <span
        className={`absolute left-0 right-0 top-0 h-px ${styles.accent} opacity-40 transition-opacity group-hover:opacity-90`}
      />
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${styles.icon}`}
        >
          <Icon size={18} strokeWidth={1.7} />
        </div>
        <span className="font-mono text-[9px] font-medium tracking-[0.1em] text-slate-600">
          {code}
        </span>
      </div>
      <div className="relative mt-6 text-4xl font-semibold leading-none tracking-tight text-white">
        {value}
      </div>
      <div className="mt-2.5 text-sm font-semibold text-slate-200">{title}</div>
      <div className="mt-1.5 text-xs leading-relaxed text-slate-500">
        {description}
      </div>
    </article>
  );
}
/* ================================================================
   PRIORITY ROW
================================================================ */
function PriorityRow({
  alert,
  index,
  onView,
}: {
  alert: ThreatEntity;
  index: number;
  onView: (address: string) => void;
}) {
  const address = alert.address || alert.wallet || "Unknown entity";
  const chain = alert.chain || alert.type || "UNKNOWN";
  const score = Math.max(
    0,
    Math.min(100, alert.risk_score ?? alert.riskScore ?? 0),
  );
  const severity =
    alert.severity || (score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW");
  const normalizedSeverity = severity.toUpperCase();
  const severityClass =
    normalizedSeverity === "HIGH"
      ? "border-red-400/20 bg-red-400/[0.06] text-red-400"
      : normalizedSeverity === "MEDIUM"
        ? "border-amber-400/20 bg-amber-400/[0.05] text-amber-400"
        : "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-400";
  const progressClass =
    normalizedSeverity === "HIGH"
      ? "bg-red-400"
      : normalizedSeverity === "MEDIUM"
        ? "bg-amber-400"
        : "bg-emerald-400";
  return (
    <div className="group relative px-5 py-4 transition-colors hover:bg-white/[0.025]">
      <span className="absolute bottom-0 left-0 top-0 w-px bg-transparent transition-colors group-hover:bg-red-400" />
      {/* Desktop */}
      <div className="hidden lg:grid lg:grid-cols-[50px_1.5fr_1fr_120px_90px] lg:items-center lg:gap-4">
        <span className="font-mono text-[10px] font-medium text-slate-600">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-slate-600">
              {chain}
            </span>
            <span
              className={`rounded-md border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] ${severityClass}`}
            >
              {severity}
            </span>
          </div>
          <p
            className="mt-1 truncate font-mono text-[10px] text-slate-200"
            title={address}
          >
            {address}
          </p>
        </div>
        <div>
          <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-slate-600">
            WALLET INTELLIGENCE
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-slate-200">
              {score}
            </span>
            <span className="font-mono text-[8px] text-slate-700">/ 100</span>
          </div>
          <div className="mt-1.5 h-1 w-20 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className={`h-full rounded-full ${progressClass}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onView(address)}
          className="group/view flex items-center gap-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-cyan-400 transition-colors hover:text-cyan-300"
        >
          View
          <ArrowUpRight
            size={10}
            className="transition-transform group-hover/view:-translate-y-0.5 group-hover/view:translate-x-0.5"
          />
        </button>
      </div>
      {/* Mobile */}
      <div className="flex items-start gap-3 lg:hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] font-mono text-[8px] text-slate-600">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[8px] uppercase text-slate-600">
              {chain}
            </span>
            <span
              className={`rounded-md border px-1.5 py-0.5 font-mono text-[8px] uppercase ${severityClass}`}
            >
              {severity}
            </span>
          </div>
          <p
            className="mt-1 truncate font-mono text-[9px] text-slate-200"
            title={address}
          >
            {address}
          </p>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] text-slate-600">RISK</span>
              <span className="font-mono text-[9px] text-slate-200">
                {score}/100
              </span>
              <div className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className={`h-full rounded-full ${progressClass}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onView(address)}
              className="font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-cyan-400 transition-colors hover:text-cyan-300"
            >
              View →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ================================================================
   DEMO PRIORITY DATA
================================================================ */
function DemoPriorityRows({ onView }: { onView: (address: string) => void }) {
  const rows: ThreatEntity[] = [
    {
      id: "demo-1",
      chain: "Ethereum",
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      risk_score: 70,
      severity: "HIGH",
    },
    {
      id: "demo-2",
      chain: "Bitcoin",
      address: "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
      risk_score: 50,
      severity: "MEDIUM",
    },
    {
      id: "demo-3",
      chain: "Ethereum",
      address: "0x742d35Cc6634C0532925a3b844Bc45424438f44e",
      risk_score: 50,
      severity: "MEDIUM",
    },
    {
      id: "demo-4",
      chain: "Bitcoin",
      address: "1BoatSLRHtKNngkdXEeobR76bS3LETtpyT",
      risk_score: 45,
      severity: "MEDIUM",
    },
  ];
  return (
    <>
      {rows.map((row, index) => (
        <PriorityRow key={row.id} alert={row} index={index} onView={onView} />
      ))}
    </>
  );
}
/* ================================================================
   INTELLIGENCE EVENT
================================================================ */
function IntelligenceEventRow({
  event,
  onClick,
}: {
  event: IntelligenceEvent;
  onClick?: () => void;
}) {
  const source = event.source || "Unknown source";
  const title = event.title || event.content || "Intelligence event detected";
  const riskScore = event.risk_score ?? event.riskScore;
  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
      keyboardEvent.preventDefault();
      onClick();
    }
  };
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`group flex items-start gap-3 px-5 py-3.5 transition-all hover:bg-white/[0.02] ${
        onClick
          ? "cursor-pointer focus:outline-none focus:ring-1 focus:ring-inset focus:ring-cyan-400/30"
          : ""
      }`}
    >
      <div className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.04] text-cyan-400">
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-70" />
        <Activity size={13} strokeWidth={1.6} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-cyan-400">
            {source}
          </span>
          <span className="h-0.5 w-0.5 rounded-full bg-slate-700" />
          <span className="font-mono text-[8px] text-slate-700">COLLECTED</span>
          {riskScore !== undefined && (
            <>
              <span className="h-0.5 w-0.5 rounded-full bg-slate-700" />
              <span className="font-mono text-[8px] text-red-400">
                RISK {riskScore}
              </span>
            </>
          )}
        </div>
        <p className="mt-1 truncate text-[10px] text-slate-300">{title}</p>
      </div>
      <ArrowUpRight
        size={11}
        className="mt-1 shrink-0 text-slate-700 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-400"
      />
    </div>
  );
}
/* ================================================================
   DEMO EVENTS
================================================================ */
function DemoEvents({ onClick }: { onClick: () => void }) {
  const events: [string, string][] = [
    ["Telegram", "Wallet-related intelligence detected"],
    ["Telegram", "Exchange-related intelligence detected"],
    ["X / Twitter", "Wallet mention collected"],
    ["Telegram", "Transaction-related keyword detected"],
  ];
  return (
    <>
      {events.map(([source, title], index) => (
        <IntelligenceEventRow
          key={index}
          event={{
            id: `demo-event-${index}`,
            source,
            title,
          }}
          onClick={onClick}
        />
      ))}
    </>
  );
}
/* ================================================================
   TABLE LABEL
================================================================ */
function TableLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
      {children}
    </span>
  );
}
/* ================================================================
   TIME FORMATTER
================================================================ */
function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
