"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Database,
  FileSearch,
  Globe2,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import WalletEvidenceDrawer from "./WalletEvidenceDrawer";
type WalletData = {
  id: number;
  address: string;
  chain: string;
  risk_level: string;
  risk_score: number;
  confidence: number;
  balance: number;
  transaction_count: number;
  blacklisted: boolean;
  labels: string[];
  created_at: string;
};
type Summary = {
  wallets: number;
  high_risk: number;
  transactions: number;
  assets: number;
};
const API_URL = "http://127.0.0.1:8000/api/wallets";
export default function WalletWorkspace() {
  const searchParams = useSearchParams();
  const targetAddress = searchParams.get("address");
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [summary, setSummary] = useState<Summary>({
    wallets: 0,
    high_risk: 0,
    transactions: 0,
    assets: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  /* ============================================================
     LOAD WALLET INTELLIGENCE
  ============================================================ */
  async function loadWallets() {
    try {
      setLoading(true);
      const response = await fetch(API_URL, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load wallet intelligence");
      }
      const data = await response.json();
      const loadedWallets: WalletData[] = data.wallets || [];
      setWallets(loadedWallets);
      setSummary({
        wallets: data.summary?.wallets ?? 0,
        high_risk: data.summary?.high_risk ?? 0,
        transactions: data.summary?.transactions ?? 0,
        assets: data.summary?.assets ?? 0,
      });
      /*
       * If the dashboard opened:
       *
       * /wallet?address=0x...
       *
       * automatically locate that wallet and open
       * the existing evidence drawer.
       */
      if (targetAddress) {
        const matchedWallet = loadedWallets.find(
          (wallet) =>
            wallet.address?.toLowerCase() === targetAddress.toLowerCase(),
        );
        if (matchedWallet) {
          setSelectedWalletId(matchedWallet.id);
        }
      }
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error("Wallet intelligence loading failed:", error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadWallets();
    const timer = window.setInterval(loadWallets, 10000);
    return () => window.clearInterval(timer);
  }, [targetAddress]);
  /* ============================================================
     FILTERED WALLETS
  ============================================================ */
  const filteredWallets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return wallets;
    }
    return wallets.filter((wallet) => {
      return (
        wallet.address?.toLowerCase().includes(query) ||
        wallet.chain?.toLowerCase().includes(query) ||
        wallet.risk_level?.toLowerCase().includes(query) ||
        wallet.labels?.some((label) => label.toLowerCase().includes(query))
      );
    });
  }, [wallets, search]);
  /* ============================================================
     RISK STATISTICS
  ============================================================ */
  const riskStats = useMemo(() => {
    return {
      critical: wallets.filter(
        (wallet) =>
          wallet.risk_level?.toUpperCase() === "CRITICAL" ||
          wallet.risk_level?.toUpperCase() === "HIGH",
      ).length,
      medium: wallets.filter(
        (wallet) => wallet.risk_level?.toUpperCase() === "MEDIUM",
      ).length,
      low: wallets.filter(
        (wallet) =>
          wallet.risk_level?.toUpperCase() === "LOW" ||
          wallet.risk_level?.toUpperCase() === "SAFE",
      ).length,
    };
  }, [wallets]);
  /* ============================================================
     SELECTED TARGET
  ============================================================ */
  const selectedTargetExists = targetAddress
    ? wallets.some(
        (wallet) =>
          wallet.address?.toLowerCase() === targetAddress.toLowerCase(),
      )
    : false;
  return (
    <main className="relative min-h-full overflow-hidden bg-[#05070b] pb-10">
      {/* ============================================================
          AMBIENT FORENSIC ATMOSPHERE
      ============================================================ */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] overflow-hidden">
        <div className="absolute left-[28%] top-[-260px] h-[560px] w-[820px] -translate-x-1/2 rounded-full bg-cyan-500/[0.025] blur-[160px]" />
        <div className="absolute right-[-160px] top-[80px] h-[420px] w-[420px] rounded-full bg-violet-500/[0.018] blur-[140px]" />
        <div className="absolute left-[-180px] top-[420px] h-[340px] w-[340px] rounded-full bg-red-500/[0.012] blur-[130px]" />
      </div>
      {/* ============================================================
          HEADER
      ============================================================ */}
      <section className="relative">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />
          <span className="pointer-events-none absolute left-0 top-0 h-8 w-8 border-l border-t border-cyan-400/20" />
          <span className="pointer-events-none absolute bottom-0 right-0 h-8 w-8 border-b border-r border-cyan-400/10" />
          <div className="relative p-5 lg:p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06]">
                  <Wallet
                    size={22}
                    strokeWidth={1.6}
                    className="text-cyan-400"
                  />
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-cyan-400">
                      WALLET INTELLIGENCE
                    </span>
                    <span className="h-1 w-1 rounded-full bg-slate-700" />
                    <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-emerald-400">
                      LIVE REGISTRY
                    </span>
                  </div>
                  <h1 className="text-2xl font-medium tracking-tight text-slate-100 lg:text-3xl">
                    Wallet Intelligence Center
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-[11px] leading-relaxed text-slate-500">
                    Monitor blockchain entities, risk classifications,
                    transaction activity and forensic evidence trails.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-slate-600">
                    Registry Status
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-emerald-400">
                    OPERATIONAL
                  </p>
                  <p className="mt-0.5 font-mono text-[8px] text-slate-600">
                    POLLING // 10 SEC
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadWallets}
                  disabled={loading}
                  className="
                    group
                    flex
                    h-10
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-cyan-400/20
                    bg-cyan-400/[0.06]
                    px-3.5
                    font-mono
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-cyan-300
                    transition-all
                    hover:border-cyan-400/40
                    hover:bg-cyan-400/[0.1]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <RefreshCw
                    size={13}
                    strokeWidth={1.7}
                    className={
                      loading
                        ? "animate-spin"
                        : "transition-transform duration-500 group-hover:rotate-180"
                    }
                  />
                  <span className="hidden sm:inline">
                    {loading ? "Syncing" : "Sync Registry"}
                  </span>
                </button>
              </div>
            </div>
          </div>
          {/* HEADER TELEMETRY */}
          <div className="border-t border-white/[0.06] bg-white/[0.012] px-5 py-2.5 lg:px-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <TelemetryItem
                icon={Database}
                label="Registry"
                value="Connected"
                tone="emerald"
              />
              <TelemetryItem
                icon={Radio}
                label="Monitoring"
                value="Active"
                tone="cyan"
              />
              <TelemetryItem
                icon={Zap}
                label="Risk Engine"
                value="Online"
                tone="violet"
              />
              <TelemetryItem
                icon={ShieldCheck}
                label="Evidence"
                value="Available"
                tone="emerald"
              />
              <span className="ml-auto hidden font-mono text-[8px] uppercase tracking-[0.12em] text-slate-700 lg:block">
                GK // WALLET-INTEL // CORE
              </span>
            </div>
          </div>
        </div>
      </section>
      {/* ============================================================
          TARGET WALLET CONTEXT
      ============================================================ */}
      {targetAddress && (
        <section className="relative mt-3">
          <div className="flex flex-col gap-2 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.025] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
              <div className="min-w-0">
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-400">
                  TARGET ENTITY
                </span>
                <p className="mt-0.5 truncate font-mono text-[9px] text-slate-300">
                  {targetAddress}
                </p>
              </div>
            </div>
            <span
              className={`font-mono text-[8px] uppercase tracking-[0.12em] ${
                selectedTargetExists ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {selectedTargetExists
                ? "ENTITY RESOLVED"
                : "AWAITING REGISTRY MATCH"}
            </span>
          </div>
        </section>
      )}
      {/* ============================================================
          SECTION HEADER
      ============================================================ */}
      <section className="relative mt-7">
        <SectionHeader
          eyebrow="REGISTRY TELEMETRY"
          title="Wallet intelligence overview"
          description="Live registry statistics and risk distribution across monitored blockchain entities."
          tone="cyan"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IntelligenceMetric
            code="REGISTRY // 01"
            title="Indexed wallets"
            value={summary.wallets}
            description="Total tracked blockchain entities"
            icon={Wallet}
            tone="cyan"
          />
          <IntelligenceMetric
            code="RISK // 02"
            title="High-risk entities"
            value={summary.high_risk}
            description="Entities requiring analyst inspection"
            icon={ShieldAlert}
            tone="red"
            alert={summary.high_risk > 0}
          />
          <IntelligenceMetric
            code="FLOW // 03"
            title="Transactions"
            value={summary.transactions.toLocaleString()}
            description="Monitored blockchain transfers"
            icon={Activity}
            tone="violet"
          />
          <IntelligenceMetric
            code="ASSET // 04"
            title="Asset value"
            value={`$${summary.assets.toLocaleString()}`}
            description="Estimated tracked holdings"
            icon={Globe2}
            tone="emerald"
          />
        </div>
      </section>
      {/* ============================================================
          RISK DISTRIBUTION
      ============================================================ */}
      <section className="relative mt-7">
        <div className="mb-3 flex items-end justify-between gap-4">
          <SectionHeader
            eyebrow="RISK DISTRIBUTION"
            title="Threat classification"
            description="Current risk segmentation across the wallet registry."
            tone="red"
          />
          <span className="hidden pb-1 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-600 sm:block">
            {wallets.length.toString().padStart(2, "0")} ENTITIES ANALYZED
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <RiskDistribution
            label="HIGH / CRITICAL"
            value={riskStats.critical}
            total={wallets.length}
            tone="red"
          />
          <RiskDistribution
            label="MEDIUM"
            value={riskStats.medium}
            total={wallets.length}
            tone="amber"
          />
          <RiskDistribution
            label="LOW / SAFE"
            value={riskStats.low}
            total={wallets.length}
            tone="emerald"
          />
        </div>
      </section>
      {/* ============================================================
          ENTITY REGISTRY
      ============================================================ */}
      <section className="relative mt-7">
        <div className="mb-3">
          <SectionHeader
            eyebrow="ENTITY REGISTRY"
            title="Monitored blockchain wallets"
            description="Search, classify and inspect wallet entities currently registered within Gatekeeper."
            tone="cyan"
          />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent" />
          {/* SEARCH BAR */}
          <div className="border-b border-white/[0.06] bg-white/[0.012] p-4 lg:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-400">
                  <Search size={15} strokeWidth={1.7} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-200">
                    Entity search
                  </h3>
                  <p className="mt-0.5 text-[9px] text-slate-600">
                    Address, chain, risk classification or labels
                  </p>
                </div>
              </div>
              <div className="relative w-full xl:w-[420px]">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search wallet address..."
                  className="
                    h-10
                    w-full
                    rounded-xl
                    border
                    border-white/[0.07]
                    bg-[#05070b]
                    pl-9
                    pr-4
                    font-mono
                    text-[10px]
                    text-slate-200
                    outline-none
                    transition
                    placeholder:text-slate-700
                    focus:border-cyan-400/30
                    focus:ring-1
                    focus:ring-cyan-400/10
                  "
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <RegistryChip
                label={`${filteredWallets.length} MATCHES`}
                tone="cyan"
              />
              <RegistryChip
                label={`${summary.high_risk} HIGH RISK`}
                tone="red"
              />
              <RegistryChip
                label={`${summary.transactions.toLocaleString()} TX`}
                tone="violet"
              />
              <span className="ml-auto hidden font-mono text-[8px] uppercase tracking-[0.12em] text-slate-700 sm:block">
                LIVE FILTER
              </span>
            </div>
          </div>
          {/* TABLE */}
          {filteredWallets.length === 0 ? (
            <EmptyRegistryState search={search} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.008] text-left">
                    <TableHeader>Blockchain entity</TableHeader>
                    <TableHeader>Chain</TableHeader>
                    <TableHeader>Risk</TableHeader>
                    <TableHeader>Score</TableHeader>
                    <TableHeader>Confidence</TableHeader>
                    <TableHeader>Transactions</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredWallets.map((wallet) => {
                    const riskLevel =
                      wallet.risk_level?.toUpperCase() || "UNKNOWN";
                    const score = Number(wallet.risk_score ?? 0);
                    const riskConfig = getRiskConfig(riskLevel);
                    return (
                      <tr
                        key={wallet.id}
                        onClick={() => setSelectedWalletId(wallet.id)}
                        className="
                          group
                          cursor-pointer
                          transition-colors
                          hover:bg-white/[0.025]
                        "
                      >
                        {/* ENTITY */}
                        <td className="relative px-4 py-4">
                          <span className="absolute bottom-0 left-0 top-0 w-px bg-transparent transition-colors group-hover:bg-cyan-400" />
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.035]">
                              <Wallet
                                size={13}
                                strokeWidth={1.6}
                                className="text-cyan-400"
                              />
                            </div>
                            <div className="min-w-0">
                              <p
                                className="max-w-[280px] truncate font-mono text-[10px] text-slate-200"
                                title={wallet.address}
                              >
                                {wallet.address}
                              </p>
                              {wallet.labels?.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {wallet.labels.slice(0, 2).map((label) => (
                                    <span
                                      key={label}
                                      className="rounded border border-white/[0.06] bg-white/[0.025] px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.06em] text-slate-500"
                                    >
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* CHAIN */}
                        <td className="px-4 py-4">
                          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-slate-300">
                            {wallet.chain || "UNKNOWN"}
                          </span>
                        </td>
                        {/* RISK */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-md border px-2 py-1 font-mono text-[7px] font-semibold uppercase tracking-[0.1em] ${riskConfig.badge}`}
                          >
                            {riskLevel}
                          </span>
                        </td>
                        {/* SCORE */}
                        <td className="px-4 py-4">
                          <div className="flex min-w-[120px] items-center gap-2">
                            <span
                              className={`w-7 font-mono text-[10px] font-semibold ${getScoreColor(
                                score,
                              )}`}
                            >
                              {score}
                            </span>
                            <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className={`h-full rounded-full ${getScoreBarColor(
                                  score,
                                )}`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, score),
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        {/* CONFIDENCE */}
                        <td className="px-4 py-4">
                          <span className="font-mono text-[9px] text-slate-400">
                            {wallet.confidence ?? 0}%
                          </span>
                        </td>
                        {/* TRANSACTIONS */}
                        <td className="px-4 py-4">
                          <span className="font-mono text-[9px] text-slate-300">
                            {Number(
                              wallet.transaction_count ?? 0,
                            ).toLocaleString()}
                          </span>
                        </td>
                        {/* STATUS */}
                        <td className="px-4 py-4">
                          {wallet.blacklisted ? (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[7px] font-semibold uppercase tracking-[0.08em] text-red-400">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                              Blacklisted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[7px] font-semibold uppercase tracking-[0.08em] text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Monitored
                            </span>
                          )}
                        </td>
                        {/* ACTION */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end">
                            <ArrowUpRight
                              size={13}
                              className="text-slate-700 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-400"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* FOOTER */}
          <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-white/[0.008] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Radio size={10} strokeWidth={1.7} className="text-emerald-400" />
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-slate-600">
                Registry synchronized
              </span>
            </div>
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-slate-700">
              {filteredWallets.length} / {wallets.length} ENTITIES
            </span>
          </div>
        </div>
      </section>
      {/* ============================================================
          FOOTER STATUS
      ============================================================ */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <ShieldCheck
            size={11}
            strokeWidth={1.7}
            className="text-emerald-400"
          />
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-600">
            Secure local intelligence environment
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-slate-700">
              SYNC {formatTime(lastUpdated)}
            </span>
          )}
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-700">
            GATEKEEPER CORE v2.0
          </span>
        </div>
      </div>
      {/* ============================================================
          LOADING TELEMETRY
      ============================================================ */}
      {loading && (
        <div className="pointer-events-none fixed right-5 top-5 z-40">
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-[#05070b]/90 px-3 py-2 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]" />
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">
              Synchronizing registry
            </span>
          </div>
        </div>
      )}
      {/* ============================================================
          EXISTING EVIDENCE DRAWER
      ============================================================ */}
      {selectedWalletId !== null && (
        <WalletEvidenceDrawer
          walletId={selectedWalletId}
          onClose={() => setSelectedWalletId(null)}
        />
      )}
    </main>
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
  const styles = {
    cyan: "bg-cyan-400 text-cyan-400",
    red: "bg-red-400 text-red-400",
    violet: "bg-violet-400 text-violet-400",
    emerald: "bg-emerald-400 text-emerald-400",
  }[tone];
  const [line, text] = styles.split(" ");
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className={`h-px w-4 ${line}`} />
        <span
          className={`font-mono text-[8px] font-semibold tracking-[0.2em] ${text}`}
        >
          {eyebrow}
        </span>
      </div>
      <h2 className="mt-2 text-xl font-medium tracking-tight text-slate-100">
        {title}
      </h2>
      <p className="mt-1.5 max-w-2xl text-[10px] leading-relaxed text-slate-500">
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
  alert = false,
}: {
  code: string;
  title: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  tone: "red" | "cyan" | "violet" | "emerald";
  alert?: boolean;
}) {
  const styles = {
    red: {
      border: "border-red-400/15",
      icon: "border-red-400/20 bg-red-400/[0.06] text-red-400",
      accent: "bg-red-400",
      value: "text-red-300",
    },
    cyan: {
      border: "border-cyan-400/15",
      icon: "border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-400",
      accent: "bg-cyan-400",
      value: "text-cyan-300",
    },
    violet: {
      border: "border-violet-400/15",
      icon: "border-violet-400/15 bg-violet-400/[0.05] text-violet-400",
      accent: "bg-violet-400",
      value: "text-violet-300",
    },
    emerald: {
      border: "border-emerald-400/15",
      icon: "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-400",
      accent: "bg-emerald-400",
      value: "text-emerald-300",
    },
  }[tone];
  return (
    <article
      className={`
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        ${styles.border}
        bg-white/[0.025]
        p-4
        backdrop-blur-xl
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:bg-white/[0.04]
      `}
    >
      {alert && (
        <div className="pointer-events-none absolute right-[-25px] top-[-25px] h-24 w-24 rounded-full bg-red-400/[0.08] blur-2xl" />
      )}
      <span
        className={`absolute left-0 right-0 top-0 h-px ${styles.accent} opacity-25 transition-opacity group-hover:opacity-70`}
      />
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl border ${styles.icon}`}
        >
          <Icon size={16} strokeWidth={1.6} />
        </div>
        <span className="font-mono text-[7px] tracking-[0.1em] text-slate-700">
          {code}
        </span>
      </div>
      <div
        className={`relative mt-5 text-3xl font-medium leading-none tracking-tight ${styles.value}`}
      >
        {value}
      </div>
      <div className="mt-2 text-[10px] font-medium text-slate-300">{title}</div>
      <div className="mt-1.5 text-[8px] leading-relaxed text-slate-600">
        {description}
      </div>
    </article>
  );
}
/* ================================================================
   TELEMETRY ITEM
================================================================ */
function TelemetryItem({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: "cyan" | "emerald" | "violet";
}) {
  const color = {
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    violet: "text-violet-400",
  }[tone];
  return (
    <div className="flex items-center gap-2">
      <Icon size={10} strokeWidth={1.7} className={color} />
      <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-slate-600">
        {label}
      </span>
      <span
        className={`font-mono text-[7px] uppercase tracking-[0.1em] ${color}`}
      >
        {value}
      </span>
    </div>
  );
}
/* ================================================================
   RISK DISTRIBUTION
================================================================ */
function RiskDistribution({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "red" | "amber" | "emerald";
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const styles = {
    red: {
      border: "border-red-400/15",
      icon: "bg-red-400",
      text: "text-red-400",
      bar: "bg-red-400",
    },
    amber: {
      border: "border-amber-400/15",
      icon: "bg-amber-400",
      text: "text-amber-400",
      bar: "bg-amber-400",
    },
    emerald: {
      border: "border-emerald-400/15",
      icon: "bg-emerald-400",
      text: "text-emerald-400",
      bar: "bg-emerald-400",
    },
  }[tone];
  return (
    <div className={`rounded-2xl border ${styles.border} bg-white/[0.018] p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${styles.icon}`} />
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">
            {label}
          </span>
        </div>
        <span className={`font-mono text-sm font-medium ${styles.text}`}>
          {value}
        </span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className={`h-full rounded-full ${styles.bar} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[7px] uppercase tracking-[0.08em] text-slate-700">
        <span>{percentage}% of registry</span>
        <span>{value} entities</span>
      </div>
    </div>
  );
}
/* ================================================================
   REGISTRY CHIP
================================================================ */
function RegistryChip({
  label,
  tone,
}: {
  label: string;
  tone: "cyan" | "red" | "violet";
}) {
  const styles = {
    cyan: "border-cyan-400/10 bg-cyan-400/[0.035] text-cyan-400",
    red: "border-red-400/10 bg-red-400/[0.035] text-red-400",
    violet: "border-violet-400/10 bg-violet-400/[0.035] text-violet-400",
  }[tone];
  return (
    <span
      className={`rounded-md border px-2 py-1 font-mono text-[7px] font-semibold uppercase tracking-[0.1em] ${styles}`}
    >
      {label}
    </span>
  );
}
/* ================================================================
   TABLE HEADER
================================================================ */
function TableHeader({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-mono text-[7px] font-medium uppercase tracking-[0.14em] text-slate-700">
      {children}
    </th>
  );
}
/* ================================================================
   EMPTY STATE
================================================================ */
function EmptyRegistryState({ search }: { search: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-600">
        <FileSearch size={18} strokeWidth={1.5} />
      </div>
      <span className="mt-4 font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {search ? "NO MATCHING ENTITIES" : "REGISTRY EMPTY"}
      </span>
      <p className="mt-1.5 max-w-sm text-[9px] leading-relaxed text-slate-700">
        {search
          ? "No registered wallet matches the current search criteria."
          : "No wallet entities are currently available in the registry."}
      </p>
    </div>
  );
}
/* ================================================================
   RISK HELPERS
================================================================ */
function getRiskConfig(level: string) {
  const normalized = level?.toUpperCase();
  if (normalized === "HIGH" || normalized === "CRITICAL") {
    return {
      badge: "border-red-400/20 bg-red-400/[0.06] text-red-400",
    };
  }
  if (normalized === "MEDIUM") {
    return {
      badge: "border-amber-400/20 bg-amber-400/[0.05] text-amber-400",
    };
  }
  return {
    badge: "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-400",
  };
}
function getScoreColor(score: number) {
  if (score >= 70) return "text-red-400";
  if (score >= 40) return "text-amber-400";
  return "text-emerald-400";
}
function getScoreBarColor(score: number) {
  if (score >= 70) return "bg-red-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-emerald-400";
}
/* ================================================================
   TIME FORMATTER
================================================================ */
function formatTime(timestamp: string) {
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--:--";
  }
}
