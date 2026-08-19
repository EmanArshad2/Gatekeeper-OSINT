"use client";
import { Download, Database, Network } from "lucide-react";
interface Props {
  nodes: any[];
  edges: any[];
  caseId?: string;
}
export default function ExportTopology({
  nodes,
  edges,
  caseId = "GK-0001",
}: Props) {
  function exportTopology() {
    const report = {
      case_id: caseId,
      exported_at: new Date().toISOString(),
      statistics: {
        nodes: nodes.length,
        edges: edges.length,
      },
      topology: {
        nodes,
        edges,
      },
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${caseId}_investigation_topology.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  return (
    <button
      onClick={exportTopology}
      className="
        group
        relative
        flex
        h-9
        items-center
        gap-2
        overflow-hidden
        rounded-xl
        border
        border-cyan-400/20
        bg-cyan-400/[0.06]
        px-3.5
        font-mono
        text-[9px]
        font-semibold
        uppercase
        tracking-[0.14em]
        text-cyan-300
        backdrop-blur-xl
        transition-all
        duration-200
        hover:border-cyan-400/40
        hover:bg-cyan-400/[0.1]
        hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]
        active:scale-[0.98]
      "
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <Download
        size={13}
        strokeWidth={1.8}
        className="transition-transform duration-200 group-hover:translate-y-0.5"
      />
      <span>Export Topology</span>
    </button>
  );
}
