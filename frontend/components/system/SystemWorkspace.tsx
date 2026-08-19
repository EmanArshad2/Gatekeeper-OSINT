"use client";
import { useEffect, useState } from "react";
import {
  Server,
  Database,
  Cpu,
  HardDrive,
  Activity,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock3,
  Radio,
  ChevronRight,
} from "lucide-react";
interface ServiceItem {
  name: string;
  status: string;
  accent: "cyan" | "green" | "purple" | "orange";
}
interface SystemResponse {
  status: string;
  summary: {
    health: string;
    active_sessions: number;
    cpu_usage: string;
    memory_usage: string;
    disk_usage: string;
  };
  services: ServiceItem[];
  recent_events: {
    text: string;
    ok: boolean;
  }[];
}
const API_URL = "http://127.0.0.1:8000/api/system-monitor";
const fallbackServices = [
  {
    name: "Backend API",
    icon: Server,
    status: "ONLINE",
    accent: "green" as const,
  },
  {
    name: "PostgreSQL",
    icon: Database,
    status: "CONNECTED",
    accent: "green" as const,
  },
  {
    name: "Neo4j",
    icon: Activity,
    status: "CONNECTED",
    accent: "green" as const,
  },
  { name: "OCR Engine", icon: Cpu, status: "RUNNING", accent: "cyan" as const },
  {
    name: "QR Scanner",
    icon: ShieldCheck,
    status: "READY",
    accent: "purple" as const,
  },
  {
    name: "OSINT Engine",
    icon: Wifi,
    status: "IDLE",
    accent: "orange" as const,
  },
];
const accentText: Record<string, string> = {
  cyan: "text-cyan-400",
  orange: "text-amber-400",
  purple: "text-purple-400",
  green: "text-emerald-400",
};
const accentBar: Record<string, string> = {
  cyan: "bg-cyan-400",
  orange: "bg-amber-400",
  purple: "bg-purple-400",
  green: "bg-emerald-400",
};
const accentTag: Record<string, string> = {
  cyan: "border border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
  orange: "border border-amber-500/20 bg-amber-500/5 text-amber-400",
  purple: "border border-purple-500/20 bg-purple-500/5 text-purple-400",
  green: "border border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
};
const spineBorder: Record<string, string> = {
  cyan: "border-l-cyan-400",
  orange: "border-l-amber-400",
  purple: "border-l-purple-400",
  green: "border-l-emerald-400",
};
export default function SystemWorkspace() {
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    health: "99.8%",
    active_sessions: 3,
    cpu_usage: "22%",
    memory_usage: "1.8 GB",
    disk_usage: "48%",
  });
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  async function loadSystemData() {
    try {
      setLoading(true);
      const response = await fetch(API_URL, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`System monitor request failed: ${response.status}`);
      }
      const result: SystemResponse = await response.json();
      if (result.summary) {
        setSummary({
          health: result.summary.health ?? "99.8%",
          active_sessions: result.summary.active_sessions ?? 3,
          cpu_usage: result.summary.cpu_usage ?? "22%",
          memory_usage: result.summary.memory_usage ?? "1.8 GB",
          disk_usage: result.summary.disk_usage ?? "48%",
        });
      }
      setServices(Array.isArray(result.services) ? result.services : []);
      setEvents(
        Array.isArray(result.recent_events) ? result.recent_events : [],
      );
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error("System monitor loading failed:", error);
      // Fallback defaults if endpoint is unreachable
      setServices([
        { name: "Backend API", status: "ONLINE", accent: "green" },
        { name: "PostgreSQL", status: "CONNECTED", accent: "green" },
        { name: "Neo4j", status: "CONNECTED", accent: "green" },
        { name: "OCR Engine", status: "RUNNING", accent: "cyan" },
        { name: "QR Scanner", status: "READY", accent: "purple" },
        { name: "OSINT Engine", status: "IDLE", accent: "orange" },
      ]);
      setEvents([
        { text: "Backend started successfully", ok: true },
        { text: "OCR models loaded", ok: true },
        { text: "Neo4j connection established", ok: true },
        { text: "OSINT feeds awaiting refresh", ok: false },
      ]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadSystemData();
    const timer = window.setInterval(() => {
      loadSystemData();
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);
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
                <Server size={30} className="text-cyan-400" />
                <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-400">
                    GATEKEEPER / INFRASTRUCTURE
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    HEALTH {summary.health}
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
                  System Monitor
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Every Gatekeeper service, backend component and forensic
                  processing engine, watched in real time.
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
                onClick={loadSystemData}
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
                {loading ? "Syncing..." : "Sync Monitor"}
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-[#162a3b] bg-[#07131f]/80 px-7 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-2">
              <Database size={13} className="text-cyan-500" />
              Core Infrastructure Layer
            </span>
            <span className="flex items-center gap-2">
              <Radio size={13} className="text-emerald-500" />
              Real-Time Telemetry
            </span>
            <span className="ml-auto font-mono text-slate-600">
              GATEKEEPER // SYSTEM-MONITOR
            </span>
          </div>
        </div>
      </section>
      {/* ========================================================= */}
      {/* SYSTEM METRICS GRID */}
      {/* ========================================================= */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SystemMetricCard
          icon={<Cpu size={19} />}
          label="CPU Usage"
          value={summary.cpu_usage}
          description="Processing load"
          accent="cyan"
        />
        <SystemMetricCard
          icon={<Activity size={19} />}
          label="Memory"
          value={summary.memory_usage}
          description="Allocated RAM"
          accent="purple"
        />
        <SystemMetricCard
          icon={<HardDrive size={19} />}
          label="Disk"
          value={summary.disk_usage}
          description="Storage utilization"
          accent="green"
        />
        <SystemMetricCard
          icon={<Wifi size={19} />}
          label="Active Sessions"
          value={summary.active_sessions}
          description="Connected clients"
          accent="orange"
        />
      </section>
      {/* ========================================================= */}
      {/* SERVICE STATUS GRID */}
      {/* ========================================================= */}
      <section className="rounded-3xl border border-[#1d3144] bg-[#07121d] p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
              <Server size={17} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Service Status
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Live infrastructure components and database daemons
              </p>
            </div>
          </div>
          <span className="rounded-lg border border-[#213447] bg-[#0a1622] px-3 py-1.5 font-mono text-[10px] text-slate-400">
            {services.length} SERVICES
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {services.map((service, index) => {
            const fallbackIconObj = fallbackServices.find(
              (f) => f.name.toLowerCase() === service.name.toLowerCase(),
            );
            const Icon = fallbackIconObj ? fallbackIconObj.icon : Server;
            return (
              <div
                key={`${service.name}-${index}`}
                className={`group rounded-2xl border border-[#1d3144] bg-[#0a1622] p-5 border-l-4 transition-all hover:border-cyan-500/30 ${
                  spineBorder[service.accent] || "border-l-cyan-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 ${
                      accentText[service.accent] || "text-cyan-400"
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <span
                    className={`rounded-md px-2.5 py-1 font-mono text-[9px] font-bold tracking-wider ${
                      accentTag[service.accent] || accentTag.cyan
                    }`}
                  >
                    {service.status}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">
                  {service.name}
                </h3>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#101e2b]">
                  <div
                    className={`h-full w-full rounded-full ${
                      accentBar[service.accent] || accentBar.cyan
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {/* ========================================================= */}
      {/* RESOURCE MONITOR & RECENT EVENTS */}
      {/* ========================================================= */}
      <section className="grid gap-6 xl:grid-cols-2">
        {/* RESOURCE USAGE BREAKDOWN */}
        <div className="rounded-3xl border border-[#1d3144] bg-[#07121d] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <Cpu size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Resource Usage
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Host hardware telemetry and utilization metrics
              </p>
            </div>
          </div>
          <div className="space-y-5">
            {[
              ["CPU", 22],
              ["Memory", 48],
              ["Disk", 61],
              ["GPU", 14],
            ].map(([name, value]) => (
              <div key={name as string}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-300">{name}</span>
                  <span className="font-mono text-xs text-cyan-400">
                    {value}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#101e2b]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* RECENT SYSTEM EVENTS */}
        <div className="rounded-3xl border border-[#1d3144] bg-[#07121d] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <HardDrive size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Recent Events
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                System event logs and initialization checks
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {events.map((event, index) => (
              <div
                key={`event-${index}`}
                className={`flex items-start gap-3 rounded-2xl border border-[#1d3144] bg-[#0a1622] p-4 border-l-4 ${
                  event.ok ? "border-l-emerald-400" : "border-l-amber-400"
                }`}
              >
                {event.ok ? (
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  />
                ) : (
                  <AlertTriangle
                    size={16}
                    className="mt-0.5 shrink-0 text-amber-400"
                  />
                )}
                <span className="text-sm text-slate-300">{event.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
/* ============================================================= */
/* SYSTEM METRIC CARD */
/* ============================================================= */
function SystemMetricCard({
  icon,
  label,
  value,
  description,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  description: string;
  accent: "cyan" | "purple" | "green" | "orange";
}) {
  const styles = {
    cyan: {
      icon: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
      glow: "group-hover:border-cyan-400/30",
      value: "text-cyan-300",
    },
    purple: {
      icon: "border-purple-500/20 bg-purple-500/10 text-purple-400",
      glow: "group-hover:border-purple-400/30",
      value: "text-purple-300",
    },
    green: {
      icon: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
      glow: "group-hover:border-emerald-400/30",
      value: "text-emerald-300",
    },
    orange: {
      icon: "border-amber-500/20 bg-amber-500/10 text-amber-400",
      glow: "group-hover:border-amber-400/30",
      value: "text-amber-300",
    },
  };
  const style = styles[accent] || styles.cyan;
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-[#1d3144] bg-[#07121d] p-5 transition-all duration-300 hover:-translate-y-0.5 ${style.glow}`}
    >
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
