"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Globe,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Radio,
  Radar,
  Database,
  ChevronRight,
  Zap,
} from "lucide-react";
interface ThreatFeed {
  source: string;
  severity: string;
  title: string;
  description: string;
  time: string;
}
interface ThreatResponse {
  status: string;
  summary: {
    active_threats: number;
    high_severity: number;
    osint_sources: number;
    live_events: number;
  };
  feed: ThreatFeed[];
}
const API_URL = "http://127.0.0.1:8000/api/threat-intelligence";
export default function ThreatIntelligenceWorkspace() {
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    active_threats: 0,
    high_severity: 0,
    osint_sources: 0,
    live_events: 0,
  });
  const [feed, setFeed] = useState<ThreatFeed[]>([]);
  async function loadThreats() {
    try {
      setLoading(true);
      const response = await fetch(API_URL, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          `Threat intelligence request failed: ${response.status}`,
        );
      }
      const result: ThreatResponse = await response.json();
      setSummary({
        active_threats: result.summary?.active_threats ?? 0,
        high_severity: result.summary?.high_severity ?? 0,
        osint_sources: result.summary?.osint_sources ?? 0,
        live_events: result.summary?.live_events ?? 0,
      });
      setFeed(Array.isArray(result.feed) ? result.feed : []);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error("Threat intelligence loading failed:", error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadThreats();
    const timer = window.setInterval(() => {
      loadThreats();
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);
  const severityStats = useMemo(() => {
    return {
      high: feed.filter((item) => item.severity?.toUpperCase() === "HIGH")
        .length,
      medium: feed.filter((item) => item.severity?.toUpperCase() === "MEDIUM")
        .length,
      low: feed.filter((item) => item.severity?.toUpperCase() === "LOW").length,
    };
  }, [feed]);
  return (
    <div className="space-y-6 pb-10">
      {/* ========================================================= */}
      {/* COMMAND HEADER */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#06101a]">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-blue-500/5 blur-[100px]" />
        <div className="relative p-7 lg:p-8">
          <div className="flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-5">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10">
                <Radar size={30} className="text-cyan-400" />
                <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-400">
                    GATEKEEPER / THREAT INTELLIGENCE
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    LIVE
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
                  Threat Intelligence Center
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Centralized monitoring of OSINT alerts, cyber threats,
                  blockchain indicators and live intelligence events.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-xl border border-[#203346] bg-[#0a1622] px-4 py-3 lg:block">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
                  <Clock3 size={13} />
                  Polling
                </div>
                <p className="mt-1 font-mono text-sm text-cyan-400">10 SEC</p>
              </div>
              <button
                type="button"
                onClick={loadThreats}
                disabled={loading}
                className="group flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-300 transition-all hover:border-cyan-300/50 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={
                    loading
                      ? "animate-spin"
                      : "transition-transform group-hover:rotate-180"
                  }
                />
                {loading ? "Syncing..." : "Sync Intelligence"}
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-[#162a3b] bg-[#07131f]/80 px-7 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-2">
              <Database size={13} className="text-cyan-500" />
              Intelligence Feed Layer
            </span>
            <span className="flex items-center gap-2">
              <Radio size={13} className="text-emerald-500" />
              Live Monitoring
            </span>
            <span className="flex items-center gap-2">
              <Zap size={13} className="text-amber-400" />
              Automated Severity Profiling
            </span>
            <span className="ml-auto font-mono text-slate-600">
              GATEKEEPER // THREAT-INTEL
            </span>
          </div>
        </div>
      </section>
      {/* ========================================================= */}
      {/* THREAT METRICS */}
      {/* ========================================================= */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <IntelMetric
          icon={<AlertTriangle size={19} />}
          label="Active Threats"
          value={summary.active_threats}
          description="Currently detected"
          accent="cyan"
        />
        <IntelMetric
          icon={<ShieldAlert size={19} />}
          label="High Severity"
          value={summary.high_severity}
          description="Requires attention"
          accent="red"
          alert={summary.high_severity > 0}
        />
        <IntelMetric
          icon={<Globe size={19} />}
          label="OSINT Sources"
          value={summary.osint_sources}
          description="Intelligence sources"
          accent="blue"
        />
        <IntelMetric
          icon={<Activity size={19} />}
          label="Live Events"
          value={summary.live_events}
          description="Incoming signals"
          accent="emerald"
        />
      </section>
      {/* ========================================================= */}
      {/* COLLECTION OVERVIEW / SEVERITY PROFILE */}
      {/* ========================================================= */}
      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-[#1d3144] bg-[#07121d] p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">
                  Threat Distribution Profile
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Current severity profile across active intelligence feeds
              </p>
            </div>
            <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] text-cyan-400">
              LIVE
            </span>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <OverviewItem
              label="High Severity"
              value={severityStats.high}
              icon={<ShieldAlert size={16} className="text-red-400" />}
            />
            <OverviewItem
              label="Medium Severity"
              value={severityStats.medium}
              icon={<AlertTriangle size={16} className="text-amber-400" />}
            />
            <OverviewItem
              label="Low Severity"
              value={severityStats.low}
              icon={<ShieldCheck size={16} className="text-emerald-400" />}
            />
          </div>
          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">Threat intelligence load</span>
              <span className="font-mono text-cyan-400">
                {feed.length} EVENTS
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#101e2b]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 transition-all duration-700"
                style={{
                  width: `${Math.min(Math.max(feed.length * 5, 5), 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
        {/* SOURCE STATUS */}
        <div className="rounded-3xl border border-[#1d3144] bg-[#07121d] p-6">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Feed Status</h2>
          </div>
          <div className="mt-5 space-y-3">
            <SourceStatus
              name="Active Threats"
              active={summary.active_threats > 0}
              value={summary.active_threats}
            />
            <SourceStatus
              name="High Severity Alerts"
              active={summary.high_severity > 0}
              value={summary.high_severity}
            />
            <SourceStatus
              name="OSINT Sources"
              active={summary.osint_sources > 0}
              value={summary.osint_sources}
            />
          </div>
        </div>
      </section>
      {/* ========================================================= */}
      {/* LIVE THREAT FEED */}
      {/* ========================================================= */}
      <section className="rounded-3xl border border-[#1d3144] bg-[#07121d] p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                <Radio size={17} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Live Threat Feed
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Real-time security alerts and intelligence stream events
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-[#213447] bg-[#0a1622] px-3 py-1.5 font-mono text-[10px] text-slate-400">
              {feed.length} EVENTS
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              STREAM ACTIVE
            </span>
          </div>
        </div>
        {feed.length === 0 ? (
          <EmptyThreatState />
        ) : (
          <div className="divide-y divide-[#1d3144]">
            {feed.map((item, index) => (
              <ThreatEventRow
                key={`${item.source}-${item.time}-${index}`}
                item={item}
                index={index}
              />
            ))}
          </div>
        )}
        {lastUpdated && (
          <div className="mt-6 flex items-center justify-between border-t border-[#1d3144] pt-4 font-mono text-[10px] text-slate-500">
            <span>POLLING INTERVAL: 10s</span>
            <span>LAST SYNCED: {lastUpdated}</span>
          </div>
        )}
      </section>
    </div>
  );
}
/* ============================================================= */
/* THREAT EVENT ROW */
/* ============================================================= */
function ThreatEventRow({ item, index }: { item: ThreatFeed; index: number }) {
  const severity = getSeverityConfig(item.severity);
  return (
    <div className="group py-4 transition-colors hover:bg-[#0a1622]/50 px-2 rounded-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div
            className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${severity.iconBorder} ${severity.iconBg}`}
          >
            <ShieldAlert size={16} className={severity.icon} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                {item.source || "UNKNOWN SOURCE"}
              </span>
              <span
                className={`rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider ${severity.badge}`}
              >
                {item.severity?.toUpperCase() || "UNKNOWN"}
              </span>
              <span className="font-mono text-[10px] text-slate-600">
                #{String(index + 1).padStart(3, "0")}
              </span>
            </div>
            <h3 className="mt-1.5 text-sm font-semibold text-white">
              {item.title || "Untitled intelligence event"}
            </h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
              {item.description || "No description available."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] text-slate-500 sm:self-center">
          <Clock3 size={12} />
          {formatThreatTime(item.time)}
        </div>
      </div>
    </div>
  );
}
/* ============================================================= */
/* INTELLIGENCE METRIC */
/* ============================================================= */
function IntelMetric({
  icon,
  label,
  value,
  description,
  accent,
  alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  description: string;
  accent: "cyan" | "blue" | "red" | "emerald";
  alert?: boolean;
}) {
  const styles = {
    cyan: {
      icon: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
      glow: "group-hover:border-cyan-400/30",
      value: "text-cyan-300",
    },
    blue: {
      icon: "border-blue-500/20 bg-blue-500/10 text-blue-400",
      glow: "group-hover:border-blue-400/30",
      value: "text-blue-300",
    },
    red: {
      icon: "border-red-500/20 bg-red-500/10 text-red-400",
      glow: "group-hover:border-red-400/30",
      value: "text-red-300",
    },
    emerald: {
      icon: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
      glow: "group-hover:border-emerald-400/30",
      value: "text-emerald-300",
    },
  };
  const style = styles[accent];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-[#1d3144] bg-[#07121d] p-5 transition-all duration-300 hover:-translate-y-0.5 ${style.glow}`}
    >
      {alert && (
        <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-red-500/10 blur-2xl" />
      )}
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${style.icon}`}
        >
          {icon}
        </div>
        <ChevronRight
          size={16}
          className="text-slate-700 transition-transform group-hover:translate-x-1 group-hover:text-slate-500"
        />
      </div>
      <div className="relative mt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${style.value}`}>{value}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-600">{description}</p>
      </div>
    </div>
  );
}
/* ============================================================= */
/* OVERVIEW ITEM */
/* ============================================================= */
function OverviewItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#1d3144] bg-[#0a1622] p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-white">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
/* ============================================================= */
/* SOURCE STATUS */
/* ============================================================= */
function SourceStatus({
  name,
  active,
  value,
}: {
  name: string;
  active: boolean;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#1d3144] bg-[#0a1622] px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 rounded-full ${
            active ? "animate-pulse bg-emerald-400" : "bg-slate-600"
          }`}
        />
        <span className="text-sm text-slate-300">{name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-slate-500">{value}</span>
        <span
          className={`text-[10px] font-bold uppercase ${
            active ? "text-emerald-400" : "text-slate-600"
          }`}
        >
          {active ? "ACTIVE" : "IDLE"}
        </span>
      </div>
    </div>
  );
}
/* ============================================================= */
/* EMPTY STATE */
/* ============================================================= */
function EmptyThreatState() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1d3144] bg-[#0a1622] text-slate-500">
        <ShieldCheck size={22} />
      </div>
      <div className="mt-3 font-mono text-[10px] font-bold tracking-[0.16em] text-slate-400">
        INTELLIGENCE STREAM CLEAR
      </div>
      <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
        No active threat events are currently available from the configured
        intelligence sources.
      </p>
    </div>
  );
}
/* ============================================================= */
/* HELPERS */
/* ============================================================= */
function getSeverityConfig(level: string) {
  const normalized = level?.toUpperCase();
  if (normalized === "HIGH") {
    return {
      badge: "border-red-500/30 bg-red-500/10 text-red-400",
      icon: "text-red-400",
      iconBorder: "border-red-500/20",
      iconBg: "bg-red-500/10",
    };
  }
  if (normalized === "MEDIUM") {
    return {
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      icon: "text-amber-400",
      iconBorder: "border-amber-500/20",
      iconBg: "bg-amber-500/10",
    };
  }
  return {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    icon: "text-emerald-400",
    iconBorder: "border-emerald-500/20",
    iconBg: "bg-emerald-500/10",
  };
}
function formatThreatTime(time: string) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) {
    return time || "UNKNOWN";
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
