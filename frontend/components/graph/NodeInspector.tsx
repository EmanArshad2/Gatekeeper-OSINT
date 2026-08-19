"use client";
import GKBadge from "@/components/common/GKBadge";
import GKEmpty from "@/components/common/GKEmpty";
import {
  ShieldAlert,
  Database,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from "lucide-react";
export interface GraphNode extends Record<string, unknown> {
  id: string;
  label: string;
  type: string;
  filename?: string;
  address?: string;
  chain?: string;
  valid?: boolean;
  confidence?: number;
  risk_score?: number;
  risk_level?: string;
  risk_reasons?: string;
  labels?: string[];
  connections?: number;
  metadata?: Record<string, unknown>;
}
interface NodeInspectorProps {
  node: GraphNode | null;
}
export default function NodeInspector({ node }: NodeInspectorProps) {
  if (!node) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-xl">
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="h-px w-3 bg-cyan-400/60" />
            <span className="font-mono text-[9px] font-semibold tracking-[0.2em] text-cyan-400">
              INSPECTOR // VAULT
            </span>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
            Node Inspector
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Entity intelligence details
          </p>
        </div>
        <div className="mt-6">
          <GKEmpty
            title="No Node Selected"
            description="Select a graph entity to inspect details."
            icon="🔎"
          />
        </div>
      </div>
    );
  }
  const risk = node.risk_score ?? 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-xl">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
              ACTIVE ENTITY
            </span>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
            Node Inspector
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Entity intelligence details
          </p>
        </div>
        <GKBadge>{node.type}</GKBadge>
      </div>
      {/* CONTENT BODY */}
      <div className="mt-6 space-y-5 border-t border-white/[0.06] pt-5 font-mono text-[10px]">
        <InfoRow label="NODE TYPE" value={node.label} />
        {node.filename && (
          <InfoRow label="EVIDENCE FILE" value={node.filename} mono highlight />
        )}
        {node.address && (
          <InfoRow label="WALLET ADDRESS" value={node.address} mono highlight />
        )}
        {node.chain && (
          <InfoRow label="BLOCKCHAIN" value={node.chain} uppercase />
        )}
        {node.valid !== undefined && (
          <InfoRow
            label="VALIDATION"
            value={node.valid ? "VALID" : "INVALID"}
            badge={node.valid ? "green" : "red"}
          />
        )}
        {node.confidence !== undefined && (
          <InfoRow label="CONFIDENCE" value={`${node.confidence}%`} />
        )}
        {node.risk_level && (
          <InfoRow label="RISK LEVEL" value={node.risk_level} uppercase />
        )}
        {/* RISK SCORE METER */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-slate-500 uppercase tracking-wider">
              Risk Score
            </span>
            <span
              className={`font-semibold ${
                risk >= 70
                  ? "text-red-400"
                  : risk >= 40
                    ? "text-amber-400"
                    : "text-emerald-400"
              }`}
            >
              {risk}/100
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                risk >= 70
                  ? "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.4)]"
                  : risk >= 40
                    ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                    : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]"
              }`}
              style={{
                width: `${Math.max(risk, 4)}%`,
              }}
            />
          </div>
        </div>
        {node.risk_reasons && (
          <div className="space-y-1.5">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">
              Risk Reasons
            </span>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-slate-300 leading-relaxed backdrop-blur-xl">
              {node.risk_reasons}
            </div>
          </div>
        )}
        {node.labels && node.labels.length > 0 && (
          <div className="space-y-2">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">
              Labels
            </span>
            <div className="flex flex-wrap gap-1.5">
              {node.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-1 text-[9px] text-cyan-300 backdrop-blur-xl"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <div className="space-y-2.5">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">
              Metadata Registry
            </span>
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {Object.entries(node.metadata).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 backdrop-blur-xl"
                >
                  <p className="text-[8px] text-slate-500 uppercase tracking-wider">
                    {key}
                  </p>
                  <p className="mt-1 break-all text-[11px] text-slate-200">
                    {String(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function InfoRow({
  label,
  value,
  mono,
  highlight,
  uppercase,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  uppercase?: boolean;
  badge?: "green" | "red";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[9px] text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      {badge ? (
        <span
          className={`rounded-md border px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] ${
            badge === "green"
              ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400"
              : "border-red-400/20 bg-red-400/[0.06] text-red-400"
          }`}
        >
          {value}
        </span>
      ) : (
        <span
          className={`max-w-[180px] truncate ${
            mono ? "font-mono" : ""
          } ${highlight ? "text-cyan-300" : "text-slate-200"} ${
            uppercase ? "uppercase" : ""
          }`}
          title={value}
        >
          {value}
        </span>
      )}
    </div>
  );
}
