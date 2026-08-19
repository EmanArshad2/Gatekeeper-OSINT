"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Fingerprint,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
interface RiskWallet {
  id: number;
  address: string;
  chain: string;
  risk_score: number;
  risk_level: string;
  reason: string;
  confidence: number;
  created_at: string;
}
interface RiskResponse {
  status: string;
  summary: {
    wallets: number;
    high: number;
    medium: number;
    average_score: number;
  };
  wallets: RiskWallet[];
}
type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export default function RiskWorkspace() {
  const [wallets, setWallets] = useState<RiskWallet[]>([]);
  const [summary, setSummary] = useState({
    wallets: 0,
    high: 0,
    medium: 0,
    average_score: 0,
  });
  const [search, setSearch] = useState("");
  const [chainFilter, setChainFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  async function loadRiskData() {
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:8000/api/risk-analysis", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Risk analysis fetch failed");
      }
      const data: RiskResponse = await response.json();
      setSummary(
        data.summary || {
          wallets: 0,
          high: 0,
          medium: 0,
          average_score: 0,
        },
      );
      setWallets(data.wallets || []);
    } catch (error) {
      console.error("Risk analysis loading failed:", error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadRiskData();
    const timer = setInterval(() => {
      loadRiskData();
    }, 10000);
    return () => clearInterval(timer);
  }, []);
  const chains = useMemo(() => {
    const unique = Array.from(
      new Set(wallets.map((wallet) => wallet.chain).filter(Boolean)),
    );
    return ["ALL", ...unique];
  }, [wallets]);
  const filteredWallets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return wallets.filter((wallet) => {
      const matchesSearch =
        !query ||
        wallet.address.toLowerCase().includes(query) ||
        wallet.chain.toLowerCase().includes(query) ||
        wallet.reason.toLowerCase().includes(query);
      const matchesChain =
        chainFilter === "ALL" ||
        wallet.chain.toLowerCase() === chainFilter.toLowerCase();
      const matchesRisk =
        riskFilter === "ALL" || wallet.risk_level.toUpperCase() === riskFilter;
      return matchesSearch && matchesChain && matchesRisk;
    });
  }, [wallets, search, chainFilter, riskFilter]);
  const lowRiskCount = Math.max(
    0,
    summary.wallets - summary.high - summary.medium,
  );
  const highPercentage =
    summary.wallets > 0
      ? Math.round((summary.high / summary.wallets) * 100)
      : 0;
  const mediumPercentage =
    summary.wallets > 0
      ? Math.round((summary.medium / summary.wallets) * 100)
      : 0;
  const lowPercentage =
    summary.wallets > 0
      ? Math.max(0, 100 - highPercentage - mediumPercentage)
      : 0;
  async function copyAddress(wallet: RiskWallet) {
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(wallet.id);
      setTimeout(() => {
        setCopied(null);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  }
  return (
    <div className="space-y-6 pb-8">
      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative overflow-hidden rounded-3xl border border-red-500/15 bg-[#071019] shadow-2xl shadow-black/20">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-500/[0.07] blur-[100px]" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-500/[0.04] blur-[110px]" />
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.07] shadow-lg shadow-red-950/20">
                <ShieldAlert size={27} className="text-red-400" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-red-400">
                    Threat Assessment
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-2 py-1 font-mono text-[8px] font-bold tracking-wider text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    LIVE ANALYSIS
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
                  Risk Intelligence
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Analyze blockchain entities, identify high-risk wallets and
                  correlate suspicious activity across the Gatekeeper
                  intelligence layer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:block">
                <p className="font-mono text-[8px] uppercase tracking-widest text-slate-600">
                  Engine Status
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs font-semibold text-emerald-400">
                    OPERATIONAL
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={loadRiskData}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] px-4 py-3 text-xs font-semibold text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                {loading ? "ANALYZING" : "REFRESH"}
              </button>
            </div>
          </div>
        </div>
      </section>
      {/* =========================================================
          SUMMARY METRICS
      ========================================================= */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RiskMetric
          label="Analyzed Entities"
          value={summary.wallets}
          icon={<Wallet size={18} />}
          accent="cyan"
          footer="TOTAL WALLET RECORDS"
        />
        <RiskMetric
          label="High Risk"
          value={summary.high}
          icon={<ShieldAlert size={18} />}
          accent="red"
          footer={`${highPercentage}% OF ENTITIES`}
        />
        <RiskMetric
          label="Medium Risk"
          value={summary.medium}
          icon={<AlertTriangle size={18} />}
          accent="amber"
          footer={`${mediumPercentage}% OF ENTITIES`}
        />
        <RiskMetric
          label="Average Score"
          value={Number(summary.average_score || 0)}
          icon={<TrendingUp size={18} />}
          accent="violet"
          footer="RISK INDEX / 100"
        />
      </div>
      {/* =========================================================
          RISK OVERVIEW
      ========================================================= */}
      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-2xl border border-white/[0.06] bg-[#080f18] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={17} className="text-cyan-400" />
                <h2 className="text-sm font-bold text-white">
                  Risk Distribution
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Current threat classification across analyzed entities
              </p>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
              LIVE
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-900">
            <div className="flex h-full">
              <div
                className="bg-red-400 transition-all"
                style={{ width: `${highPercentage}%` }}
              />
              <div
                className="bg-amber-400 transition-all"
                style={{ width: `${mediumPercentage}%` }}
              />
              <div
                className="bg-emerald-400 transition-all"
                style={{ width: `${lowPercentage}%` }}
              />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4">
            <DistributionItem
              label="HIGH"
              value={summary.high}
              percentage={highPercentage}
              color="red"
            />
            <DistributionItem
              label="MEDIUM"
              value={summary.medium}
              percentage={mediumPercentage}
              color="amber"
            />
            <DistributionItem
              label="LOW"
              value={lowRiskCount}
              percentage={lowPercentage}
              color="emerald"
            />
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-[#080f18] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/15 bg-red-400/[0.05]">
              <Activity size={16} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Threat Posture</h2>
              <p className="text-xs text-slate-600">
                Current intelligence assessment
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-slate-600">
                Average Risk
              </p>
              <p className="mt-1 text-4xl font-bold text-white">
                {Number(summary.average_score || 0)}
                <span className="ml-1 text-lg text-slate-600">/100</span>
              </p>
            </div>
            <RiskBadge
              level={getRiskLevel(Number(summary.average_score || 0))}
            />
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400 transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, Number(summary.average_score || 0)),
                )}%`,
              }}
            />
          </div>
        </div>
      </section>
      {/* =========================================================
          FILTER BAR
      ========================================================= */}
      <section className="rounded-2xl border border-white/[0.06] bg-[#080f18] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search address, chain or intelligence reason..."
              className="h-11 w-full rounded-xl border border-white/[0.06] bg-[#050b12] pl-11 pr-10 text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-cyan-400/30"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-slate-300"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterSelect
              value={chainFilter}
              onChange={setChainFilter}
              options={chains}
            />
            {["ALL", "HIGH", "MEDIUM", "LOW"].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setRiskFilter(level)}
                className={`rounded-lg border px-3 py-2 font-mono text-[9px] font-bold tracking-wider transition ${
                  riskFilter === level
                    ? "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-300"
                    : "border-white/[0.06] bg-white/[0.02] text-slate-600 hover:text-slate-300"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-3">
          <span className="font-mono text-[8px] uppercase tracking-widest text-slate-700">
            Showing {filteredWallets.length} of {wallets.length} entities
          </span>
          {(search || chainFilter !== "ALL" || riskFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setChainFilter("ALL");
                setRiskFilter("ALL");
              }}
              className="font-mono text-[8px] font-bold uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
            >
              Clear Filters
            </button>
          )}
        </div>
      </section>
      {/* =========================================================
          TABLE
      ========================================================= */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#080f18]">
        <div className="flex flex-col gap-4 border-b border-white/[0.05] px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/15 bg-red-400/[0.05]">
              <Fingerprint size={16} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Risk Assessment Results
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-600">
                Wallet-level threat scoring and intelligence indicators
              </p>
            </div>
          </div>
          <span className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-[8px] font-bold tracking-widest text-slate-600">
            {filteredWallets.length} RECORDS
          </span>
        </div>
        {filteredWallets.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* DESKTOP */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04] bg-[#070d15]">
                    <TableHeading>ENTITY</TableHeading>
                    <TableHeading>CHAIN</TableHeading>
                    <TableHeading>RISK SCORE</TableHeading>
                    <TableHeading>CLASSIFICATION</TableHeading>
                    <TableHeading>INTELLIGENCE SIGNAL</TableHeading>
                    <TableHeading>CONFIDENCE</TableHeading>
                    <TableHeading>ACTION</TableHeading>
                  </tr>
                </thead>
                <tbody>
                  {filteredWallets.map((wallet) => {
                    const score = clampScore(wallet.risk_score);
                    const level = getRiskLevel(score);

                    const confidence = clampScore(wallet.confidence);
                    return (
                      <tr
                        key={wallet.id}
                        className="group border-b border-white/[0.035] transition hover:bg-cyan-400/[0.018]"
                      >
                        <td className="px-5 py-5">
                          <div className="flex min-w-[230px] items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-[#0b131e]">
                              <Wallet size={14} className="text-cyan-400" />
                            </div>
                            <div className="min-w-0">
                              <p
                                title={wallet.address}
                                className="truncate font-mono text-[10px] font-semibold text-slate-200"
                              >
                                {shortenAddress(wallet.address)}
                              </p>
                              <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-slate-700">
                                ENTITY #{wallet.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <ChainBadge chain={wallet.chain} />
                        </td>
                        <td className="px-4 py-5">
                          <div className="w-[130px]">
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="font-mono text-[9px] font-bold text-white">
                                {score}
                              </span>
                              <span className="font-mono text-[8px] text-slate-700">
                                /100
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
                              <div
                                className={`h-full rounded-full ${riskBarColor(level)}`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <RiskBadge level={level} />
                        </td>
                        <td className="max-w-[280px] px-4 py-5">
                          <p
                            title={wallet.reason}
                            className="truncate text-xs text-slate-400"
                          >
                            {wallet.reason || "No intelligence reason provided"}
                          </p>
                        </td>
                        <td className="px-4 py-5">
                          <ConfidenceBar value={confidence} />
                        </td>
                        <td className="px-5 py-5">
                          <div className="flex items-center justify-end gap-2 opacity-70 transition group-hover:opacity-100">
                            <IconButton
                              title="Copy wallet address"
                              onClick={() => copyAddress(wallet)}
                            >
                              {copied === wallet.id ? (
                                <CheckCircle2
                                  size={13}
                                  className="text-emerald-400"
                                />
                              ) : (
                                <Copy size={13} />
                              )}
                            </IconButton>
                            <IconButton
                              title="Inspect wallet"
                              onClick={() =>
                                setExpanded(
                                  expanded === wallet.id ? null : wallet.id,
                                )
                              }
                            >
                              <ChevronRight
                                size={14}
                                className={
                                  expanded === wallet.id
                                    ? "rotate-90 transition-transform"
                                    : "transition-transform"
                                }
                              />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* MOBILE */}
            <div className="divide-y divide-white/[0.04] lg:hidden">
              {filteredWallets.map((wallet) => {
                const level = normalizeRiskLevel(wallet.risk_level);
                const score = clampScore(wallet.risk_score);
                const confidence = clampScore(wallet.confidence);
                const isExpanded = expanded === wallet.id;
                return (
                  <div
                    key={wallet.id}
                    className="p-4 transition hover:bg-white/[0.015]"
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : wallet.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-[#0b131e]">
                            <Wallet size={15} className="text-cyan-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-[10px] font-semibold text-slate-200">
                              {shortenAddress(wallet.address)}
                            </p>
                            <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-slate-700">
                              ENTITY #{wallet.id}
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown
                            size={15}
                            className="shrink-0 text-slate-600"
                          />
                        ) : (
                          <ChevronRight
                            size={15}
                            className="shrink-0 text-slate-600"
                          />
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <ChainBadge chain={wallet.chain} />
                        <RiskBadge level={level} />
                        <span className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 font-mono text-[8px] font-bold text-slate-500">
                          SCORE {score}
                        </span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0b131e] p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <MobileMetric
                            label="RISK SCORE"
                            value={`${score}/100`}
                          />
                          <MobileMetric
                            label="CONFIDENCE"
                            value={`${confidence}%`}
                          />
                          <MobileMetric label="CHAIN" value={wallet.chain} />
                          <MobileMetric label="CLASSIFICATION" value={level} />
                        </div>
                        <div className="mt-5">
                          <p className="mb-2 font-mono text-[8px] uppercase tracking-widest text-slate-700">
                            Intelligence Signal
                          </p>
                          <div className="rounded-lg border border-white/[0.05] bg-[#070d15] p-3 text-xs leading-5 text-slate-400">
                            {wallet.reason ||
                              "No intelligence reason provided."}
                          </div>
                        </div>
                        <div className="mt-5">
                          <p className="mb-2 font-mono text-[8px] uppercase tracking-widest text-slate-700">
                            Wallet Address
                          </p>
                          <div className="break-all rounded-lg border border-white/[0.05] bg-[#070d15] p-3 font-mono text-[9px] leading-5 text-slate-400">
                            {wallet.address}
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => copyAddress(wallet)}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-400/15 bg-cyan-400/[0.05] px-3 py-2.5 font-mono text-[9px] font-bold text-cyan-300 transition hover:bg-cyan-400/[0.1]"
                          >
                            {copied === wallet.id ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              <Copy size={13} />
                            )}
                            {copied === wallet.id ? "COPIED" : "COPY ADDRESS"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              console.log(
                                "Investigate wallet:",
                                wallet.address,
                              );
                            }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 font-mono text-[9px] font-bold text-slate-300 transition hover:bg-white/[0.05]"
                          >
                            <ExternalLink size={13} />
                            INVESTIGATE
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
/* =========================================================
   METRIC
========================================================= */
function RiskMetric({
  label,
  value,
  icon,
  accent,
  footer,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: "cyan" | "red" | "amber" | "violet";
  footer: string;
}) {
  const styles = {
    cyan: {
      icon: "border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-400",
      glow: "bg-cyan-400",
    },
    red: {
      icon: "border-red-400/15 bg-red-400/[0.06] text-red-400",
      glow: "bg-red-400",
    },
    amber: {
      icon: "border-amber-400/15 bg-amber-400/[0.06] text-amber-400",
      glow: "bg-amber-400",
    },
    violet: {
      icon: "border-violet-400/15 bg-violet-400/[0.06] text-violet-400",
      glow: "bg-violet-400",
    },
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#080f18] p-5 transition hover:-translate-y-0.5 hover:border-white/[0.1]">
      <div
        className={`absolute bottom-0 left-0 h-px w-0 ${styles[accent].glow} transition-all duration-500 group-hover:w-full`}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            {label}
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">
            {value.toLocaleString()}
          </p>
          <p className="mt-2 font-mono text-[8px] uppercase tracking-wider text-slate-700">
            {footer}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${styles[accent].icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
/* =========================================================
   DISTRIBUTION
========================================================= */
function DistributionItem({
  label,
  value,
  percentage,
  color,
}: {
  label: string;
  value: number;
  percentage: number;
  color: "red" | "amber" | "emerald";
}) {
  const colors = {
    red: "bg-red-400",
    amber: "bg-amber-400",
    emerald: "bg-emerald-400",
  };
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${colors[color]}`} />
          <span className="font-mono text-[8px] font-bold tracking-wider text-slate-600">
            {label}
          </span>
        </div>
        <span className="font-mono text-[9px] font-bold text-slate-300">
          {value}
        </span>
      </div>
      <p className="mt-2 font-mono text-[8px] text-slate-700">
        {percentage}% OF TOTAL
      </p>
    </div>
  );
}
/* =========================================================
   RISK BADGE
========================================================= */
function RiskBadge({ level }: { level: RiskLevel }) {
  const styles = {
    HIGH: "border-red-400/20 bg-red-400/[0.06] text-red-300",
    MEDIUM: "border-amber-400/20 bg-amber-400/[0.06] text-amber-300",
    LOW: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[8px] font-bold tracking-wider ${styles[level]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          level === "HIGH"
            ? "bg-red-400"
            : level === "MEDIUM"
              ? "bg-amber-400"
              : "bg-emerald-400"
        }`}
      />
      {level}
    </span>
  );
}
/* =========================================================
   CHAIN BADGE
========================================================= */
function ChainBadge({ chain }: { chain: string }) {
  const normalized = chain.toLowerCase();
  const style =
    normalized.includes("bitcoin") || normalized === "btc"
      ? "border-amber-400/15 bg-amber-400/[0.05] text-amber-300"
      : normalized.includes("ethereum") || normalized === "eth"
        ? "border-blue-400/15 bg-blue-400/[0.05] text-blue-300"
        : normalized.includes("tron") || normalized === "trc20"
          ? "border-red-400/15 bg-red-400/[0.05] text-red-300"
          : normalized.includes("solana") || normalized === "sol"
            ? "border-violet-400/15 bg-violet-400/[0.05] text-violet-300"
            : "border-slate-700 bg-slate-800/40 text-slate-400";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-wider ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {chain}
    </span>
  );
}
/* =========================================================
   CONFIDENCE
========================================================= */
function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="w-[120px]">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[8px] uppercase tracking-wider text-slate-700">
          Confidence
        </span>
        <span className="font-mono text-[9px] font-bold text-slate-400">
          {value}%
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-900">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
/* =========================================================
   TABLE HEADING
========================================================= */
function TableHeading({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-700 first:pl-5">
      {children}
    </th>
  );
}
/* =========================================================
   FILTER SELECT
========================================================= */
function FilterSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-white/[0.06] bg-[#050b12] px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400 outline-none focus:border-cyan-400/25"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
/* =========================================================
   ICON BUTTON
========================================================= */
function IconButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-[#0b131e] text-slate-600 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-cyan-300"
    >
      {children}
    </button>
  );
}
/* =========================================================
   MOBILE METRIC
========================================================= */
function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[7px] uppercase tracking-widest text-slate-700">
        {label}
      </p>
      <p className="mt-1 font-mono text-xs font-bold text-slate-300">{value}</p>
    </div>
  );
}
/* =========================================================
   EMPTY STATE
========================================================= */
function EmptyState() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0b131e]">
        <ShieldCheck size={22} className="text-slate-700" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-400">
        No risk records found
      </h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-700">
        Try adjusting your search or filters, or refresh the intelligence engine
        to retrieve the latest wallet assessments.
      </p>
    </div>
  );
}
/* =========================================================
   HELPERS
========================================================= */
function normalizeRiskLevel(value: string): RiskLevel {
  const level = String(value || "").toUpperCase();

  if (level === "CRITICAL") return "CRITICAL";
  if (level === "HIGH") return "HIGH";
  if (level === "MEDIUM") return "MEDIUM";

  return "LOW";
}
function getRiskLevel(score: number): RiskLevel {
  if (score >= 90) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}
function clampScore(value: number) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}
function riskBarColor(level: RiskLevel) {
  if (level === "HIGH") return "bg-red-400";
  if (level === "MEDIUM") return "bg-amber-400";
  return "bg-emerald-400";
}
function shortenAddress(address: string) {
  if (!address) return "UNKNOWN";
  if (address.length <= 24) {
    return address;
  }
  return `${address.slice(0, 12)}...${address.slice(-10)}`;
}
