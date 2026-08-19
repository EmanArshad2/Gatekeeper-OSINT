"use client";
import { useMemo, useState } from "react";
import {
  Copy,
  Check,
  Network,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Fingerprint,
  Activity,
  Wallet as WalletIcon,
  AlertTriangle,
  CopyCheck,
  Database,
  FlaskConical,
} from "lucide-react";
import { Wallet } from "@/types/extraction";
interface WalletTableProps {
  wallets: Wallet[];
}
type WalletStatus = {
  duplicate: boolean;
  duplicateCount: number;
  dummy: boolean;
  invalid: boolean;
};
type EnrichedWallet = Wallet & {
  __status: WalletStatus;
  __originalIndexes: number[];
};
export default function WalletTable({ wallets }: WalletTableProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  /*
   * ===============================================================
   * DATA NORMALIZATION
   * ===============================================================
   *
   * Important:
   * We do NOT mutate or delete the original evidence.
   *
   * Repeated wallet addresses are grouped together so the UI does
   * not present the same intelligence multiple times.
   */
  const analyzedWallets = useMemo(() => {
    const groups = new Map<
      string,
      {
        wallet: Wallet;
        indexes: number[];
      }
    >();
    wallets.forEach((wallet, index) => {
      const address = normalizeAddress(wallet.address);
      if (!address) {
        return;
      }
      const existing = groups.get(address);
      if (existing) {
        existing.indexes.push(index);
      } else {
        groups.set(address, {
          wallet,
          indexes: [index],
        });
      }
    });
    return Array.from(groups.values()).map(
      ({ wallet, indexes }): EnrichedWallet => {
        const duplicateCount = indexes.length;
        return {
          ...wallet,
          __originalIndexes: indexes,
          __status: {
            duplicate: duplicateCount > 1,
            duplicateCount,
            dummy: isDummyWallet(wallet.address),
            invalid: wallet.valid === false,
          },
        };
      },
    );
  }, [wallets]);
  /*
   * ===============================================================
   * DATA QUALITY METRICS
   * ===============================================================
   */
  const duplicateWallets = analyzedWallets.filter(
    (wallet) => wallet.__status.duplicate,
  );
  const duplicateOccurrences = duplicateWallets.reduce(
    (total, wallet) => total + Math.max(wallet.__status.duplicateCount - 1, 0),
    0,
  );
  const dummyWallets = analyzedWallets.filter(
    (wallet) => wallet.__status.dummy,
  );
  const invalidWallets = analyzedWallets.filter(
    (wallet) => wallet.__status.invalid,
  );
  const uniqueWalletCount = analyzedWallets.length;
  const highRiskCount = analyzedWallets.filter(
    (wallet) => Number(wallet.risk_score ?? 0) >= 70,
  ).length;
  const criticalCount = analyzedWallets.filter(
    (wallet) => Number(wallet.risk_score ?? 0) >= 90,
  ).length;
  const validCount = analyzedWallets.filter(
    (wallet) => wallet.valid !== false && !wallet.__status.dummy,
  ).length;
  /*
   * ===============================================================
   * RISK SORTING
   * ===============================================================
   */
  const sortedWallets = useMemo(() => {
    return [...analyzedWallets].sort((a, b) => {
      const riskDifference =
        Number(b.risk_score ?? 0) - Number(a.risk_score ?? 0);
      if (riskDifference !== 0) {
        return riskDifference;
      }
      return Number(b.confidence ?? 0) - Number(a.confidence ?? 0);
    });
  }, [analyzedWallets]);
  /*
   * ===============================================================
   * COPY
   * ===============================================================
   */
  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(address);
      window.setTimeout(() => {
        setCopied(null);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy wallet address:", error);
    }
  }
  /*
   * ===============================================================
   * EMPTY STATE
   * ===============================================================
   */
  if (!wallets || wallets.length === 0) {
    return (
      <section className="relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#05070b]">
        <ForensicGrid />
        <div className="relative">
          <WalletHeader detected={0} unique={0} highRisk={0} critical={0} />
          <div className="flex min-h-[270px] flex-col items-center justify-center px-6 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.018]">
              <WalletIcon size={21} className="text-slate-600" />
              <span className="absolute inset-0 rounded-2xl border border-cyan-400/[0.035]" />
            </div>
            <p className="mt-4 font-mono text-[10px] font-semibold tracking-[0.12em] text-slate-400">
              NO WALLET INTELLIGENCE
            </p>
            <p className="mt-2 max-w-sm text-xs leading-5 text-slate-600">
              Blockchain addresses recovered from uploaded evidence will appear
              here after extraction, normalization and validation.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.018] px-3 py-2">
              <Activity size={11} className="text-slate-700" />
              <span className="font-mono text-[7px] tracking-[0.16em] text-slate-700">
                EXTRACTION PIPELINE // STANDBY
              </span>
            </div>
          </div>
          <PanelFooter text="WALLET ENGINE // AWAITING EVIDENCE" />
        </div>
      </section>
    );
  }
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#05070b] shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
      <ForensicGrid />
      <div className="relative">
        {/* =====================================================
            HEADER
            ===================================================== */}
        <WalletHeader
          detected={wallets.length}
          unique={uniqueWalletCount}
          highRisk={highRiskCount}
          critical={criticalCount}
        />
        {/* =====================================================
            DATA QUALITY
            ===================================================== */}
        {(duplicateWallets.length > 0 ||
          dummyWallets.length > 0 ||
          invalidWallets.length > 0) && (
          <div className="border-b border-amber-400/[0.08] bg-amber-400/[0.012] px-5 py-3.5 lg:px-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="flex items-center gap-2">
                <Database size={11} className="text-amber-400/70" />
                <span className="font-mono text-[8px] font-semibold tracking-[0.16em] text-slate-600">
                  DATA QUALITY
                </span>
              </div>
              {duplicateWallets.length > 0 && (
                <QualityFlag
                  icon={<CopyCheck size={10} />}
                  label={`${duplicateWallets.length} DUPLICATE`}
                  detail={
                    duplicateOccurrences > 0
                      ? `${duplicateOccurrences} REPEATED`
                      : undefined
                  }
                  tone="amber"
                />
              )}
              {dummyWallets.length > 0 && (
                <QualityFlag
                  icon={<FlaskConical size={10} />}
                  label={`${dummyWallets.length} TEST / DUMMY`}
                  tone="violet"
                />
              )}
              {invalidWallets.length > 0 && (
                <QualityFlag
                  icon={<AlertTriangle size={10} />}
                  label={`${invalidWallets.length} INVALID`}
                  tone="red"
                />
              )}
            </div>
          </div>
        )}
        {/* =====================================================
            SUMMARY TELEMETRY
            ===================================================== */}
        <div className="grid grid-cols-2 border-b border-white/[0.07] lg:grid-cols-4">
          <OverviewMetric
            label="EXTRACTED"
            value={wallets.length}
            icon={<WalletIcon size={12} />}
          />
          <OverviewMetric
            label="UNIQUE"
            value={uniqueWalletCount}
            accent="cyan"
          />
          <OverviewMetric
            label="VALID"
            value={validCount}
            accent={validCount > 0 ? "safe" : "default"}
          />
          <OverviewMetric
            label="THREAT SIGNALS"
            value={highRiskCount}
            accent={highRiskCount > 0 ? "danger" : "safe"}
          />
        </div>
        {/* =====================================================
            ANALYSIS STRIP
            ===================================================== */}
        <div className="border-b border-white/[0.07] px-5 py-4 lg:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,.7)]" />
                <span className="font-mono text-[8px] font-semibold tracking-[0.18em] text-slate-600">
                  WALLET ENTITY INDEX
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-600">
                Normalized blockchain identities prioritized by threat score
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {duplicateWallets.length > 0 && (
                <span className="rounded-md border border-amber-400/10 bg-amber-400/[0.025] px-2 py-1 font-mono text-[7px] font-semibold tracking-wider text-amber-400/70">
                  DUPLICATES COLLAPSED
                </span>
              )}
              {dummyWallets.length > 0 && (
                <span className="rounded-md border border-violet-400/10 bg-violet-400/[0.025] px-2 py-1 font-mono text-[7px] font-semibold tracking-wider text-violet-400/70">
                  TEST DATA FLAGGED
                </span>
              )}
              <span className="font-mono text-[7px] tracking-wider text-slate-700">
                {uniqueWalletCount} UNIQUE ENTITIES
              </span>
            </div>
          </div>
        </div>
        {/* =====================================================
            DESKTOP TABLE
            ===================================================== */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.012]">
                <th className="px-6 py-3.5 text-left">
                  <TableHeading>WALLET IDENTITY</TableHeading>
                </th>
                <th className="px-4 py-3.5 text-left">
                  <TableHeading>NETWORK</TableHeading>
                </th>
                <th className="px-4 py-3.5 text-left">
                  <TableHeading>VALIDATION</TableHeading>
                </th>
                <th className="px-4 py-3.5 text-left">
                  <TableHeading>CONFIDENCE</TableHeading>
                </th>
                <th className="px-4 py-3.5 text-left">
                  <TableHeading>THREAT PROFILE</TableHeading>
                </th>
                <th className="px-6 py-3.5 text-right">
                  <TableHeading>ACTIONS</TableHeading>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedWallets.map((wallet, index) => {
                const score = Number(wallet.risk_score ?? 0);
                const confidence = Math.min(
                  100,
                  Math.max(0, Number(wallet.confidence ?? 0)),
                );
                const chain = chainStyle(wallet.chain);
                const risk = riskConfig(score);
                const status = wallet.__status;
                return (
                  <tr
                    key={`${normalizeAddress(wallet.address)}-${index}`}
                    className="group border-b border-white/[0.045] transition-colors hover:bg-cyan-400/[0.012]"
                  >
                    {/* WALLET IDENTITY */}
                    <td className="px-6 py-4.5">
                      <div className="flex min-w-[290px] items-start gap-3">
                        <div
                          className={[
                            "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                            status.dummy
                              ? "border-violet-400/15 bg-violet-400/[0.025]"
                              : status.duplicate
                                ? "border-amber-400/15 bg-amber-400/[0.025]"
                                : "border-cyan-400/10 bg-cyan-400/[0.025]",
                          ].join(" ")}
                        >
                          {status.dummy ? (
                            <FlaskConical
                              size={14}
                              className="text-violet-400/70"
                            />
                          ) : (
                            <WalletIcon
                              size={14}
                              className="text-cyan-400/75"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            {score >= 70 ? (
                              <ShieldAlert size={12} className={risk.text} />
                            ) : (
                              <ShieldCheck
                                size={12}
                                className="text-slate-600"
                              />
                            )}
                            <span
                              title={wallet.address}
                              className="truncate font-mono text-[10px] font-semibold text-slate-200"
                            >
                              {shortenAddress(wallet.address)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-slate-700">
                              BLOCKCHAIN ADDRESS
                            </span>
                            {typeof wallet.page_number === "number" && (
                              <span className="font-mono text-[7px] tracking-wider text-slate-700">
                                · PAGE {wallet.page_number}
                              </span>
                            )}
                          </div>
                          {/* DATA QUALITY FLAGS */}
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {status.duplicate && (
                              <DataBadge
                                tone="amber"
                                icon={<CopyCheck size={8} />}
                              >
                                REPEATED ×{status.duplicateCount}
                              </DataBadge>
                            )}
                            {status.dummy && (
                              <DataBadge
                                tone="violet"
                                icon={<FlaskConical size={8} />}
                              >
                                TEST / DUMMY
                              </DataBadge>
                            )}
                            {wallet.ocr_corrected && (
                              <DataBadge
                                tone="amber"
                                title={
                                  wallet.raw_ocr_text
                                    ? `Original OCR text: ${wallet.raw_ocr_text}`
                                    : "Corrected from a likely OCR misread — verify against source evidence"
                                }
                              >
                                OCR CORRECTED · VERIFY
                              </DataBadge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* NETWORK */}
                    <td className="px-4 py-4.5">
                      <span
                        className={[
                          "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em]",
                          chain.badge,
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "h-1.5 w-1.5 rounded-full",
                            chain.dot,
                          ].join(" ")}
                        />
                        {wallet.chain}
                      </span>
                    </td>
                    {/* VALIDATION */}
                    <td className="px-4 py-4.5">
                      {wallet.valid === false ? (
                        <span className="inline-flex items-center gap-2 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-red-400">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-red-400/[0.06]">
                            <ShieldAlert size={11} />
                          </span>
                          FLAGGED
                        </span>
                      ) : status.dummy ? (
                        <span className="inline-flex items-center gap-2 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-violet-400">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-400/[0.05]">
                            <FlaskConical size={11} />
                          </span>
                          TEST DATA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-400/[0.06]">
                            <ShieldCheck size={11} />
                          </span>
                          VERIFIED
                        </span>
                      )}
                    </td>
                    {/* CONFIDENCE */}
                    <td className="px-4 py-4.5">
                      <ConfidenceBar value={confidence} />
                    </td>
                    {/* THREAT */}
                    <td className="px-4 py-4.5">
                      <RiskBar score={score} />
                    </td>
                    {/* ACTIONS */}
                    <td className="px-6 py-4.5">
                      <div className="flex justify-end gap-1.5 opacity-40 transition-opacity group-hover:opacity-100">
                        <ActionButton
                          title={
                            copied === wallet.address
                              ? "Copied"
                              : "Copy wallet address"
                          }
                          onClick={() => copyAddress(wallet.address)}
                          active={copied === wallet.address}
                        >
                          {copied === wallet.address ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                        </ActionButton>
                        <ActionButton
                          title="Open investigation graph"
                          onClick={() =>
                            console.log(
                              "Open graph investigation:",
                              wallet.address,
                            )
                          }
                        >
                          <Network size={12} />
                        </ActionButton>
                        <ActionButton
                          title="Inspect wallet intelligence"
                          onClick={() =>
                            console.log("Inspect wallet:", wallet.address)
                          }
                        >
                          <ChevronRight size={13} />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* =====================================================
            MOBILE / TABLET
            ===================================================== */}
        <div className="divide-y divide-white/[0.045] lg:hidden">
          {sortedWallets.map((wallet, index) => {
            const score = Number(wallet.risk_score ?? 0);
            const confidence = Math.min(
              100,
              Math.max(0, Number(wallet.confidence ?? 0)),
            );
            const chain = chainStyle(wallet.chain);
            const risk = riskConfig(score);
            const status = wallet.__status;
            const isExpanded = expanded === normalizeAddress(wallet.address);
            const walletKey = normalizeAddress(wallet.address);
            return (
              <div
                key={`${walletKey}-mobile-${index}`}
                className="relative p-5 transition-colors hover:bg-cyan-400/[0.012]"
              >
                {score >= 70 && (
                  <div
                    className={[
                      "absolute bottom-0 left-0 top-0 w-px",
                      score >= 90 ? "bg-red-500" : "bg-orange-400",
                    ].join(" ")}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : walletKey)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                          status.dummy
                            ? "border-violet-400/15 bg-violet-400/[0.025]"
                            : "border-cyan-400/10 bg-cyan-400/[0.025]",
                        ].join(" ")}
                      >
                        {status.dummy ? (
                          <FlaskConical
                            size={15}
                            className="text-violet-400/70"
                          />
                        ) : (
                          <WalletIcon size={15} className="text-cyan-400/80" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[10px] font-semibold text-slate-200">
                          {shortenAddress(wallet.address)}
                        </div>
                        <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.12em] text-slate-700">
                          WALLET ENTITY #{String(index + 1).padStart(2, "0")}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      className={[
                        "shrink-0 text-slate-700 transition-transform",
                        isExpanded ? "rotate-90" : "",
                      ].join(" ")}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[7px] font-bold uppercase tracking-wider",
                        chain.badge,
                      ].join(" ")}
                    >
                      <span
                        className={["h-1.5 w-1.5 rounded-full", chain.dot].join(
                          " ",
                        )}
                      />
                      {wallet.chain}
                    </span>
                    <span
                      className={[
                        "rounded-md border px-2 py-1 font-mono text-[7px] font-bold tracking-wider",
                        risk.bg,
                        risk.border,
                        risk.text,
                      ].join(" ")}
                    >
                      {risk.label} · {score}
                    </span>
                    {status.duplicate && (
                      <span className="rounded-md border border-amber-400/10 bg-amber-400/[0.025] px-2 py-1 font-mono text-[7px] font-bold tracking-wider text-amber-400">
                        REPEATED ×{status.duplicateCount}
                      </span>
                    )}
                    {status.dummy && (
                      <span className="rounded-md border border-violet-400/10 bg-violet-400/[0.025] px-2 py-1 font-mono text-[7px] font-bold tracking-wider text-violet-400">
                        TEST DATA
                      </span>
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.012] p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <MobileMetric
                        label="CONFIDENCE"
                        value={`${confidence}%`}
                      />
                      <MobileMetric label="RISK SCORE" value={`${score}/100`} />
                      <MobileMetric label="NETWORK" value={wallet.chain} />
                      <MobileMetric
                        label="VALIDATION"
                        value={
                          status.dummy
                            ? "TEST DATA"
                            : wallet.valid === false
                              ? "FLAGGED"
                              : "VERIFIED"
                        }
                      />
                      {status.duplicate && (
                        <MobileMetric
                          label="OCCURRENCES"
                          value={`${status.duplicateCount} RECORDS`}
                        />
                      )}
                    </div>
                    <div className="mt-4">
                      <p className="mb-2 font-mono text-[7px] uppercase tracking-[0.14em] text-slate-700">
                        FULL WALLET ADDRESS
                      </p>
                      <div className="break-all rounded-lg border border-white/[0.06] bg-black/20 p-3 font-mono text-[9px] leading-5 text-slate-400">
                        {wallet.address}
                      </div>
                    </div>
                    {wallet.raw_ocr_text && (
                      <div className="mt-4">
                        <p className="mb-2 font-mono text-[7px] uppercase tracking-[0.14em] text-slate-700">
                          ORIGINAL OCR VALUE
                        </p>
                        <div className="break-all rounded-lg border border-amber-400/10 bg-amber-400/[0.018] p-3 font-mono text-[9px] leading-5 text-amber-300/70">
                          {wallet.raw_ocr_text}
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => copyAddress(wallet.address)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-400/15 bg-cyan-400/[0.035] px-3 py-2.5 font-mono text-[8px] font-semibold tracking-wider text-cyan-400 transition hover:bg-cyan-400/[0.07]"
                      >
                        {copied === wallet.address ? (
                          <Check size={12} />
                        ) : (
                          <Copy size={12} />
                        )}
                        {copied === wallet.address ? "COPIED" : "COPY"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          console.log(
                            "Open graph investigation:",
                            wallet.address,
                          )
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.018] px-3 py-2.5 font-mono text-[8px] font-semibold tracking-wider text-slate-400 transition hover:bg-white/[0.04]"
                      >
                        <Network size={12} />
                        GRAPH
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* =====================================================
            FOOTER
            ===================================================== */}
        <div className="flex flex-col gap-2 border-t border-white/[0.07] bg-black/20 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex items-center gap-2">
            <Activity size={11} className="text-cyan-400/70" />
            <span className="font-mono text-[7px] uppercase tracking-[0.16em] text-slate-700">
              WALLET INTELLIGENCE SYNCHRONIZED
            </span>
          </div>
          <div className="font-mono text-[7px] tracking-[0.12em] text-slate-700">
            {uniqueWalletCount} UNIQUE · {wallets.length} EXTRACTED ·{" "}
            {duplicateOccurrences} REPEATED
          </div>
        </div>
      </div>
    </section>
  );
}
/* ===============================================================
   FORENSIC GRID
   =============================================================== */
function ForensicGrid() {
  return (
    <>
      <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-cyan-400/[0.025] blur-3xl" />
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
/* ===============================================================
   HEADER
   =============================================================== */
function WalletHeader({
  detected,
  unique,
  highRisk,
  critical,
}: {
  detected: number;
  unique: number;
  highRisk: number;
  critical: number;
}) {
  return (
    <div className="border-b border-white/[0.07] bg-white/[0.012] px-5 py-4 lg:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04]">
            <Fingerprint size={15} className="text-cyan-400" />
            <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_7px_rgba(34,211,238,.7)]" />
          </div>
          <div>
            <p className="font-mono text-[8px] font-semibold tracking-[0.22em] text-cyan-400/65">
              GATEKEEPER / WALLET ENGINE
            </p>
            <h2 className="mt-0.5 text-lg font-medium tracking-tight text-slate-100">
              Wallet Intelligence
            </h2>
            <p className="mt-0.5 text-[10px] leading-4 text-slate-600">
              Normalized blockchain identities recovered from digital evidence
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <SummaryBadge label="EXTRACTED" value={detected} accent="cyan" />
          <SummaryBadge label="UNIQUE" value={unique} accent="green" />
          <SummaryBadge label="HIGH RISK" value={highRisk} accent="red" />
          {critical > 0 && (
            <SummaryBadge label="CRITICAL" value={critical} accent="critical" />
          )}
        </div>
      </div>
    </div>
  );
}
/* ===============================================================
   OVERVIEW METRIC
   =============================================================== */
function OverviewMetric({
  label,
  value,
  icon,
  accent = "default",
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  accent?: "default" | "danger" | "warning" | "safe" | "cyan";
}) {
  const valueClass =
    accent === "danger"
      ? "text-red-400"
      : accent === "warning"
        ? "text-orange-400"
        : accent === "safe"
          ? "text-emerald-400"
          : accent === "cyan"
            ? "text-cyan-400"
            : "text-slate-100";
  return (
    <div className="min-w-0 border-r border-white/[0.07] px-4 py-3.5 last:border-r-0 lg:px-5">
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-700">{icon}</span>}
        <span className="truncate font-mono text-[7px] font-semibold tracking-[0.14em] text-slate-600">
          {label}
        </span>
      </div>
      <div
        className={[
          "mt-1.5 font-mono text-xl font-bold tracking-tight",
          valueClass,
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
/* ===============================================================
   QUALITY FLAG
   =============================================================== */
function QualityFlag({
  icon,
  label,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  tone: "amber" | "violet" | "red";
}) {
  const styles = {
    amber: "text-amber-400/75",
    violet: "text-violet-400/75",
    red: "text-red-400/75",
  };
  return (
    <div
      className={[
        "flex items-center gap-1.5 font-mono text-[7px] font-semibold tracking-[0.1em]",
        styles[tone],
      ].join(" ")}
    >
      {icon}
      <span>{label}</span>
      {detail && <span className="text-slate-700">· {detail}</span>}
    </div>
  );
}
/* ===============================================================
   DATA BADGE
   =============================================================== */
function DataBadge({
  children,
  icon,
  tone,
  title,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  tone: "amber" | "violet" | "red";
  title?: string;
}) {
  const styles = {
    amber: "border-amber-400/12 bg-amber-400/[0.025] text-amber-400/70",
    violet: "border-violet-400/12 bg-violet-400/[0.025] text-violet-400/70",
    red: "border-red-400/12 bg-red-400/[0.025] text-red-400/70",
  };
  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[6px] font-semibold tracking-[0.1em]",
        styles[tone],
      ].join(" ")}
    >
      {icon}
      {children}
    </span>
  );
}
/* ===============================================================
   TABLE HEADING
   =============================================================== */
function TableHeading({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[7px] font-semibold tracking-[0.16em] text-slate-700">
      {children}
    </span>
  );
}
/* ===============================================================
   SUMMARY BADGE
   =============================================================== */
function SummaryBadge({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "cyan" | "green" | "red" | "critical";
}) {
  const styles = {
    cyan: "border-cyan-400/10 bg-cyan-400/[0.025] text-cyan-400/80",
    green: "border-emerald-400/10 bg-emerald-400/[0.025] text-emerald-400/80",
    red: "border-orange-400/10 bg-orange-400/[0.025] text-orange-400/80",
    critical:
      "border-red-400/15 bg-red-400/[0.035] text-red-400 shadow-[0_0_12px_rgba(248,113,113,.04)]",
  };
  return (
    <div
      className={["rounded-lg border px-2.5 py-1.5", styles[accent]].join(" ")}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[7px] font-semibold tracking-[0.12em] opacity-60">
          {label}
        </span>
        <span className="font-mono text-[10px] font-bold">{value}</span>
      </div>
    </div>
  );
}
/* ===============================================================
   CONFIDENCE BAR
   =============================================================== */
function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="w-[145px]">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-slate-700">
          EXTRACTION
        </span>
        <span className="font-mono text-[8px] font-bold text-slate-400">
          {value}%
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.035]">
        <div
          className="h-full rounded-full bg-cyan-400/80 shadow-[0_0_7px_rgba(34,211,238,.25)] transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
/* ===============================================================
   RISK BAR
   =============================================================== */
function RiskBar({ score }: { score: number }) {
  const risk = riskConfig(score);
  return (
    <div className="w-[145px]">
      <div className="mb-1.5 flex items-center justify-between">
        <span
          className={[
            "font-mono text-[7px] font-bold tracking-[0.12em]",
            risk.text,
          ].join(" ")}
        >
          {risk.label}
        </span>
        <span className="font-mono text-[8px] font-bold text-slate-400">
          {score}/100
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.035]">
        <div
          className={[
            "h-full rounded-full transition-all duration-700",
            risk.bar,
            risk.glow,
          ].join(" ")}
          style={{
            width: `${Math.min(Math.max(score, 0), 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
/* ===============================================================
   ACTION BUTTON
   =============================================================== */
function ActionButton({
  children,
  onClick,
  title,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "flex h-7 w-7 items-center justify-center rounded-lg border transition-all",
        active
          ? "border-emerald-400/15 bg-emerald-400/[0.035] text-emerald-400"
          : "border-white/[0.06] bg-white/[0.012] text-slate-600 hover:border-cyan-400/15 hover:bg-cyan-400/[0.025] hover:text-cyan-400",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
/* ===============================================================
   MOBILE METRIC
   =============================================================== */
function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-slate-700">
        {label}
      </p>
      <p className="mt-1 font-mono text-[10px] font-bold text-slate-300">
        {value}
      </p>
    </div>
  );
}
/* ===============================================================
   FOOTER
   =============================================================== */
function PanelFooter({ text }: { text: string }) {
  return (
    <div className="relative border-t border-white/[0.07] bg-black/20 px-5 py-3">
      <div className="flex items-center justify-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
        <span className="font-mono text-[7px] tracking-[0.18em] text-slate-700">
          {text}
        </span>
      </div>
    </div>
  );
}
/* ===============================================================
   ADDRESS NORMALIZATION
   =============================================================== */
function normalizeAddress(address: string | undefined | null) {
  return String(address ?? "")
    .trim()
    .toLowerCase();
}
/* ===============================================================
   DUMMY / TEST WALLET DETECTION
   =============================================================== */
function isDummyWallet(address: string | undefined | null) {
  const value = normalizeAddress(address);
  if (!value) {
    return true;
  }
  /*
   * Explicit placeholder markers.
   */
  const dummyWords = [
    "dummy",
    "test",
    "testing",
    "sample",
    "example",
    "placeholder",
    "fake",
    "mock",
    "unknown",
    "yourwallet",
    "walletaddress",
  ];
  if (dummyWords.some((word) => value.includes(word))) {
    return true;
  }
  /*
   * Obvious zero / repeated-value addresses.
   */
  const stripped = value
    .replace(/^0x/, "")
    .replace(/^bitcoin:/, "")
    .replace(/^ethereum:/, "")
    .replace(/^tron:/, "");
  if (!stripped) {
    return true;
  }
  if (/^0+$/.test(stripped)) {
    return true;
  }
  if (/^f+$/.test(stripped)) {
    return true;
  }
  /*
   * Same character repeated for almost the entire address.
   *
   * This catches obvious synthetic values such as:
   * 0x111111111111111111...
   * 0xaaaaaaaaaaaaaaaaaa...
   */
  if (stripped.length >= 20 && new Set(stripped.split("")).size === 1) {
    return true;
  }
  /*
   * Common development/test patterns.
   */
  if (
    /^(0x)?1234567890/.test(value) ||
    /^(0x)?abcdef/.test(value) ||
    /^(0x)?deadbeef/.test(value)
  ) {
    return true;
  }
  return false;
}
/* ===============================================================
   ADDRESS FORMATTER
   =============================================================== */
function shortenAddress(address: string) {
  if (!address) {
    return "UNKNOWN ADDRESS";
  }
  if (address.length <= 24) {
    return address;
  }
  return `${address.slice(0, 12)}...${address.slice(-10)}`;
}
/* ===============================================================
   CHAIN STYLE
   =============================================================== */
function chainStyle(chain: string) {
  switch (String(chain ?? "").toLowerCase()) {
    case "bitcoin":
    case "btc":
      return {
        badge: "border-amber-400/15 bg-amber-400/[0.035] text-amber-300/80",
        dot: "bg-amber-400",
      };
    case "ethereum":
    case "eth":
      return {
        badge: "border-violet-400/15 bg-violet-400/[0.035] text-violet-300/80",
        dot: "bg-violet-400",
      };
    case "tron":
    case "trc20":
      return {
        badge: "border-red-400/15 bg-red-400/[0.035] text-red-300/80",
        dot: "bg-red-400",
      };
    case "solana":
    case "sol":
      return {
        badge: "border-cyan-400/15 bg-cyan-400/[0.035] text-cyan-300/80",
        dot: "bg-cyan-400",
      };
    default:
      return {
        badge: "border-white/[0.07] bg-white/[0.018] text-slate-400",
        dot: "bg-slate-600",
      };
  }
}
/* ===============================================================
   RISK CONFIG
   =============================================================== */
function riskConfig(score: number) {
  if (score >= 90) {
    return {
      label: "CRITICAL",
      text: "text-red-400",
      border: "border-red-400/18",
      bg: "bg-red-400/[0.035]",
      bar: "bg-red-400",
      glow: "shadow-[0_0_9px_rgba(248,113,113,.35)]",
    };
  }
  if (score >= 70) {
    return {
      label: "HIGH",
      text: "text-orange-400",
      border: "border-orange-400/18",
      bg: "bg-orange-400/[0.035]",
      bar: "bg-orange-400",
      glow: "shadow-[0_0_9px_rgba(251,146,60,.28)]",
    };
  }
  if (score >= 40) {
    return {
      label: "MEDIUM",
      text: "text-amber-400",
      border: "border-amber-400/15",
      bg: "bg-amber-400/[0.025]",
      bar: "bg-amber-400",
      glow: "",
    };
  }
  return {
    label: "LOW",
    text: "text-emerald-400",
    border: "border-emerald-400/12",
    bg: "bg-emerald-400/[0.025]",
    bar: "bg-emerald-400",
    glow: "",
  };
}
