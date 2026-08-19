"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Check,
  CheckCircle2,
  Database,
  Eye,
  Globe,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Terminal,
  X,
  Zap,
} from "lucide-react";
type SettingsState = {
  desktop_notifications: boolean;
  threat_notifications: boolean;
  auto_refresh: boolean;
};
type ConnectionState = "idle" | "checking" | "success" | "error";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";
const DEFAULT_SETTINGS: SettingsState = {
  desktop_notifications: true,
  threat_notifications: true,
  auto_refresh: true,
};
export default function SettingsWorkspace() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] =
    useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionState>("idle");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const hasChanges = useMemo(() => {
    return (
      settings.desktop_notifications !==
        originalSettings.desktop_notifications ||
      settings.threat_notifications !== originalSettings.threat_notifications ||
      settings.auto_refresh !== originalSettings.auto_refresh
    );
  }, [settings, originalSettings]);
  useEffect(() => {
    loadSettings();
  }, []);
  async function loadSettings() {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/settings`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Failed to load settings (${response.status})`);
      }
      const data = await response.json();
      if (data?.status !== "SUCCESS") {
        throw new Error("Backend returned an unsuccessful response.");
      }
      const serverSettings: SettingsState = {
        desktop_notifications:
          typeof data.settings?.desktop_notifications === "boolean"
            ? data.settings.desktop_notifications
            : DEFAULT_SETTINGS.desktop_notifications,
        threat_notifications:
          typeof data.settings?.threat_notifications === "boolean"
            ? data.settings.threat_notifications
            : DEFAULT_SETTINGS.threat_notifications,
        auto_refresh:
          typeof data.settings?.auto_refresh === "boolean"
            ? data.settings.auto_refresh
            : DEFAULT_SETTINGS.auto_refresh,
      };
      setSettings(serverSettings);
      setOriginalSettings(serverSettings);
    } catch (error) {
      console.error("Settings load error:", error);
      showToast(
        "error",
        "Unable to load configuration from the Gatekeeper API.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function saveSettings() {
    if (saving || !hasChanges) return;
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        throw new Error(`Failed to save settings (${response.status})`);
      }
      const data = await response.json();
      if (data?.status !== "SUCCESS") {
        throw new Error("Backend rejected the configuration.");
      }
      const savedSettings: SettingsState = {
        desktop_notifications:
          typeof data.settings?.desktop_notifications === "boolean"
            ? data.settings.desktop_notifications
            : settings.desktop_notifications,
        threat_notifications:
          typeof data.settings?.threat_notifications === "boolean"
            ? data.settings.threat_notifications
            : settings.threat_notifications,
        auto_refresh:
          typeof data.settings?.auto_refresh === "boolean"
            ? data.settings.auto_refresh
            : settings.auto_refresh,
      };
      setSettings(savedSettings);
      setOriginalSettings(savedSettings);
      showToast("success", "Configuration synchronized successfully.");
    } catch (error) {
      console.error("Settings save error:", error);
      showToast(
        "error",
        "Configuration could not be saved. Check the API connection.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function testDatabase() {
    if (connectionStatus === "checking") return;
    try {
      setConnectionStatus("checking");
      const response = await fetch(`${API_URL}/api/settings/test-db`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || data?.status !== "SUCCESS") {
        throw new Error(
          data?.message || "Database connection verification failed.",
        );
      }
      setConnectionStatus("success");
      showToast("success", data.message || "Database connection healthy.");
    } catch (error) {
      console.error("Database test error:", error);
      setConnectionStatus("error");
      showToast("error", "Database connection verification failed.");
    }
  }
  function discardChanges() {
    setSettings(originalSettings);
    showToast("success", "Local configuration changes discarded.");
  }
  function updateSetting(key: keyof SettingsState, value: boolean) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }
  function showToast(type: "success" | "error", message: string) {
    setToast({
      type,
      message,
    });
    window.setTimeout(() => {
      setToast(null);
    }, 3500);
  }
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070B] text-slate-300">
      {/* =========================================================
          FORENSIC BACKGROUND
      ========================================================= */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[-15%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.025] blur-[140px]" />
        <div className="absolute right-[-10%] top-[20%] h-[550px] w-[550px] rounded-full bg-violet-500/[0.02] blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,211,238,.45) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.45) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      </div>
      {/* =========================================================
          TOAST
      ========================================================= */}
      {toast && (
        <div className="fixed right-5 top-5 z-[100] w-[360px] max-w-[calc(100vw-40px)]">
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-400/20 bg-[#07110E]/95"
                : "border-red-400/20 bg-[#120909]/95"
            }`}
          >
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                toast.type === "success"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "bg-red-400/10 text-red-400"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <X size={16} />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                Gatekeeper telemetry
              </p>
              <p className="mt-1 text-xs font-medium text-slate-200">
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* =========================================================
          CONTENT
      ========================================================= */}
      <div className="relative mx-auto max-w-[1500px] px-4 py-5 pb-32 sm:px-6 lg:px-8 lg:py-7">
        {/* =======================================================
            PAGE HEADER
        ======================================================= */}
        <section className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl">
          <div className="absolute right-0 top-0 h-32 w-32 bg-gradient-to-bl from-cyan-400/[0.07] to-transparent" />
          <div className="relative p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06]">
                  <Settings size={21} className="text-cyan-300" />
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#05070B] bg-emerald-400" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-400">
                      SYSTEM / CONFIGURATION
                    </span>
                    <span className="rounded border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-0.5 font-mono text-[8px] font-semibold tracking-wider text-emerald-400">
                      {loading ? "SYNCING" : "OPERATIONAL"}
                    </span>
                  </div>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white lg:text-3xl">
                    Settings
                  </h1>
                  <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
                    Configure Gatekeeper investigator preferences and verify
                    core infrastructure connectivity.
                  </p>
                </div>
              </div>
              {/* Runtime status */}
              <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-4 py-3">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-slate-600">
                    API RUNTIME
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                    CONNECTED
                  </p>
                </div>
              </div>
            </div>
            {/* Telemetry strip */}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-4">
              <TelemetryItem label="API" value="ONLINE" active />
              <TelemetryItem
                label="SETTINGS"
                value={loading ? "SYNCING" : "READY"}
                active={!loading}
              />
              <TelemetryItem
                label="POSTGRES"
                value={connectionStatus === "success" ? "VERIFIED" : "UNKNOWN"}
                active={connectionStatus === "success"}
              />
              <TelemetryItem
                label="CONFIG"
                value={hasChanges ? "MODIFIED" : "SYNCED"}
                active={!hasChanges}
              />
            </div>
          </div>
        </section>
        {/* =======================================================
            LOADING
        ======================================================= */}
        {loading ? (
          <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.025] p-10">
            <div className="flex items-center justify-center gap-3">
              <Loader2 size={18} className="animate-spin text-cyan-400" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                Synchronizing configuration...
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* ===================================================
                MAIN GRID
            =================================================== */}
            <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              {/* =================================================
                  PREFERENCES
              ================================================= */}
              <section className="rounded-xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl">
                <SectionHeader
                  icon={<Shield size={16} />}
                  code="SEC-01"
                  title="Investigator Preferences"
                  description="Runtime controls affecting alerts and dashboard synchronization."
                />
                <div className="divide-y divide-white/[0.05] px-5">
                  <SettingRow
                    icon={<Bell size={16} />}
                    code="ALERT-01"
                    title="Desktop Notifications"
                    description="Receive investigation and system alerts."
                    enabled={settings.desktop_notifications}
                    onChange={(value) =>
                      updateSetting("desktop_notifications", value)
                    }
                  />
                  <SettingRow
                    icon={<Shield size={16} />}
                    code="ALERT-02"
                    title="Threat Notifications"
                    description="Alert when high-risk intelligence is detected."
                    enabled={settings.threat_notifications}
                    onChange={(value) =>
                      updateSetting("threat_notifications", value)
                    }
                  />
                  <SettingRow
                    icon={<RefreshCw size={16} />}
                    code="SYNC-01"
                    title="Automatic Dashboard Refresh"
                    description="Keep intelligence panels synchronized with backend data."
                    enabled={settings.auto_refresh}
                    onChange={(value) => updateSetting("auto_refresh", value)}
                  />
                </div>
              </section>
              {/* =================================================
                  SYSTEM STATE
              ================================================= */}
              <section className="rounded-xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl">
                <SectionHeader
                  icon={<Activity size={16} />}
                  code="SYS-01"
                  title="System State"
                  description="Current Gatekeeper runtime and infrastructure state."
                />
                <div className="space-y-2.5 p-5">
                  <StatusRow
                    icon={<Database size={16} />}
                    name="PostgreSQL"
                    description="Primary intelligence database"
                    status={
                      connectionStatus === "success" ? "VERIFIED" : "READY"
                    }
                    statusType={
                      connectionStatus === "error" ? "error" : "success"
                    }
                  />
                  <StatusRow
                    icon={<Activity size={16} />}
                    name="Neo4j"
                    description="Forensic relationship graph"
                    status="CONFIGURED"
                    statusType="neutral"
                  />
                  <StatusRow
                    icon={<Terminal size={16} />}
                    name="FastAPI"
                    description="Core intelligence backend"
                    status="ONLINE"
                    statusType="success"
                  />
                  <StatusRow
                    icon={<Zap size={16} />}
                    name="Analysis Pipeline"
                    description="OCR, QR, wallet and scoring engines"
                    status="READY"
                    statusType="success"
                  />
                  <StatusRow
                    icon={<Globe size={16} />}
                    name="OSINT Layer"
                    description="External intelligence integration"
                    status="ACTIVE"
                    statusType="success"
                  />
                </div>
              </section>
            </div>
            {/* ===================================================
                DATABASE VERIFICATION
            =================================================== */}
            <section className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl">
              <SectionHeader
                icon={<Database size={16} />}
                code="INFRA-01"
                title="Infrastructure Verification"
                description="Verify the database connection through the live Gatekeeper API."
              />
              <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/[0.05]">
                    <Database size={18} className="text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-600">
                        DATABASE CONNECTIVITY
                      </span>
                      {connectionStatus === "success" && (
                        <span className="rounded border border-emerald-400/20 bg-emerald-400/[0.06] px-1.5 py-0.5 font-mono text-[7px] text-emerald-400">
                          VERIFIED
                        </span>
                      )}
                      {connectionStatus === "error" && (
                        <span className="rounded border border-red-400/20 bg-red-400/[0.06] px-1.5 py-0.5 font-mono text-[7px] text-red-400">
                          FAILED
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-200">
                      PostgreSQL Intelligence Store
                    </p>
                    <p className="mt-1 text-[10px] text-slate-600">
                      Executes a real connectivity check against
                      <span className="mx-1 font-mono text-slate-500">
                        /api/settings/test-db
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={testDatabase}
                  disabled={connectionStatus === "checking"}
                  className="flex items-center justify-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-5 py-3 font-mono text-[9px] font-semibold tracking-wider text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {connectionStatus === "checking" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  {connectionStatus === "checking"
                    ? "VERIFYING..."
                    : "TEST DATABASE"}
                </button>
              </div>
            </section>
            {/* ===================================================
                SECURITY / PLATFORM
            =================================================== */}
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <InfoCard
                icon={<Lock size={16} />}
                code="SECURITY"
                title="Evidence Integrity"
                value="ENFORCED"
                description="Investigation evidence remains protected during analysis."
              />
              <InfoCard
                icon={<Activity size={16} />}
                code="PIPELINE"
                title="Analysis Engine"
                value="READY"
                description="OCR, QR, wallet detection and scoring pipeline operational."
              />
              <InfoCard
                icon={<Globe size={16} />}
                code="OSINT"
                title="Collection Layer"
                value="ACTIVE"
                description="Current intelligence sources are available to the platform."
              />
            </div>
          </>
        )}
      </div>
      {/* =========================================================
          SAVE BAR
      ========================================================= */}
      {!loading && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-24px)] max-w-3xl -translate-x-1/2">
          <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#080C10]/95 p-3 shadow-2xl shadow-black/70 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  hasChanges
                    ? "bg-cyan-400/[0.08] text-cyan-400"
                    : "bg-emerald-400/[0.08] text-emerald-400"
                }`}
              >
                {hasChanges ? <Activity size={14} /> : <Check size={14} />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-slate-200">
                  {hasChanges
                    ? "Configuration modified"
                    : "Configuration synchronized"}
                </p>
                <p className="mt-0.5 truncate font-mono text-[8px] uppercase tracking-wider text-slate-600">
                  {hasChanges
                    ? "Unsaved local changes detected"
                    : "Runtime configuration matches API state"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={discardChanges}
                disabled={!hasChanges || saving}
                className="flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[9px] font-semibold text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <X size={13} />
                DISCARD
              </button>
              <button
                type="button"
                onClick={saveSettings}
                disabled={!hasChanges || saving}
                className="flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400 px-4 py-2 font-mono text-[9px] font-bold tracking-wider text-[#05070B] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                {saving ? "SAVING..." : "SAVE CONFIG"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/* ================================================================
   SECTION HEADER
================================================================ */
function SectionHeader({
  icon,
  code,
  title,
  description,
}: {
  icon: React.ReactNode;
  code: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-white/[0.06] px-5 py-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] text-cyan-400">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-cyan-500/80">
            {code}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-white">{title}</h2>
          <p className="mt-1 max-w-xl text-[10px] leading-5 text-slate-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
/* ================================================================
   SETTING ROW
================================================================ */
function SettingRow({
  icon,
  code,
  title,
  description,
  enabled,
  onChange,
}: {
  icon: React.ReactNode;
  code: string;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-5">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
            enabled
              ? "border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-400"
              : "border-white/[0.06] bg-black/20 text-slate-600"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium text-slate-200">{title}</h3>
            <span className="font-mono text-[7px] tracking-wider text-slate-700">
              {code}
            </span>
          </div>
          <p className="mt-1 max-w-lg text-[10px] leading-5 text-slate-600">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition ${
          enabled
            ? "border-cyan-400/40 bg-cyan-400/20"
            : "border-white/[0.08] bg-white/[0.04]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
            enabled
              ? "left-[18px] bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,.45)]"
              : "left-0.5 bg-slate-600"
          }`}
        />
      </button>
    </div>
  );
}
/* ================================================================
   STATUS ROW
================================================================ */
function StatusRow({
  icon,
  name,
  description,
  status,
  statusType,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  status: string;
  statusType: "success" | "error" | "neutral";
}) {
  const statusClasses = {
    success: "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-400",
    error: "border-red-400/20 bg-red-400/[0.05] text-red-400",
    neutral: "border-white/[0.08] bg-white/[0.025] text-slate-500",
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-black/20 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/[0.04] text-cyan-500">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-slate-200">
            {name}
          </p>
          <p className="mt-0.5 truncate text-[9px] text-slate-600">
            {description}
          </p>
        </div>
      </div>
      <span
        className={`shrink-0 rounded border px-2 py-1 font-mono text-[7px] font-semibold tracking-wider ${statusClasses[statusType]}`}
      >
        {status}
      </span>
    </div>
  );
}
/* ================================================================
   INFO CARD
================================================================ */
function InfoCard({
  icon,
  code,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  code: string;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] text-cyan-400">
          {icon}
        </div>
        <span className="rounded border border-emerald-400/20 bg-emerald-400/[0.05] px-2 py-1 font-mono text-[7px] font-semibold tracking-wider text-emerald-400">
          {value}
        </span>
      </div>
      <p className="mt-4 font-mono text-[8px] uppercase tracking-[0.18em] text-slate-700">
        {code}
      </p>
      <h3 className="mt-1 text-xs font-semibold text-slate-200">{title}</h3>
      <p className="mt-1.5 text-[9px] leading-5 text-slate-600">
        {description}
      </p>
    </div>
  );
}
/* ================================================================
   TELEMETRY ITEM
================================================================ */
function TelemetryItem({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-400" : "bg-slate-700"
        }`}
      />
      <span className="font-mono text-[7px] uppercase tracking-wider text-slate-700">
        {label}
      </span>
      <span
        className={`font-mono text-[7px] font-semibold tracking-wider ${
          active ? "text-emerald-400" : "text-slate-600"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
