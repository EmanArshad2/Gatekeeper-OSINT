"use client";
import {
  ShieldAlert,
  Wallet,
  Search,
  Activity,
  ArrowUpRight,
} from "lucide-react";
interface ThreatMetricsProps {
  data?: {
    investigations?: number;
    wallets?: number;
    high_risk?: number;
    osint_matches?: number;
  };
}
export default function ThreatMetrics({ data = {} }: ThreatMetricsProps) {
  const metrics = [
    {
      title: "High-Risk Entities",
      value: data.high_risk ?? 0,
      description: "Entities requiring analyst attention",
      icon: ShieldAlert,
      code: "RISK // 01",
      tone: "red",
    },
    {
      title: "Tracked Wallets",
      value: data.wallets ?? 0,
      description: "Blockchain entities under monitoring",
      icon: Wallet,
      code: "WALLET // 02",
      tone: "cyan",
    },
    {
      title: "Active Investigations",
      value: data.investigations ?? 0,
      description: "Cases currently under analysis",
      icon: Search,
      code: "CASE // 03",
      tone: "cyan",
    },
    {
      title: "OSINT Correlations",
      value: data.osint_matches ?? 0,
      description: "External intelligence matches",
      icon: Activity,
      code: "OSINT // 04",
      tone: "green",
    },
  ] as const;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((item) => {
        const Icon = item.icon;
        const isRisk = item.tone === "red" && Number(item.value) > 0;
        const styles = {
          red: {
            border: "border-red-400/[0.16]",
            iconBorder: "border-red-400/[0.20]",
            iconBg: "bg-red-400/[0.055]",
            icon: "text-red-300",
            accent: "bg-red-400/70",
            glow: "bg-red-500/[0.035]",
            value: "text-slate-50",
            dot: "bg-red-400",
          },
          cyan: {
            border: "border-cyan-400/[0.13]",
            iconBorder: "border-cyan-400/[0.18]",
            iconBg: "bg-cyan-400/[0.045]",
            icon: "text-cyan-300",
            accent: "bg-cyan-400/70",
            glow: "bg-cyan-400/[0.025]",
            value: "text-slate-50",
            dot: "bg-cyan-400",
          },
          green: {
            border: "border-emerald-400/[0.13]",
            iconBorder: "border-emerald-400/[0.18]",
            iconBg: "bg-emerald-400/[0.045]",
            icon: "text-emerald-300",
            accent: "bg-emerald-400/70",
            glow: "bg-emerald-400/[0.025]",
            value: "text-slate-50",
            dot: "bg-emerald-400",
          },
        }[item.tone];
        return (
          <article
            key={item.title}
            className="
              group
              relative
              min-h-[205px]
              overflow-hidden
              rounded-xl
              border
              border-white/[0.08]
              bg-[#071019]/75
              p-5
              shadow-[0_18px_55px_rgba(0,0,0,0.18)]
              backdrop-blur-xl
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:bg-[#071019]/90
            "
          >
            {/* ========================================================
                TOP TECHNICAL ACCENT
            ======================================================== */}
            <div
              className={`
                pointer-events-none
                absolute
                left-0
                right-0
                top-0
                h-px
                opacity-70
                transition-opacity
                duration-300
                group-hover:opacity-100
                ${styles.accent}
              `}
            />
            {/* ========================================================
                CORNER MARKERS
            ======================================================== */}
            <span
              className={`
                pointer-events-none
                absolute
                left-0
                top-0
                h-6
                w-6
                border-l
                border-t
                ${styles.border}
              `}
            />
            <span
              className="
                pointer-events-none
                absolute
                bottom-0
                right-0
                h-6
                w-6
                border-b
                border-r
                border-white/[0.045]
              "
            />
            {/* ========================================================
                AMBIENT GLOW
            ======================================================== */}
            <div
              className={`
                pointer-events-none
                absolute
                -right-16
                -top-16
                h-36
                w-36
                rounded-full
                blur-[75px]
                ${styles.glow}
              `}
            />
            {/* ========================================================
                HEADER
            ======================================================== */}
            <div className="relative flex items-start justify-between gap-4">
              {/* ICON */}
              <div
                className={`
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  ${styles.iconBorder}
                  ${styles.iconBg}
                  ${styles.icon}
                `}
              >
                <Icon size={18} strokeWidth={1.6} />
              </div>
              {/* MODULE CODE */}
              <div className="flex items-center gap-2">
                <span
                  className="
                    font-mono
                    text-[9px]
                    font-medium
                    tracking-[0.13em]
                    text-slate-500
                  "
                >
                  {item.code}
                </span>
                <ArrowUpRight
                  size={12}
                  strokeWidth={1.5}
                  className="
                    text-slate-600
                    opacity-70
                    transition-all
                    duration-200
                    group-hover:-translate-y-0.5
                    group-hover:translate-x-0.5
                    group-hover:text-slate-400
                  "
                />
              </div>
            </div>
            {/* ========================================================
                VALUE
            ======================================================== */}
            <div
              className={`
                relative
                mt-6
                font-mono
                text-[32px]
                font-semibold
                leading-none
                tracking-[-0.045em]
                ${styles.value}
              `}
            >
              {item.value}
            </div>
            {/* ========================================================
                TITLE
            ======================================================== */}
            <div
              className="
                relative
                mt-3
                text-[13px]
                font-semibold
                leading-tight
                tracking-tight
                text-slate-200
              "
            >
              {item.title}
            </div>
            {/* ========================================================
                DESCRIPTION
            ======================================================== */}
            <div
              className="
                relative
                mt-1.5
                max-w-[230px]
                text-[11px]
                leading-[1.5]
                text-slate-500
              "
            >
              {item.description}
            </div>
            {/* ========================================================
                STATUS FOOTER
            ======================================================== */}
            {isRisk ? (
              <div
                className="
                  relative
                  mt-5
                  flex
                  items-center
                  justify-between
                  border-t
                  border-red-400/[0.12]
                  pt-3
                "
              >
                <span
                  className="
                    flex
                    items-center
                    gap-2
                    font-mono
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.1em]
                    text-red-300
                  "
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span
                      className="
                        absolute
                        inline-flex
                        h-full
                        w-full
                        animate-ping
                        rounded-full
                        bg-red-400
                        opacity-40
                      "
                    />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-red-400" />
                  </span>
                  Attention required
                </span>
                <span
                  className="
                    font-mono
                    text-[9px]
                    font-semibold
                    tracking-[0.1em]
                    text-red-300
                  "
                >
                  ACTIVE
                </span>
              </div>
            ) : (
              <div
                className="
                  relative
                  mt-5
                  flex
                  items-center
                  justify-between
                  border-t
                  border-white/[0.07]
                  pt-3
                "
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`
                      h-1.5
                      w-1.5
                      rounded-full
                      ${styles.dot}
                    `}
                  />
                  <span
                    className="
                      font-mono
                      text-[9px]
                      font-medium
                      uppercase
                      tracking-[0.1em]
                      text-slate-500
                    "
                  >
                    Monitoring
                  </span>
                </span>
                <span
                  className="
                    font-mono
                    text-[9px]
                    font-medium
                    tracking-[0.08em]
                    text-slate-500
                  "
                >
                  ONLINE
                </span>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
