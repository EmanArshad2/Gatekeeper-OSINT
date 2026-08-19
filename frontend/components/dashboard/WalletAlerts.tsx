"use client";
import { AlertTriangle, Wallet, ArrowUpRight, Activity } from "lucide-react";
interface WalletAlert {
  address: string;
  chain: string;
  risk?: number;
  risk_score?: number;
}
interface Props {
  alerts?: WalletAlert[];
}
export default function WalletAlerts({ alerts = [] }: Props) {
  const sortedAlerts = [...alerts]
    .sort(
      (a, b) =>
        Number(b.risk_score ?? b.risk ?? 0) -
        Number(a.risk_score ?? a.risk ?? 0),
    )
    .slice(0, 6);
  return (
    <section className="relative overflow-hidden">
      {/* ============================================================
          TOP TECHNICAL ACCENT
      ============================================================ */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />
      {/* ============================================================
          HEADER
      ============================================================ */}
      <div className="border-b border-white/[0.08] px-5 py-5 lg:px-6">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            {/* SECTION IDENTIFIER */}
            <div className="mb-2.5 flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-40" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-red-400" />
              </span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-red-300/85">
                Threat Monitor
              </span>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-100">
              Priority wallet alerts
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-400">
              Highest-risk blockchain entities detected across current
              intelligence sources.
            </p>
          </div>
          {/* ALERT COUNT */}
          <div className="shrink-0 border-l border-white/[0.08] pl-4 text-right">
            <div className="font-mono text-xl font-semibold leading-none text-red-300/90">
              {String(alerts.length).padStart(2, "0")}
            </div>
            <div className="mt-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-500">
              Alerts
            </div>
          </div>
        </div>
        {/* ============================================================
            QUEUE META
        ============================================================ */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Activity
              size={12}
              strokeWidth={1.7}
              className="shrink-0 text-red-400/80"
            />
            <span className="truncate font-mono text-[9px] font-medium uppercase tracking-[0.11em] text-slate-500">
              Risk-ranked intelligence queue
            </span>
          </div>
          <span className="shrink-0 font-mono text-[9px] font-semibold tracking-[0.09em] text-slate-500">
            {sortedAlerts.length.toString().padStart(2, "0")} ACTIVE
          </span>
        </div>
      </div>
      {/* ============================================================
          ALERT LIST
      ============================================================ */}
      <div className="divide-y divide-white/[0.07]">
        {sortedAlerts.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-400/[0.14] bg-emerald-400/[0.04] text-emerald-300/80">
              <Wallet size={18} strokeWidth={1.6} />
            </div>
            <strong className="text-sm font-semibold text-slate-200">
              No active wallet threats
            </strong>
            <span className="mt-1.5 max-w-[280px] text-xs leading-relaxed text-slate-500">
              Gatekeeper has not detected a high-risk wallet signal.
            </span>
            <div className="mt-4 flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.11em] text-emerald-400/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              System Nominal
            </div>
          </div>
        ) : (
          sortedAlerts.map((wallet, index) => {
            const risk = Number(wallet.risk_score ?? wallet.risk ?? 0);
            const level = risk >= 70 ? "HIGH" : risk >= 40 ? "MEDIUM" : "LOW";
            const levelStyles =
              level === "HIGH"
                ? {
                    border: "border-red-400/[0.18]",
                    bg: "bg-red-400/[0.06]",
                    text: "text-red-300/90",
                    dot: "bg-red-400",
                  }
                : level === "MEDIUM"
                  ? {
                      border: "border-amber-400/[0.18]",
                      bg: "bg-amber-400/[0.045]",
                      text: "text-amber-300/90",
                      dot: "bg-amber-400",
                    }
                  : {
                      border: "border-emerald-400/[0.14]",
                      bg: "bg-emerald-400/[0.04]",
                      text: "text-emerald-300/85",
                      dot: "bg-emerald-400",
                    };
            return (
              <div
                key={`${wallet.address}-${index}`}
                className="
                  group
                  relative
                  flex
                  items-center
                  gap-4
                  px-5
                  py-4
                  transition-colors
                  duration-200
                  hover:bg-white/[0.025]
                  lg:px-6
                "
              >
                {/* ==================================================
                    ROW ACCENT
                ================================================== */}
                <span
                  className={`absolute bottom-0 left-0 top-0 w-px ${
                    level === "HIGH"
                      ? "bg-red-400/80"
                      : level === "MEDIUM"
                        ? "bg-amber-400/60"
                        : "bg-transparent group-hover:bg-emerald-400/60"
                  }`}
                />
                {/* ==================================================
                    INDEX
                ================================================== */}
                <div className="hidden shrink-0 sm:block">
                  <span className="font-mono text-[9px] font-medium tracking-[0.08em] text-slate-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                {/* ==================================================
                    ALERT ICON
                ================================================== */}
                <div
                  className={`
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    border
                    ${
                      level === "HIGH"
                        ? "border-red-400/[0.18] bg-red-400/[0.055] text-red-300/90"
                        : level === "MEDIUM"
                          ? "border-amber-400/[0.18] bg-amber-400/[0.045] text-amber-300/85"
                          : "border-emerald-400/[0.14] bg-emerald-400/[0.04] text-emerald-300/80"
                    }
                  `}
                >
                  <AlertTriangle size={15} strokeWidth={1.6} />
                </div>
                {/* ==================================================
                    CONTENT
                ================================================== */}
                <div className="min-w-0 flex-1">
                  {/* CHAIN + RISK */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {wallet.chain?.toUpperCase() || "UNKNOWN"}
                    </span>
                    <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-slate-600" />
                    <span
                      className={`
                        rounded
                        border
                        px-2
                        py-0.5
                        font-mono
                        text-[9px]
                        font-semibold
                        tracking-[0.08em]
                        ${levelStyles.border}
                        ${levelStyles.bg}
                        ${levelStyles.text}
                      `}
                    >
                      {level}
                    </span>
                  </div>
                  {/* WALLET ADDRESS */}
                  <div
                    className="mt-1.5 truncate font-mono text-[11px] font-medium text-slate-300"
                    title={wallet.address}
                  >
                    {wallet.address}
                  </div>
                  {/* TELEMETRY */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.05em] text-slate-500">
                    <span>
                      Risk score{" "}
                      <strong className={`font-semibold ${levelStyles.text}`}>
                        {risk}
                      </strong>
                    </span>
                    <span className="text-slate-700">/</span>
                    <span>Wallet intelligence</span>
                  </div>
                </div>
                {/* ==================================================
                    SIGNAL
                ================================================== */}
                <div className="hidden shrink-0 items-center gap-3 md:flex">
                  <span
                    className={`relative flex h-1.5 w-1.5 ${
                      level === "HIGH" ? "animate-pulse" : ""
                    }`}
                  >
                    {level === "HIGH" && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-30" />
                    )}
                    <span
                      className={`relative h-1.5 w-1.5 rounded-full ${levelStyles.dot}`}
                    />
                  </span>
                  <Activity
                    size={13}
                    strokeWidth={1.5}
                    className={levelStyles.text}
                  />
                  <ArrowUpRight
                    size={14}
                    strokeWidth={1.5}
                    className="
                      text-slate-600
                      transition-all
                      duration-200
                      group-hover:-translate-y-0.5
                      group-hover:translate-x-0.5
                      group-hover:text-slate-400
                    "
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* ============================================================
          FOOTER TELEMETRY
      ============================================================ */}
      {sortedAlerts.length > 0 && (
        <div className="flex items-center justify-between border-t border-white/[0.07] bg-white/[0.018] px-5 py-2.5 lg:px-6">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.11em] text-slate-500">
            Priority queue
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.09em] text-red-300/80">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            Risk ranked
          </span>
        </div>
      )}
    </section>
  );
}
