"use client";
import { useEffect, useState, useMemo } from "react";
import GraphToolbar from "./GraphToolbar";
import EntityGraph from "./EntityGraph";
import NodeInspector, { GraphNode } from "./NodeInspector";
import { api } from "@/services/api";
import { Network, Database, ShieldAlert, Cpu } from "lucide-react";
export default function GraphWorkspace() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [chain, setChain] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function loadGraph() {
      try {
        const response = await api.get("/graph");
        const graphNodes: GraphNode[] = (response.data.nodes || []).map(
          (node: any) => ({
            id: String(node.id),
            label:
              node.properties?.address ||
              node.properties?.filename ||
              node.properties?.name ||
              node.label,
            type: node.label,
            chain: node.properties?.chain,
            risk_score: node.properties?.risk_score ?? 0,
            metadata: node.properties,
          }),
        );
        setNodes(graphNodes);
        setEdges(response.data.edges || []);
      } catch (error) {
        console.error("Graph loading failed:", error);
        setNodes([]);
        setEdges([]);
      } finally {
        setLoading(false);
      }
    }
    loadGraph();
  }, []);
  // Filter nodes based on chain selection and search query
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      // Chain filter
      if (chain !== "ALL") {
        const nodeChain = node.chain ? String(node.chain).toUpperCase() : "";
        if (nodeChain !== chain.toUpperCase()) {
          return false;
        }
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = node.label?.toLowerCase().includes(q);
        const matchesType = node.type?.toLowerCase().includes(q);
        const matchesAddress = node.address?.toLowerCase().includes(q);
        const matchesFilename = node.filename?.toLowerCase().includes(q);
        if (
          !matchesLabel &&
          !matchesType &&
          !matchesAddress &&
          !matchesFilename
        ) {
          return false;
        }
      }
      return true;
    });
  }, [nodes, chain, searchQuery]);
  // Filter edges to only include those where both source and target exist in filteredNodes
  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter(
      (edge) =>
        nodeIds.has(String(edge.source)) && nodeIds.has(String(edge.target)),
    );
  }, [edges, filteredNodes]);
  function exportGraph() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            nodes: filteredNodes,
            edges: filteredEdges,
          },
          null,
          2,
        ),
      ],
      {
        type: "application/json",
      },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gatekeeper_graph.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  if (loading) {
    return (
      <div className="relative flex min-h-[calc(100vh-110px)] items-center justify-center overflow-hidden bg-[#05070b]">
        {/* ============================================================
            LOADING ATMOSPHERE
        ============================================================ */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.035] blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        </div>
        <div className="relative w-full max-w-md px-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-7 backdrop-blur-xl">
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            <div className="flex items-start gap-5">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06]">
                <div className="absolute inset-2 animate-spin rounded-full border border-cyan-400/10 border-t-cyan-400/70" />
                <Network
                  size={17}
                  strokeWidth={1.6}
                  className="text-cyan-300"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  </span>
                  <p className="font-mono text-[9px] font-semibold tracking-[0.2em] text-cyan-400">
                    GATEKEEPER // TOPOLOGY
                  </p>
                </div>
                <h2 className="mt-2 text-base font-medium tracking-tight text-white">
                  Loading graph network
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Synchronizing Neo4j forensic nodes & edges
                </p>
              </div>
            </div>
            <div className="mt-7 space-y-2">
              <div className="flex items-center justify-between font-mono text-[8px] tracking-wider">
                <span className="text-slate-600">GRAPH DATABASE</span>
                <span className="text-cyan-400">CONNECTING</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-cyan-400/20 via-cyan-400/60 to-cyan-400/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <main className="relative min-h-full overflow-hidden bg-[#05070b] pb-10 text-white">
      {/* ============================================================
          WORKSPACE ATMOSPHERE
      ============================================================ */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[20%] top-[-15%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.025] blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[450px] w-[450px] rounded-full bg-violet-600/[0.025] blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      </div>
      <div className="relative mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7 space-y-6">
        {/* GRAPH TOOLBAR */}
        <GraphToolbar
          chain={chain}
          setChain={setChain}
          onExport={exportGraph}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        {/* MAIN GRID */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          <div className="xl:col-span-3">
            <EntityGraph
              nodes={filteredNodes}
              edges={filteredEdges}
              onSelectNode={setSelectedNode}
            />
          </div>
          <div className="xl:col-span-1">
            <NodeInspector node={selectedNode} />
          </div>
        </div>
      </div>
    </main>
  );
}
