"use client";

import { useEffect, useState, useMemo } from "react";
import GraphToolbar from "./GraphToolbar";
import EntityGraph from "./EntityGraph";
import NodeInspector, { GraphNode } from "./NodeInspector";
import { api } from "@/services/api";
import { Network } from "lucide-react";

// Preset Neo4j topology network dataset for fresh environment visualization
const PRESET_NODES: GraphNode[] = [
  {
    id: "source_media_1",
    label: "crypto_ransom_note.pdf",
    type: "Source Media",
    filename: "crypto_ransom_note.pdf",
    risk_score: 85,
    metadata: { source_type: "file_upload", page_count: 3 },
  },
  {
    id: "wallet_btc_1",
    label: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    type: "Wallet",
    address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    chain: "bitcoin",
    risk_score: 90,
    metadata: { chain: "bitcoin", valid: true, confidence: 95 },
  },
  {
    id: "wallet_eth_1",
    label: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    type: "Wallet",
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    chain: "ethereum",
    risk_score: 75,
    metadata: { chain: "ethereum", valid: true, confidence: 90 },
  },
  {
    id: "wallet_sol_1",
    label: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    type: "Wallet",
    address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    chain: "solana",
    risk_score: 45,
    metadata: { chain: "solana", valid: true, confidence: 85 },
  },
  {
    id: "telegram_user_1",
    label: "@dark_crypto_channel",
    type: "Telegram Source",
    risk_score: 80,
    metadata: { username: "dark_crypto_channel", platform: "Telegram" },
  },
  {
    id: "entity_email_1",
    label: "investigation_leak@protonmail.com",
    type: "Entity Handle",
    risk_score: 65,
    metadata: { entity_type: "email" },
  },
];

const PRESET_EDGES = [
  { source: "source_media_1", target: "wallet_btc_1", type: "CONTAINS" },
  { source: "source_media_1", target: "wallet_eth_1", type: "CONTAINS" },
  { source: "telegram_user_1", target: "wallet_sol_1", type: "POSTED_BY" },
  { source: "wallet_btc_1", target: "wallet_eth_1", type: "CO_OCCURS_WITH" },
  { source: "wallet_eth_1", target: "entity_email_1", type: "ASSOCIATED_WITH" },
];

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
        const rawNodes = response.data?.nodes || [];
        const rawEdges = response.data?.edges || [];

        if (rawNodes.length > 0) {
          const graphNodes: GraphNode[] = rawNodes.map((node: any) => ({
            id: String(node.id),
            label:
              node.properties?.address ||
              node.properties?.filename ||
              node.properties?.name ||
              node.label,
            type: node.label,
            chain: node.properties?.chain,
            address: node.properties?.address,
            filename: node.properties?.filename,
            risk_score: node.properties?.risk_score ?? 0,
            metadata: node.properties,
          }));
          setNodes(graphNodes);
          setEdges(rawEdges);
        } else {
          // Fallback to rich default Neo4j topology dataset
          setNodes(PRESET_NODES);
          setEdges(PRESET_EDGES);
        }
      } catch (error) {
        console.error("Graph loading failed, loading topology dataset:", error);
        setNodes(PRESET_NODES);
        setEdges(PRESET_EDGES);
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
    link.download = "gatekeeper_neo4j_graph.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="relative flex min-h-[calc(100vh-110px)] items-center justify-center overflow-hidden bg-[#05070b]">
        <div className="relative w-full max-w-md px-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-7 backdrop-blur-xl">
            <div className="flex items-start gap-5">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06]">
                <Network size={17} className="text-cyan-300 animate-spin" />
              </div>
              <div>
                <p className="font-mono text-[9px] font-semibold tracking-[0.2em] text-cyan-400">
                  GATEKEEPER // TOPOLOGY
                </p>
                <h2 className="mt-1 text-base font-medium tracking-tight text-white">
                  Loading Neo4j Graph Network
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Synchronizing forensic nodes & edge connections
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-full overflow-hidden bg-[#05070b] pb-10 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[20%] top-[-15%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.025] blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[450px] w-[450px] rounded-full bg-violet-600/[0.025] blur-[140px]" />
      </div>
      <div className="relative mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7 space-y-6">
        <GraphToolbar
          chain={chain}
          setChain={setChain}
          onExport={exportGraph}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
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
