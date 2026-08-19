"use client";
import {
  AlertTriangle,
  Bitcoin,
  CircleDot,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Handle, Position } from "reactflow";
interface GraphNodeProps {
  data: {
    label?: string;
    properties?: Record<string, any>;
    selected?: boolean;
  };
  selected?: boolean;
}
export default function GraphNode({ data, selected = false }: GraphNodeProps) {
  const properties = data?.properties ?? {};
  const address = properties.address || data?.label || "Unknown Entity";
  const chain = String(properties.chain || "Unknown").toLowerCase();
  const entityType = properties.entity_type || "Wallet";
  const organization = properties.organization || "Unknown";
  const riskScore = Number(properties.risk_score || 0);
  const depth = Number(properties.depth ?? 0);
  const isCritical = riskScore >= 90;
  const isHighRisk = riskScore >= 70;
  const isMediumRisk = riskScore >= 40;
  const riskLabel = isCritical
    ? "CRITICAL"
    : isHighRisk
      ? "HIGH"
      : isMediumRisk
        ? "MEDIUM"
        : "LOW";
  const riskClasses = isCritical
    ? {
        text: "text-red-400",
        border: "border-red-500/40",
        bg: "bg-red-500/[0.08]",
        bar: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
        glow: "shadow-[0_0_25px_rgba(239,68,68,0.18)]",
      }
    : isHighRisk
      ? {
          text: "text-orange-400",
          border: "border-orange-500/35",
          bg: "bg-orange-500/[0.07]",
          bar: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]",
          glow: "shadow-[0_0_22px_rgba(249,115,22,0.14)]",
        }
      : isMediumRisk
        ? {
            text: "text-amber-400",
            border: "border-amber-500/30",
            bg: "bg-amber-500/[0.06]",
            bar: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
            glow: "shadow-[0_0_18px_rgba(245,158,11,0.10)]",
          }
        : {
            text: "text-emerald-400",
            border: "border-emerald-500/25",
            bg: "bg-emerald-500/[0.05]",
            bar: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
            glow: "",
          };
  const chainLabel =
    chain === "ethereum"
      ? "ETH"
      : chain === "bitcoin"
        ? "BTC"
        : chain === "tron"
          ? "TRX"
          : chain === "solana"
            ? "SOL"
            : chain === "litecoin"
              ? "LTC"
              : chain === "ripple"
                ? "XRP"
                : chain.toUpperCase();
  const chainIcon =
    chain === "bitcoin" ? (
      <Bitcoin size={11} strokeWidth={1.8} />
    ) : (
      <Wallet size={11} strokeWidth={1.8} />
    );
  const shortenedAddress =
    address.length > 18
      ? `${address.slice(0, 9)}...${address.slice(-7)}`
      : address;
  return (
    <div className="relative">
      {/* Incoming connection handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-[#070b12] !bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
      />
      {/* Main node */}
      <div
        className={`
          group
          relative
          w-[240px]
          overflow-hidden
          rounded-2xl
          border
          bg-white/[0.025]
          text-slate-200
          backdrop-blur-xl
          transition-all
          duration-200
          ${
            selected
              ? "border-cyan-400/80 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
              : "border-white/[0.07]"
          }
          ${!selected ? riskClasses.glow : ""}
          hover:border-cyan-400/40
        `}
      >
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        {/* Top telemetry line */}
        <div className="flex h-1 w-full bg-white/[0.05]">
          <div className={`h-full flex-1 ${riskClasses.bar}`} />
          <div className="h-full w-10 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
        </div>
        {/* Critical/high-risk pulse indicator */}
        {isHighRisk && (
          <span
            className={`
              absolute
              right-3.5
              top-3.5
              h-2
              w-2
              rounded-full
              ${isCritical ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]" : "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]"}
              ${isCritical ? "animate-pulse" : ""}
            `}
          />
        )}
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={`
                flex
                h-7
                w-7
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                backdrop-blur-xl
                ${riskClasses.border}
                ${riskClasses.bg}
                ${riskClasses.text}
              `}
            >
              {isHighRisk ? (
                <ShieldAlert size={13} strokeWidth={1.8} />
              ) : (
                <ShieldCheck size={13} strokeWidth={1.8} />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Entity Node
              </p>
              <p className="truncate text-xs font-semibold tracking-tight text-slate-200">
                {entityType}
              </p>
            </div>
          </div>
          {/* Chain badge */}
          <span className="ml-2 flex shrink-0 items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-1 font-mono text-[8px] font-semibold tracking-wider text-cyan-300">
            {chainIcon}
            {chainLabel}
          </span>
        </div>
        {/* Address */}
        <div className="px-4 pt-3.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Address
            </span>
            <ExternalLink
              size={11}
              className="text-slate-500 transition-colors group-hover:text-cyan-400"
            />
          </div>
          <p
            title={address}
            className="mt-1 truncate font-mono text-[10px] text-slate-300"
          >
            {shortenedAddress}
          </p>
        </div>
        {/* Risk section */}
        <div className="px-4 pt-3.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-slate-500">
              Risk Assessment
            </span>
            <span
              className={`
                rounded-md
                border
                px-1.5
                py-0.5
                font-mono
                text-[7px]
                font-bold
                uppercase
                tracking-wider
                ${riskClasses.border}
                ${riskClasses.bg}
                ${riskClasses.text}
              `}
            >
              {riskLabel}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full transition-all ${riskClasses.bar}`}
                style={{
                  width: `${Math.min(Math.max(riskScore, 0), 100)}%`,
                }}
              />
            </div>
            <span
              className={`w-8 text-right font-mono text-[9px] font-bold ${riskClasses.text}`}
            >
              {riskScore}
            </span>
          </div>
        </div>
        {/* Intelligence metadata */}
        <div className="mt-3.5 grid grid-cols-2 border-t border-white/[0.06] bg-white/[0.015]">
          <div className="min-w-0 border-r border-white/[0.06] px-4 py-2.5">
            <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-slate-500">
              Organization
            </p>
            <p
              title={organization}
              className="mt-1 truncate text-[9px] font-medium text-slate-300"
            >
              {organization}
            </p>
          </div>
          <div className="px-4 py-2.5">
            <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-slate-500">
              Graph Depth
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <CircleDot size={9} className="text-cyan-400" />
              <span className="font-mono text-[9px] font-semibold text-slate-300">
                L{depth}
              </span>
            </div>
          </div>
        </div>
        {/* Threat indicator banner */}
        {isHighRisk && (
          <div
            className={`
              flex
              items-center
              gap-2
              border-t
              px-4
              py-2.5
              ${riskClasses.border}
              ${riskClasses.bg}
            `}
          >
            <AlertTriangle size={11} className={riskClasses.text} />
            <span
              className={`
                font-mono
                text-[8px]
                font-semibold
                uppercase
                tracking-[0.12em]
                ${riskClasses.text}
              `}
            >
              {isCritical
                ? "Critical Threat Signature"
                : "High-Risk Entity Detected"}
            </span>
          </div>
        )}
        {/* Selected state ring */}
        {selected && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-cyan-400/40" />
        )}
      </div>
      {/* Outgoing connection handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-[#070b12] !bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
      />
    </div>
  );
}
