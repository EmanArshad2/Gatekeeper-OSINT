"use client";
import { useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GraphNode } from "./NodeInspector";
interface EntityGraphProps {
  nodes: GraphNode[];
  edges: any[];
  onSelectNode: (node: GraphNode) => void;
}
function GKNode({ data }: NodeProps) {
  const node = data as GraphNode;
  const risk = node.risk_score ?? 0;
  return (
    <div
      className="
        group
        relative
        min-w-[240px]
        overflow-hidden
        rounded-2xl
        border
        border-white/[0.08]
        bg-white/[0.025]
        p-4
        backdrop-blur-xl
        transition-all
        duration-300
        hover:border-cyan-400/30
        hover:bg-white/[0.045]
        hover:-translate-y-0.5
      "
    >
      {/* Ambient glow */}
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-cyan-400/[0.035] blur-xl transition-all duration-500 group-hover:scale-150" />
      {/* Top accent */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
      <Handle
        type="target"
        position={Position.Top}
        className="!border-cyan-400/40 !bg-[#05070b] !w-2 !h-2"
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
            {node.type || "FORENSIC ENTITY"}
          </span>
          <h3 className="mt-1 text-xs font-semibold tracking-tight text-white">
            {node.label}
          </h3>
        </div>
        {node.risk_score !== undefined && (
          <span
            className={`rounded-md border px-1.5 py-0.5 font-mono text-[7px] font-semibold uppercase tracking-[0.1em] ${
              risk >= 70
                ? "border-red-400/20 bg-red-400/[0.06] text-red-400"
                : risk >= 40
                  ? "border-amber-400/20 bg-amber-400/[0.06] text-amber-400"
                  : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400"
            }`}
          >
            RISK {risk}
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-2.5 font-mono text-[9px]">
        {node.filename && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">FILE</span>
            <span
              className="max-w-[150px] truncate text-slate-300"
              title={node.filename}
            >
              {node.filename}
            </span>
          </div>
        )}
        {node.address && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">ADDRESS</span>
            <span
              className="max-w-[150px] truncate text-cyan-300"
              title={node.address}
            >
              {node.address}
            </span>
          </div>
        )}
        {node.chain && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">CHAIN</span>
            <span className="text-slate-300 uppercase">{node.chain}</span>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!border-cyan-400/40 !bg-[#05070b] !w-2 !h-2"
      />
    </div>
  );
}
const nodeTypes = {
  forensic: GKNode,
};
export default function EntityGraph({
  nodes,
  edges,
  onSelectNode,
}: EntityGraphProps) {
  const flowNodes: Node[] = useMemo(
    () =>
      nodes.map((node, index) => ({
        id: node.id,
        type: "forensic",
        position: {
          x: (index % 3) * 320,
          y: Math.floor(index / 3) * 240,
        },
        data: node as unknown as Record<string, unknown>,
      })),
    [nodes],
  );
  const flowEdges: Edge[] = useMemo(
    () =>
      edges.map((edge, index) => ({
        id: `edge-${index}`,
        source: String(edge.source),
        target: String(edge.target),
        label: edge.type,
        animated: true,
        style: { stroke: "rgba(34, 211, 238, 0.3)", strokeWidth: 1.5 },
        labelStyle: { fill: "#94a3b8", fontFamily: "monospace", fontSize: 8 },
        labelBgStyle: { fill: "#05070b", fillOpacity: 0.8 },
      })),
    [edges],
  );
  if (!nodes.length) {
    return (
      <div className="relative flex h-[650px] items-center justify-center overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl">
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        <div className="text-center font-mono text-[10px] tracking-[0.15em] text-slate-500">
          GRAPH VAULT // NO NODES INDEXED
        </div>
      </div>
    );
  }
  return (
    <div className="relative h-[650px] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent z-10" />
      <ReactFlowProvider>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          onNodeClick={(_, node) => {
            onSelectNode(node.data as unknown as GraphNode);
          }}
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="rgba(255, 255, 255, 0.03)" gap={32} size={1} />
          <MiniMap
            style={{
              backgroundColor: "#05070b",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              borderRadius: "12px",
            }}
            nodeColor="rgba(34, 211, 238, 0.4)"
            maskColor="rgba(5, 7, 11, 0.85)"
          />
          <Controls
            style={{
              display: "flex",
              gap: "4px",
              padding: "4px",
              background: "rgba(255, 255, 255, 0.02)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              borderRadius: "12px",
            }}
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
