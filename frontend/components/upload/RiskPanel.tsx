"use client";
import {
  Activity,
  AlertTriangle,
  Ban,
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Wallet } from "@/types/extraction";
interface RiskPanelProps {
  wallets: Wallet[];
}
type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
interface WalletWithFlags extends Wallet {
  blacklisted?: boolean;
}
export default function RiskPanel({ wallets }: RiskPanelProps) {
  /*
   * Normalize incoming evidence before rendering.
   *
   * This prevents repeated wallet addresses from creating duplicate
   * forensic entities in the UI.
   */
  const uniqueWallets = deduplicateWallets(wallets);
  if (uniqueWallets.length === 0) {
    return <EmptyRiskState />;
  }
  const scores = uniqueWallets.map((wallet) =>
    normalizeScore(wallet.risk_score),
  );
  const highRisk = uniqueWallets.filter(
    (wallet) => normalizeScore(wallet.risk_score) >= 70,
  );
  const mediumRisk = uniqueWallets.filter((wallet) => {
    const score = normalizeScore(wallet.risk_score);
    return score >= 40 && score < 70;
  });
  const lowRisk = uniqueWallets.filter(
    (wallet) => normalizeScore(wallet.risk_score) < 40,
  );
  const criticalCount = uniqueWallets.filter(
    (wallet) => normalizeScore(wallet.risk_score) >= 90,
  ).length;
  const blacklistedCount = uniqueWallets.filter((wallet) =>
    Boolean((wallet as WalletWithFlags).blacklisted),
  ).length;
  const highestRisk = Math.max(...scores, 0);
  const averageRisk =
    scores.length > 0
      ? Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length,
        )
      : 0;
  const threatLevel = getThreatLevel(highestRisk);
  const threatStyle = getThreatStyle(threatLevel);
  const sortedWallets = [...uniqueWallets].sort(
    (a, b) => normalizeScore(b.risk_score) - normalizeScore(a.risk_score),
  );
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#05070b]">
      {/* =========================================================
          WORKSPACE AMBIENCE
          ========================================================= */}
      <div
        className={`pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full blur-3xl ${threatStyle.ambient}`}
      />
      <div className="pointer-events-none absolute -bottom-28 -left-24 h-64 w-64 rounded-full bg-violet-500/[0.015] blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.025) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative">
        {/* =====================================================
            WORKSPACE HEADER
            ===================================================== */}
        <div className="flex flex-col gap-4 border-b border-white/[0.07] bg-white/[0.012] px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <div
              className={[
                "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                threatStyle.iconContainer,
              ].join(" ")}
            >
              {highestRisk >= 70 ? (
                <ShieldAlert size={15} className={threatStyle.icon} />
              ) : (
                <ShieldCheck size={15} className={threatStyle.icon} />
              )}
              <span
                className={[
                  "absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full",
                  threatStyle.dot,
                ].join(" ")}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[8px] font-semibold tracking-[0.2em] text-cyan-400/65">
                  RISK ANALYSIS
                </span>
                <span className="font-mono text-[7px] text-slate-700">//</span>
                <span className="font-mono text-[7px] tracking-[0.12em] text-slate-700">
                  WALLET ENTITIES
                </span>
              </div>
              <h2 className="mt-1 text-lg font-medium tracking-tight text-slate-100">
                Risk Intelligence
              </h2>
              <p className="mt-1 text-[10px] leading-4 text-slate-600">
                Threat scoring and forensic prioritization
              </p>
            </div>
          </div>
          <div
            className={[
              "flex w-fit items-center gap-2 rounded-lg border px-3 py-2",
              threatStyle.status,
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                threatStyle.dot,
                highestRisk >= 70 ? "animate-pulse" : "",
              ].join(" ")}
            />
            <span
              className={[
                "font-mono text-[8px] font-bold tracking-[0.14em]",
                threatStyle.text,
              ].join(" ")}
            >
              {threatLevel}
            </span>
          </div>
        </div>
        {/* =====================================================
            TELEMETRY
            ===================================================== */}
        <div className="grid grid-cols-2 border-b border-white/[0.07] lg:grid-cols-4">
          <OverviewMetric
            label="ENTITIES"
            value={uniqueWallets.length}
            icon={<Activity size={12} />}
          />
          <OverviewMetric
            label="AVG RISK"
            value={averageRisk}
            suffix="/100"
            accent={getScoreAccent(averageRisk)}
          />
          <OverviewMetric
            label="HIGH RISK"
            value={highRisk.length}
            accent={highRisk.length > 0 ? "danger" : "safe"}
          />
          <OverviewMetric
            label="CRITICAL"
            value={criticalCount}
            accent={criticalCount > 0 ? "danger" : "safe"}
          />
        </div>
        {/* =====================================================
            THREAT SIGNAL
            ===================================================== */}
        <div className="border-b border-white/[0.07] px-5 py-5 lg:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={["h-1 w-1 rounded-full", threatStyle.dot].join(
                    " ",
                  )}
                />
                <span className="font-mono text-[8px] font-semibold tracking-[0.18em] text-slate-600">
                  THREAT SIGNAL
                </span>
              </div>
              <div className="mt-2 flex items-end gap-3">
                <span
                  className={[
                    "font-mono text-3xl font-bold tracking-tight",
                    threatStyle.text,
                  ].join(" ")}
                >
                  {highestRisk}
                </span>
                <span className="mb-1 font-mono text-[8px] text-slate-700">
                  / 100
                </span>
                <span
                  className={[
                    "mb-1 rounded-md border px-2 py-1 font-mono text-[7px] font-bold tracking-[0.12em]",
                    threatStyle.badge,
                  ].join(" ")}
                >
                  {threatLevel}
                </span>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <p className="font-mono text-[7px] tracking-[0.14em] text-slate-700">
                MODEL
              </p>
              <p className="mt-1 font-mono text-[7px] tracking-[0.08em] text-slate-600">
                BEHAVIOR + VALIDATION + THREAT
              </p>
            </div>
          </div>
          <div className="mt-5">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.035]">
              <div
                className={[
                  "absolute inset-y-0 left-0 rounded-full transition-all duration-700",
                  threatStyle.bar,
                ].join(" ")}
                style={{
                  width: `${Math.min(Math.max(highestRisk, 0), 100)}%`,
                }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[6px] tracking-wider text-slate-700">
              <span>LOW</span>
              <span>40</span>
              <span>70</span>
              <span>90</span>
              <span>CRITICAL</span>
            </div>
          </div>
        </div>
        {/* =====================================================
            DISTRIBUTION
            ===================================================== */}
        <div className="border-b border-white/[0.07] px-5 py-5 lg:px-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,.6)]" />
                <span className="font-mono text-[8px] font-semibold tracking-[0.18em] text-slate-600">
                  CLASSIFICATION
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-600">
                Current threat distribution
              </p>
            </div>
            <span className="font-mono text-[7px] tracking-wider text-slate-700">
              {uniqueWallets.length} ENTITIES
            </span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.035]">
            {highRisk.length > 0 && (
              <div
                className="bg-red-500 transition-all duration-500"
                style={{
                  width: `${(highRisk.length / uniqueWallets.length) * 100}%`,
                }}
              />
            )}
            {mediumRisk.length > 0 && (
              <div
                className="bg-orange-400 transition-all duration-500"
                style={{
                  width: `${(mediumRisk.length / uniqueWallets.length) * 100}%`,
                }}
              />
            )}
            {lowRisk.length > 0 && (
              <div
                className="bg-emerald-400 transition-all duration-500"
                style={{
                  width: `${(lowRisk.length / uniqueWallets.length) * 100}%`,
                }}
              />
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <DistributionItem
              label="HIGH"
              value={highRisk.length}
              total={uniqueWallets.length}
              color="red"
            />
            <DistributionItem
              label="MEDIUM"
              value={mediumRisk.length}
              total={uniqueWallets.length}
              color="amber"
            />
            <DistributionItem
              label="LOW"
              value={lowRisk.length}
              total={uniqueWallets.length}
              color="emerald"
            />
          </div>
        </div>
        {/* =====================================================
            FLAGS
            Only rendered when there is an actual signal.
            ===================================================== */}
        {(highRisk.length > 0 || criticalCount > 0 || blacklistedCount > 0) && (
          <div className="border-b border-red-500/[0.08] bg-red-500/[0.012] px-5 py-3 lg:px-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={11} className="text-red-400" />
                <span className="font-mono text-[7px] font-semibold tracking-[0.14em] text-slate-600">
                  SIGNALS
                </span>
              </div>
              {highRisk.length > 0 && (
                <FlagItem label={`${highRisk.length} HIGH-RISK`} />
              )}
              {criticalCount > 0 && (
                <FlagItem label={`${criticalCount} CRITICAL`} />
              )}
              {blacklistedCount > 0 && (
                <FlagItem label={`${blacklistedCount} BLACKLISTED`} />
              )}
            </div>
          </div>
        )}
        {/* =====================================================
            ENTITY RANKING
            ===================================================== */}
        <div>
          <div className="flex items-end justify-between border-b border-white/[0.07] px-5 py-4 lg:px-6">
            <div>
              <div className="flex items-center gap-2">
                <Fingerprint size={11} className="text-cyan-400/60" />
                <span className="font-mono text-[8px] font-semibold tracking-[0.18em] text-slate-600">
                  PRIORITIZED ENTITIES
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-600">
                Highest-risk wallet entities requiring review
              </p>
            </div>
            <span className="hidden font-mono text-[7px] tracking-wider text-slate-700 sm:block">
              RISK DESC
            </span>
          </div>
          <div className="divide-y divide-white/[0.045]">
            {sortedWallets.map((wallet, index) => {
              const score = normalizeScore(wallet.risk_score);
              const risk = getRiskLevel(score);
              const walletData = wallet as WalletWithFlags;
              return (
                <WalletRiskRow
                  key={`${normalizeAddress(wallet.address)}-${wallet.chain ?? "unknown"}`}
                  wallet={wallet}
                  index={index}
                  score={score}
                  risk={risk}
                  blacklisted={Boolean(walletData.blacklisted)}
                />
              );
            })}
          </div>
        </div>
        {/* =====================================================
            FOOTER
            ===================================================== */}
        <div className="border-t border-white/[0.07] bg-black/20 px-5 py-3 lg:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[7px] tracking-[0.1em] text-slate-700">
              <span>RISK ENGINE // ACTIVE</span>
              <span>DEDUPLICATION // ENABLED</span>
              <span>THRESHOLDS // &lt;40 · 40–69 · ≥70 · ≥90</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.7)]" />
              <span className="font-mono text-[7px] tracking-[0.12em] text-slate-600">
                VERIFIED
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
/* ===============================================================
   WALLET ROW
   =============================================================== */
function WalletRiskRow({
  wallet,
  index,
  score,
  risk,
  blacklisted,
}: {
  wallet: Wallet;
  index: number;
  score: number;
  risk: ReturnType<typeof getRiskLevel>;
  blacklisted: boolean;
}) {
  return (
    <div className="group relative px-5 py-4 transition-colors hover:bg-white/[0.018] lg:px-6">
      {score >= 70 && (
        <div
          className={[
            "absolute bottom-0 left-0 top-0 w-px",
            score >= 90 ? "bg-red-500" : "bg-orange-400",
          ].join(" ")}
        />
      )}
      <div className="flex gap-4">
        <div className="hidden w-7 shrink-0 pt-1.5 text-center font-mono text-[8px] text-slate-700 sm:block">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                {score >= 70 ? (
                  <ShieldAlert size={13} className={risk.text} />
                ) : (
                  <ShieldCheck size={13} className="text-slate-600" />
                )}
                <span
                  className="truncate font-mono text-[10px] font-semibold text-slate-200"
                  title={wallet.address}
                >
                  {formatAddress(wallet.address)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-md border border-cyan-400/10 bg-cyan-400/[0.035] px-2 py-0.5 font-mono text-[7px] font-semibold uppercase tracking-[0.12em] text-cyan-400/70">
                  {wallet.chain || "UNKNOWN"}
                </span>
                {wallet.valid === false && (
                  <span className="flex items-center gap-1 rounded-md border border-red-500/15 bg-red-500/[0.035] px-2 py-0.5 font-mono text-[7px] font-semibold tracking-[0.12em] text-red-400">
                    <AlertTriangle size={9} />
                    INVALID
                  </span>
                )}
                {blacklisted && (
                  <span className="flex items-center gap-1 rounded-md border border-red-500/15 bg-red-500/[0.035] px-2 py-0.5 font-mono text-[7px] font-semibold tracking-[0.12em] text-red-400">
                    <Ban size={9} />
                    BLACKLISTED
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 sm:shrink-0">
              <div className="text-right">
                <p className="font-mono text-[7px] tracking-[0.14em] text-slate-700">
                  RISK
                </p>
                <p
                  className={[
                    "mt-0.5 font-mono text-sm font-bold",
                    risk.text,
                  ].join(" ")}
                >
                  {score}
                  <span className="ml-0.5 text-[7px] text-slate-700">/100</span>
                </p>
              </div>
              <span
                className={[
                  "rounded-md border px-2 py-1 font-mono text-[7px] font-bold tracking-[0.12em]",
                  risk.badge,
                ].join(" ")}
              >
                {risk.label}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="relative h-1 overflow-hidden rounded-full bg-white/[0.035]">
              <div
                className={[
                  "absolute inset-y-0 left-0 rounded-full transition-all duration-700",
                  risk.bar,
                ].join(" ")}
                style={{
                  width: `${Math.min(Math.max(score, 0), 100)}%`,
                }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[6px] tracking-wider text-slate-700">
              <span>LOW</span>
              <span>40</span>
              <span>70</span>
              <span>90</span>
              <span>CRITICAL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ===============================================================
   EMPTY STATE
   =============================================================== */
function EmptyRiskState() {
  return (
    <section className="relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#05070b]">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.02] blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.025) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.012] px-5 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.045]">
              <ShieldCheck size={15} className="text-cyan-400" />
            </div>
            <div>
              <p className="font-mono text-[8px] font-semibold tracking-[0.2em] text-cyan-400/65">
                RISK ANALYSIS
              </p>
              <h2 className="mt-1 text-lg font-medium tracking-tight text-slate-100">
                Risk Intelligence
              </h2>
            </div>
          </div>
          <span className="hidden rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[7px] font-semibold tracking-[0.12em] text-slate-700 sm:block">
            AWAITING DATA
          </span>
        </div>
        <div className="relative flex min-h-[240px] items-center justify-center px-6">
          <div className="max-w-sm text-center">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.018]">
              <Activity size={19} className="text-slate-600" />
              <span className="absolute inset-0 rounded-2xl border border-cyan-400/[0.035]" />
            </div>
            <p className="mt-4 font-mono text-[10px] font-semibold tracking-[0.12em] text-slate-400">
              NO THREAT DATA
            </p>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-600">
              Wallet risk intelligence will populate after forensic extraction
              and behavioral scoring are completed.
            </p>
          </div>
        </div>
        <div className="border-t border-white/[0.07] bg-black/20 px-5 py-3">
          <div className="flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
            <span className="font-mono text-[7px] tracking-[0.16em] text-slate-700">
              RISK ENGINE // STANDBY
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
/* ===============================================================
   OVERVIEW METRIC
   =============================================================== */
function OverviewMetric({
  label,
  value,
  suffix,
  icon,
  accent = "default",
}: {
  label: string;
  value: number;
  suffix?: string;
  icon?: React.ReactNode;
  accent?: "default" | "danger" | "warning" | "safe";
}) {
  const valueClass =
    accent === "danger"
      ? "text-red-400"
      : accent === "warning"
        ? "text-orange-400"
        : accent === "safe"
          ? "text-emerald-400"
          : "text-slate-100";
  return (
    <div className="min-w-0 border-r border-white/[0.07] px-4 py-4 last:border-r-0 lg:px-5">
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-700">{icon}</span>}
        <span className="truncate font-mono text-[7px] font-semibold tracking-[0.14em] text-slate-600">
          {label}
        </span>
      </div>
      <div
        className={[
          "mt-2 font-mono text-xl font-bold tracking-tight",
          valueClass,
        ].join(" ")}
      >
        {value}
        {suffix && (
          <span className="ml-1 text-[8px] text-slate-700">{suffix}</span>
        )}
      </div>
    </div>
  );
}
/* ===============================================================
   DISTRIBUTION
   =============================================================== */
function DistributionItem({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: "red" | "amber" | "emerald";
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const styles = {
    red: {
      dot: "bg-red-400",
      text: "text-red-400",
      border: "border-red-500/10",
      bg: "bg-red-500/[0.02]",
    },
    amber: {
      dot: "bg-orange-400",
      text: "text-orange-400",
      border: "border-orange-400/10",
      bg: "bg-orange-400/[0.02]",
    },
    emerald: {
      dot: "bg-emerald-400",
      text: "text-emerald-400",
      border: "border-emerald-400/10",
      bg: "bg-emerald-400/[0.02]",
    },
  };
  const style = styles[color];
  return (
    <div
      className={["rounded-xl border px-3 py-2.5", style.border, style.bg].join(
        " ",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={["h-1.5 w-1.5 rounded-full", style.dot].join(" ")} />
          <span className="font-mono text-[7px] font-semibold tracking-[0.12em] text-slate-600">
            {label}
          </span>
        </div>
        <span className={["font-mono text-sm font-bold", style.text].join(" ")}>
          {value}
        </span>
      </div>
      <div className="mt-1 font-mono text-[6px] tracking-wider text-slate-700">
        {percentage}% OF ENTITIES
      </div>
    </div>
  );
}
/* ===============================================================
   FLAG
   =============================================================== */
function FlagItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1 w-1 rounded-full bg-red-400 shadow-[0_0_5px_rgba(248,113,113,.6)]" />
      <span className="font-mono text-[7px] font-semibold tracking-[0.1em] text-red-400/80">
        {label}
      </span>
    </div>
  );
}
/* ===============================================================
   DEDUPLICATION
   =============================================================== */
function deduplicateWallets(wallets: Wallet[] | undefined | null): Wallet[] {
  if (!wallets?.length) {
    return [];
  }
  const unique = new Map<string, Wallet>();
  for (const wallet of wallets) {
    if (!wallet?.address) {
      continue;
    }
    const normalizedAddress = normalizeAddress(wallet.address);
    const chain = String(wallet.chain ?? "unknown")
      .trim()
      .toLowerCase();
    const key = `${chain}:${normalizedAddress}`;
    const existing = unique.get(key);
    /*
     * If the same wallet appears multiple times, keep the record
     * with the highest risk score.
     *
     * This prevents duplicated extraction records from artificially
     * increasing the threat distribution.
     */
    if (!existing) {
      unique.set(key, wallet);
      continue;
    }
    const existingScore = normalizeScore(existing.risk_score);
    const currentScore = normalizeScore(wallet.risk_score);
    if (currentScore > existingScore) {
      unique.set(key, wallet);
    }
  }
  return Array.from(unique.values());
}
function normalizeAddress(address: string | undefined | null) {
  return String(address ?? "")
    .trim()
    .toLowerCase();
}
function normalizeScore(score: unknown) {
  const parsed = Number(score);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.min(Math.max(Math.round(parsed), 0), 100);
}
/* ===============================================================
   ADDRESS
   =============================================================== */
function formatAddress(address: string) {
  if (!address) {
    return "UNKNOWN ADDRESS";
  }
  if (address.length <= 24) {
    return address;
  }
  return `${address.slice(0, 11)}...${address.slice(-9)}`;
}
/* ===============================================================
   THREAT LEVEL
   =============================================================== */
function getThreatLevel(
  highestRisk: number,
): "CRITICAL" | "HIGH" | "MODERATE" | "LOW" {
  if (highestRisk >= 90) {
    return "CRITICAL";
  }
  if (highestRisk >= 70) {
    return "HIGH";
  }
  if (highestRisk >= 40) {
    return "MODERATE";
  }
  return "LOW";
}
/* ===============================================================
   RISK LEVEL
   =============================================================== */
function getRiskLevel(score: number) {
  if (score >= 90) {
    return {
      label: "CRITICAL",
      text: "text-red-400",
      badge: "border-red-500/20 bg-red-500/[0.045] text-red-400",
      bar: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.5)]",
    };
  }
  if (score >= 70) {
    return {
      label: "HIGH",
      text: "text-orange-400",
      badge: "border-orange-400/20 bg-orange-400/[0.045] text-orange-400",
      bar: "bg-orange-400 shadow-[0_0_9px_rgba(251,146,60,.4)]",
    };
  }
  if (score >= 40) {
    return {
      label: "MEDIUM",
      text: "text-orange-300",
      badge: "border-orange-300/15 bg-orange-300/[0.035] text-orange-300",
      bar: "bg-orange-300",
    };
  }
  return {
    label: "LOW",
    text: "text-emerald-400",
    badge: "border-emerald-400/15 bg-emerald-400/[0.035] text-emerald-400",
    bar: "bg-emerald-400",
  };
}
/* ===============================================================
   THREAT STYLE
   =============================================================== */
function getThreatStyle(level: "CRITICAL" | "HIGH" | "MODERATE" | "LOW") {
  if (level === "CRITICAL") {
    return {
      text: "text-red-400",
      icon: "text-red-400",
      iconContainer:
        "border-red-500/20 bg-red-500/[0.045] shadow-[0_0_20px_rgba(239,68,68,.05)]",
      dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,.75)]",
      status: "border-red-500/20 bg-red-500/[0.045]",
      badge: "border-red-500/20 bg-red-500/[0.045]",
      bar: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,.45)]",
      ambient: "bg-red-500/[0.04]",
    };
  }
  if (level === "HIGH") {
    return {
      text: "text-orange-400",
      icon: "text-orange-400",
      iconContainer: "border-orange-400/20 bg-orange-400/[0.045]",
      dot: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,.65)]",
      status: "border-orange-400/20 bg-orange-400/[0.045]",
      badge: "border-orange-400/20 bg-orange-400/[0.045]",
      bar: "bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,.4)]",
      ambient: "bg-orange-400/[0.03]",
    };
  }
  if (level === "MODERATE") {
    return {
      text: "text-orange-300",
      icon: "text-orange-300",
      iconContainer: "border-orange-300/15 bg-orange-300/[0.035]",
      dot: "bg-orange-300",
      status: "border-orange-300/15 bg-orange-300/[0.035]",
      badge: "border-orange-300/15 bg-orange-300/[0.035]",
      bar: "bg-orange-300",
      ambient: "bg-orange-300/[0.018]",
    };
  }
  return {
    text: "text-emerald-400",
    icon: "text-emerald-400",
    iconContainer: "border-emerald-400/15 bg-emerald-400/[0.035]",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.6)]",
    status: "border-emerald-400/15 bg-emerald-400/[0.035]",
    badge: "border-emerald-400/15 bg-emerald-400/[0.035]",
    bar: "bg-emerald-400",
    ambient: "bg-emerald-400/[0.018]",
  };
}
/* ===============================================================
   SCORE ACCENT
   =============================================================== */
function getScoreAccent(
  score: number,
): "default" | "danger" | "warning" | "safe" {
  if (score >= 70) return "danger";
  if (score >= 40) return "warning";
  return "safe";
}
