"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Upload,
  ScanSearch,
  Wallet,
  Network,
  ShieldCheck,
  Globe,
  FileSearch,
  Link2,
  RefreshCw,
  Activity,
  Layers3,
  GitBranch,
  Target,
  Database,
  Search,
  ShieldAlert,
} from "lucide-react";
import InvestigationHeader from "./InvestigationHeader";
import InvestigationControls from "./InvestigationControls";
import InvestigationGraph from "./InvestigationGraph";
import NodeDetailsDrawer from "./NodeDetailsDrawer";
import RiskPanel from "./RiskPanel";
import EvidenceTimeline from "./EvidenceTimeline";
import EntityList from "./EntityList";
import CaseManager, { type InvestigationCase } from "./CaseManager";
interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}
interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  type: string;
  properties?: Record<string, any>;
}
interface InvestigationData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
type GraphFilter = "ALL" | "ETH" | "BTC";
const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");
function isInvestigationMetadataNode(node: GraphNode): boolean {
  const label = String(node?.label ?? "").toLowerCase();
  if (label === "investigation" || label === "case") {
    return true;
  }
  const labels = node?.properties?.labels;
  if (Array.isArray(labels)) {
    return labels.some(
      (value) =>
        String(value).toLowerCase() === "investigation" ||
        String(value).toLowerCase() === "case",
    );
  }
  return false;
}
export default function InvestigationWorkspace() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InvestigationData>({
    nodes: [],
    edges: [],
  });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphFilter, setGraphFilter] = useState<GraphFilter>("ALL");
  const [search, setSearch] = useState("");
  const [activeCase, setActiveCaseState] = useState<InvestigationCase | null>(
    null,
  );
  const [walletsVersion, setWalletsVersion] = useState(0);
  const [graphError, setGraphError] = useState<string | null>(null);
  const ACTIVE_CASE_STORAGE_KEY = "gatekeeper:activeCase";
  /*
   * ------------------------------------------------------------
   * ACTIVE CASE PERSISTENCE
   * ------------------------------------------------------------
   */
  function setActiveCase(nextCase: InvestigationCase | null) {
    setActiveCaseState(nextCase);
    try {
      if (nextCase) {
        localStorage.setItem(ACTIVE_CASE_STORAGE_KEY, JSON.stringify(nextCase));
      } else {
        localStorage.removeItem(ACTIVE_CASE_STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage failures.
    }
  }
  /*
   * Restore previously selected case.
   *
   * IMPORTANT:
   * The global graph can still be loaded if there is no case.
   */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_CASE_STORAGE_KEY);
      if (stored) {
        setActiveCaseState(JSON.parse(stored));
      }
    } catch {
      // Ignore malformed/unavailable localStorage data.
    }
  }, []);
  /*
   * ------------------------------------------------------------
   * GRAPH LOADING
   * ------------------------------------------------------------
   *
   * BEFORE:
   *
   * No active case -> clear graph
   *
   * NOW:
   *
   * No active case -> load GLOBAL graph
   *
   * Active case -> load CASE-SCOPED graph
   */
  useEffect(() => {
    setSelectedNode(null);
    setSearch("");
    setGraphFilter("ALL");
    if (activeCase) {
      loadGraph(String(activeCase.id));
    } else {
      loadGraph();
    }
  }, [activeCase?.id]);
  /*
   * ------------------------------------------------------------
   * LOAD GRAPH
   * ------------------------------------------------------------
   *
   * caseId provided:
   *
   * /api/graph?case_id=123
   *
   * caseId omitted:
   *
   * /api/graph
   *
   * The second form represents the existing/global topology.
   */
  async function loadGraph(caseId?: string) {
    try {
      setLoading(true);
      setGraphError(null);
      let url = `${API_BASE_URL}/api/graph`;
      if (caseId) {
        url += `?case_id=${encodeURIComponent(caseId)}`;
      }
      console.log(
        "[GATEKEEPER] Graph request:",
        url,
        caseId ? "(CASE-SCOPED)" : "(GLOBAL TOPOLOGY)",
      );
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
      const text = await response.text();
      let graph: any = null;
      try {
        graph = text ? JSON.parse(text) : null;
      } catch {
        graph = null;
      }
      if (!response.ok) {
        const backendMessage =
          graph?.detail ||
          graph?.message ||
          text ||
          `Graph request failed with HTTP ${response.status}`;
        throw new Error(backendMessage);
      }
      const rawNodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
      const rawEdges = Array.isArray(graph?.edges) ? graph.edges : [];
      /*
       * Remove Case / Investigation metadata nodes.
       * This keeps the topology focused on actual entities.
       */
      const nodes: GraphNode[] = rawNodes.filter(
        (node: GraphNode) => !isInvestigationMetadataNode(node),
      );
      /*
       * Only keep relationships where both endpoints
       * exist in the visible node set.
       */
      const nodeIds = new Set(nodes.map((node) => String(node.id)));
      const edges: GraphEdge[] = rawEdges.filter(
        (edge: GraphEdge) =>
          nodeIds.has(String(edge.source)) && nodeIds.has(String(edge.target)),
      );
      setData({
        nodes,
        edges,
      });
      console.log("[GATEKEEPER] Graph loaded:", {
        mode: caseId ? "CASE-SCOPED" : "GLOBAL",
        caseId: caseId ?? null,
        nodes: nodes.length,
        edges: edges.length,
      });
    } catch (error) {
      console.error("[GATEKEEPER] Graph loading failed:", error);
      /*
       * Do NOT destroy the previous graph immediately if a
       * refresh fails.
       *
       * This prevents the UI from becoming completely empty
       * because of a temporary backend/network problem.
       */
      setGraphError(
        error instanceof Error
          ? error.message
          : "Unable to load investigation graph",
      );
    } finally {
      setLoading(false);
    }
  }
  /*
   * ------------------------------------------------------------
   * DERIVED GRAPH DATA
   * ------------------------------------------------------------
   */
  const wallets = useMemo(() => {
    return data.nodes
      .filter(
        (node) =>
          !isInvestigationMetadataNode(node) && node.properties?.address,
      )
      .map((node) => String(node.properties.address));
  }, [data.nodes]);
  const suspiciousWallets = useMemo(() => {
    return data.nodes.filter((node) => {
      if (isInvestigationMetadataNode(node)) {
        return false;
      }
      return Number(node.properties?.risk_score ?? 0) >= 70;
    }).length;
  }, [data.nodes]);
  const riskScore = useMemo(() => {
    return data.nodes.reduce((max, node) => {
      if (isInvestigationMetadataNode(node)) {
        return max;
      }
      return Math.max(
        max,
        Number(
          node.properties?.risk_score ?? node.properties?.osint_confidence ?? 0,
        ),
      );
    }, 0);
  }, [data.nodes]);
  const osintMatches = useMemo(() => {
    return data.nodes.filter((node) => {
      if (isInvestigationMetadataNode(node)) {
        return false;
      }
      const properties = node.properties ?? {};
      return Boolean(
        properties.organization && properties.organization !== "Unknown",
      );
    }).length;
  }, [data.nodes]);
  /*
   * ------------------------------------------------------------
   * DEPTH STATISTICS
   * ------------------------------------------------------------
   */
  const depthStats = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const node of data.nodes) {
      if (isInvestigationMetadataNode(node)) {
        continue;
      }
      const rawDepth = node.properties?.depth;
      if (rawDepth === null || rawDepth === undefined) {
        continue;
      }
      const depth = Number(rawDepth);
      if (!Number.isFinite(depth)) {
        continue;
      }
      counts[depth] = (counts[depth] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([depth, count]) => ({
        depth: Number(depth),
        count,
      }))
      .sort((a, b) => a.depth - b.depth);
  }, [data.nodes]);
  const maxDepth = useMemo(() => {
    if (!depthStats.length) {
      return 0;
    }
    return Math.max(...depthStats.map((item) => item.depth));
  }, [depthStats]);
  const rootNodes = useMemo(() => {
    return depthStats.find((item) => item.depth === 0)?.count ?? 0;
  }, [depthStats]);
  const firstHopNodes = useMemo(() => {
    return depthStats.find((item) => item.depth === 1)?.count ?? 0;
  }, [depthStats]);
  const secondHopNodes = useMemo(() => {
    return depthStats.find((item) => item.depth === 2)?.count ?? 0;
  }, [depthStats]);
  /*
   * ------------------------------------------------------------
   * GRAPH FILTERING
   * ------------------------------------------------------------
   */
  const graphNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.nodes.filter((node) => {
      if (isInvestigationMetadataNode(node)) {
        return false;
      }
      const chain = String(node.properties?.chain ?? "").toLowerCase();
      const chainMatch =
        graphFilter === "ALL"
          ? true
          : graphFilter === "ETH"
            ? chain === "ethereum" || chain === "eth"
            : chain === "bitcoin" || chain === "btc";
      const searchableAddress = String(
        node.properties?.address ?? "",
      ).toLowerCase();
      const searchableId = String(node.id ?? "").toLowerCase();
      const searchableLabel = String(node.label ?? "").toLowerCase();
      const searchableFilename = String(
        node.properties?.filename ?? "",
      ).toLowerCase();
      const searchMatch = query
        ? searchableAddress.includes(query) ||
          searchableId.includes(query) ||
          searchableLabel.includes(query) ||
          searchableFilename.includes(query)
        : true;
      return chainMatch && searchMatch;
    });
  }, [data.nodes, graphFilter, search]);
  const graphEdges = useMemo(() => {
    const ids = new Set(graphNodes.map((node) => String(node.id)));
    return data.edges.filter(
      (edge) => ids.has(String(edge.source)) && ids.has(String(edge.target)),
    );
  }, [data.edges, graphNodes]);
  /*
   * ------------------------------------------------------------
   * TIMELINE
   * ------------------------------------------------------------
   */
  const timeline = useMemo(
    () => [
      {
        title: "Evidence Uploaded",
        description: "Media evidence received",
        completed: data.nodes.some(
          (node) => String(node.label).toLowerCase() === "media",
        ),
        icon: Upload,
      },
      {
        title: "OCR Extraction",
        description: "Text extracted from evidence",
        completed: wallets.length > 0,
        icon: ScanSearch,
      },
      {
        title: "Wallet Detection",
        description: `${wallets.length} wallet addresses detected`,
        completed: wallets.length > 0,
        icon: Wallet,
      },
      {
        title: "OSINT Intelligence",
        description:
          osintMatches > 0
            ? `${osintMatches} intelligence matches correlated`
            : "External intelligence correlated",
        completed: osintMatches > 0,
        icon: Globe,
      },
      {
        title: "Transaction Investigation",
        description: `${data.edges.length} transaction relationships`,
        completed: data.edges.length > 0,
        icon: Link2,
      },
      {
        title: "Graph Construction",
        description: `${data.nodes.length} entities mapped`,
        completed: data.nodes.length > 0,
        icon: Network,
      },
      {
        title: "Threat Assessment",
        description:
          suspiciousWallets > 0
            ? `${suspiciousWallets} high-risk entities identified`
            : "Forensic risk scoring completed",
        completed: data.nodes.length > 0,
        icon: ShieldCheck,
      },
      {
        title: "Forensic Analysis",
        description:
          maxDepth > 1
            ? `Multi-hop analysis completed through depth ${maxDepth}`
            : maxDepth === 1
              ? "Root and first-hop analysis completed"
              : "Awaiting topology investigation",
        completed: data.nodes.length > 0,
        icon: FileSearch,
      },
    ],
    [
      data.nodes,
      wallets.length,
      osintMatches,
      data.edges.length,
      suspiciousWallets,
      maxDepth,
    ],
  );
  /*
   * ------------------------------------------------------------
   * EMPTY GRAPH
   * ------------------------------------------------------------
   *
   * This now applies to BOTH:
   *
   * 1. global graph
   * 2. case graph
   *
   * but the message is different.
   */
  const showEmptyState = !loading && data.nodes.length === 0 && !graphError;
  /*
   * ------------------------------------------------------------
   * LOADING SCREEN
   * ------------------------------------------------------------
   */
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-120px)] bg-[#05080d]">
        <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#080d17]/90 px-8 py-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.07]">
              <RefreshCw
                size={22}
                strokeWidth={1.7}
                className="animate-spin text-cyan-300"
              />
            </div>
            <div className="mt-6 font-mono text-[11px] font-semibold tracking-[0.2em] text-cyan-300">
              GATEKEEPER / INVESTIGATION CORE
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-100">
              Initializing topology
            </h2>
            <p className="mt-2 text-[12px] leading-5 text-slate-400">
              {activeCase
                ? "Loading case-scoped forensic topology and intelligence data..."
                : "Loading existing forensic topology and intelligence data..."}
            </p>
            <div className="mx-auto mt-6 h-1 w-32 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-400" />
            </div>
            <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
              Establishing secure graph connection
            </div>
          </div>
        </div>
      </div>
    );
  }
  /*
   * ------------------------------------------------------------
   * MAIN WORKSPACE
   * ------------------------------------------------------------
   */
  return (
    <main className="min-w-0 space-y-4 bg-[#05080d] p-3 pb-12 text-white sm:p-6">
      <CaseManager
        activeCase={activeCase}
        onCaseChange={(selectedCase) => {
          setActiveCase(selectedCase);
        }}
        onWalletsChanged={() => setWalletsVersion((v) => v + 1)}
      />
      <InvestigationHeader
        caseId={
          activeCase ? `GK-${String(activeCase.id).padStart(4, "0")}` : "GLOBAL"
        }
        title={activeCase ? activeCase.name : "Global Forensic Topology"}
        status={activeCase ? activeCase.status : "GLOBAL"}
        analyst="Analyst_1"
        nodeCount={data.nodes.length}
        edgeCount={data.edges.length}
        onRefresh={() =>
          loadGraph(activeCase ? String(activeCase.id) : undefined)
        }
      />
      {/*
       * --------------------------------------------------------
       * GLOBAL / CASE CONTEXT BANNER
       * --------------------------------------------------------
       */}
      {!activeCase && (
        <section className="relative overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#080d17]/85 backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          <div className="flex items-start gap-4 px-5 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05]">
              <Network size={17} className="text-cyan-300" />
            </div>
            <div>
              <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-cyan-300">
                GLOBAL FORENSIC TOPOLOGY
              </div>
              <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-slate-500">
                Showing the existing Gatekeeper intelligence graph across
                discovered entities and blockchain relationships. Select or
                create an investigation case to switch to a case-scoped
                topology.
              </p>
            </div>
          </div>
        </section>
      )}
      {activeCase && (
        <section className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-[#080d17]/85 backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
          <div className="flex items-start gap-4 px-5 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.05]">
              <ShieldCheck size={17} className="text-violet-300" />
            </div>
            <div>
              <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-violet-300">
                CASE-SCOPED INVESTIGATION
              </div>
              <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-slate-500">
                Showing blockchain topology and intelligence entities associated
                with case{" "}
                <span className="font-mono text-violet-300">
                  GK-
                  {String(activeCase.id).padStart(4, "0")}
                </span>
                .
              </p>
            </div>
          </div>
        </section>
      )}
      <InvestigationControls
        activeCase={activeCase}
        walletsVersion={walletsVersion}
        onInvestigationComplete={() =>
          loadGraph(activeCase ? String(activeCase.id) : undefined)
        }
      />
      {/*
       * --------------------------------------------------------
       * GRAPH ERROR
       * --------------------------------------------------------
       */}
      {graphError && (
        <section className="relative overflow-hidden rounded-2xl border border-red-400/15 bg-red-400/[0.025] backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/40 to-transparent" />
          <div className="flex items-start gap-3 px-5 py-4">
            <ShieldAlert size={15} className="mt-0.5 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-red-300">
                GRAPH SYNCHRONIZATION FAILED
              </div>
              <div className="mt-1 break-words text-[11px] leading-5 text-slate-500">
                {graphError}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                loadGraph(activeCase ? String(activeCase.id) : undefined)
              }
              className="flex shrink-0 items-center gap-2 rounded-lg border border-red-400/20 bg-red-400/[0.05] px-3 py-2 font-mono text-[8px] font-bold tracking-widest text-red-300 transition hover:bg-red-400/[0.1]"
            >
              <RefreshCw size={11} />
              RETRY
            </button>
          </div>
        </section>
      )}
      {/*
       * --------------------------------------------------------
       * EMPTY GRAPH
       * --------------------------------------------------------
       */}
      {showEmptyState && (
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#080d17]/85 backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04]">
              <Network size={20} className="text-cyan-400/70" />
            </div>
            <div className="mt-4 font-mono text-[9px] font-bold tracking-[0.18em] text-slate-500">
              {activeCase ? "CASE GRAPH EMPTY" : "GLOBAL GRAPH EMPTY"}
            </div>
            <h3 className="mt-2 text-sm font-semibold text-slate-200">
              {activeCase
                ? "No case topology discovered yet"
                : "No existing topology discovered"}
            </h3>
            <p className="mt-2 max-w-md text-[11px] leading-5 text-slate-500">
              {activeCase ? (
                <>
                  Run a blockchain investigation from the controls above. The
                  resulting topology will automatically be associated with case{" "}
                  <span className="font-mono text-violet-300">
                    GK-
                    {String(activeCase.id).padStart(4, "0")}
                  </span>
                  .
                </>
              ) : (
                <>
                  Gatekeeper does not currently have any existing entities or
                  blockchain relationships available for the global topology.
                </>
              )}
            </p>
          </div>
        </section>
      )}
      {/*
       * --------------------------------------------------------
       * RISK PANEL
       * --------------------------------------------------------
       *
       * Shown for both global and case topology because
       * both are valid forensic datasets.
       */}
      <RiskPanel
        riskScore={riskScore}
        indicators={wallets.length}
        osintMatches={osintMatches}
        nodeCount={data.nodes.length}
        edgeCount={data.edges.length}
        suspiciousWallets={suspiciousWallets}
        transactions={data.edges.length}
      />
      {/*
       * --------------------------------------------------------
       * INVESTIGATION SCOPE
       * --------------------------------------------------------
       *
       * Scope makes most sense for an active case.
       * The global graph is not presented as a case investigation.
       */}
      {activeCase && (
        <InvestigationScope
          maxDepth={maxDepth}
          rootNodes={rootNodes}
          firstHopNodes={firstHopNodes}
          secondHopNodes={secondHopNodes}
          totalNodes={data.nodes.length}
          totalEdges={data.edges.length}
          depthStats={depthStats}
        />
      )}
      {/*
       * --------------------------------------------------------
       * TOPOLOGY COMMAND
       * --------------------------------------------------------
       */}
      <section className="relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080d17]/85 backdrop-blur-xl">
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="flex min-w-0 flex-col gap-4 border-b border-white/[0.07] bg-white/[0.015] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06]">
              <Activity size={15} strokeWidth={1.7} className="text-cyan-300" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[10px] font-semibold tracking-[0.18em] text-cyan-300">
                TOPOLOGY COMMAND
              </div>
              <div className="mt-1 truncate text-[13px] font-medium text-slate-200">
                {activeCase
                  ? "Case-scoped investigation entities"
                  : "Global forensic intelligence entities"}
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row">
            <div className="relative min-w-0 sm:w-[280px]">
              <Search
                size={15}
                strokeWidth={1.7}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search wallet address..."
                aria-label="Search wallet address"
                className="h-10 w-full rounded-xl border border-white/[0.10] bg-[#0b121e] pl-10 pr-3.5 font-mono text-[11px] text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>
            <div className="flex shrink-0 rounded-xl border border-white/[0.09] bg-[#0b121e] p-1">
              {(["ALL", "ETH", "BTC"] as const).map((type) => {
                const active = graphFilter === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setGraphFilter(type)}
                    className={`rounded-lg border px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.12em] transition-all ${
                      active
                        ? "border-cyan-400/25 bg-cyan-400/[0.12] text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                        : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.06] sm:grid-cols-4 sm:divide-y-0">
          <MiniStat label="VISIBLE NODES" value={graphNodes.length} />
          <MiniStat label="VISIBLE LINKS" value={graphEdges.length} />
          <MiniStat label="HIGH RISK" value={suspiciousWallets} danger />
          <MiniStat label="OSINT MATCHES" value={osintMatches} accent />
        </div>
      </section>
      {/*
       * --------------------------------------------------------
       * GRAPH
       * --------------------------------------------------------
       *
       * This is now available even when no case is selected.
       */}
      <InvestigationGraph
        nodes={graphNodes}
        edges={graphEdges}
        filter={graphFilter}
        onSelect={setSelectedNode}
      />
      {/*
       * --------------------------------------------------------
       * TIMELINE + ENTITY LIST
       * --------------------------------------------------------
       */}
      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080d17]/85 backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
          <EvidenceTimeline timeline={timeline} />
        </section>
        <section className="relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080d17]/85 backdrop-blur-xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
          <EntityList
            wallets={wallets}
            telegramUsers={[]}
            emails={[]}
            websites={[]}
            phones={[]}
          />
        </section>
      </div>
      {selectedNode && (
        <NodeDetailsDrawer
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </main>
  );
}
/*
 * ================================================================
 * INVESTIGATION SCOPE
 * ================================================================
 */
function InvestigationScope({
  maxDepth,
  rootNodes,
  firstHopNodes,
  secondHopNodes,
  totalNodes,
  totalEdges,
  depthStats,
}: {
  maxDepth: number;
  rootNodes: number;
  firstHopNodes: number;
  secondHopNodes: number;
  totalNodes: number;
  totalEdges: number;
  depthStats: {
    depth: number;
    count: number;
  }[];
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080d17]/85 backdrop-blur-xl">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/35 to-transparent" />
      <div className="flex flex-col gap-3 border-b border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/[0.06]">
            <Layers3 size={15} strokeWidth={1.7} className="text-violet-300" />
          </div>
          <div>
            <div className="font-mono text-[10px] font-semibold tracking-[0.18em] text-violet-300">
              INVESTIGATION SCOPE
            </div>
            <div className="mt-1 text-[13px] font-medium text-slate-200">
              Multi-hop forensic expansion
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] font-medium tracking-[0.15em] text-slate-500">
            MAX DEPTH
          </span>
          <span className="rounded-lg border border-violet-400/25 bg-violet-400/[0.07] px-2.5 py-1 font-mono text-[11px] font-bold text-violet-200">
            {maxDepth}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.06] sm:grid-cols-4 sm:divide-y-0">
        <ScopeMetric
          icon={<Target size={14} />}
          label="ROOT"
          value={rootNodes}
          description="Depth 0"
          accent="cyan"
        />
        <ScopeMetric
          icon={<GitBranch size={14} />}
          label="FIRST HOP"
          value={firstHopNodes}
          description="Depth 1"
          accent="violet"
        />
        <ScopeMetric
          icon={<Network size={14} />}
          label="SECOND HOP"
          value={secondHopNodes}
          description="Depth 2"
          accent="amber"
        />
        <ScopeMetric
          icon={<Database size={14} />}
          label="TOTAL ENTITIES"
          value={totalNodes}
          description={`${totalEdges} relationships`}
          accent="emerald"
        />
      </div>
      <div className="border-t border-white/[0.06] px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-slate-400">
            EXPANSION DISTRIBUTION
          </div>
          <div className="font-mono text-[9px] text-slate-500">
            {totalNodes} ENTITIES
          </div>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-black/50">
          {depthStats.map((item) => {
            const percentage =
              totalNodes > 0 ? (item.count / totalNodes) * 100 : 0;
            return (
              <div
                key={item.depth}
                title={`Depth ${item.depth}: ${item.count} nodes`}
                className={`h-full transition-all ${
                  item.depth === 0
                    ? "bg-cyan-400"
                    : item.depth === 1
                      ? "bg-violet-400"
                      : item.depth === 2
                        ? "bg-amber-400"
                        : "bg-slate-500"
                }`}
                style={{
                  width: `${percentage}%`,
                }}
              />
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {depthStats.map((item) => (
            <div key={item.depth} className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  item.depth === 0
                    ? "bg-cyan-400"
                    : item.depth === 1
                      ? "bg-violet-400"
                      : item.depth === 2
                        ? "bg-amber-400"
                        : "bg-slate-500"
                }`}
              />
              <span className="font-mono text-[9px] text-slate-400">
                DEPTH {item.depth}
              </span>
              <span className="font-mono text-[10px] font-bold text-slate-200">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
/*
 * ================================================================
 * SCOPE METRIC
 * ================================================================
 */
function ScopeMetric({
  icon,
  label,
  value,
  description,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  description: string;
  accent: "cyan" | "violet" | "amber" | "emerald";
}) {
  const accentClasses = {
    cyan: "text-cyan-300",
    violet: "text-violet-300",
    amber: "text-amber-300",
    emerald: "text-emerald-300",
  };
  return (
    <div className="min-w-0 px-5 py-4 transition-colors hover:bg-white/[0.02]">
      <div className="flex items-center gap-2">
        <span className={accentClasses[accent]}>{icon}</span>
        <span className="truncate font-mono text-[9px] font-semibold tracking-[0.14em] text-slate-400">
          {label}
        </span>
      </div>
      <div
        className={`mt-1.5 font-mono text-xl font-bold tracking-tight ${accentClasses[accent]}`}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[9px] tracking-wider text-slate-500">
        {description}
      </div>
    </div>
  );
}
/*
 * ================================================================
 * MINI STAT
 * ================================================================
 */
function MiniStat({
  label,
  value,
  danger = false,
  accent = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 px-5 py-4 transition-colors hover:bg-white/[0.02]">
      <div className="font-mono text-[9px] font-semibold tracking-[0.17em] text-slate-400">
        {label}
      </div>
      <div
        className={`mt-1.5 font-mono text-lg font-bold tracking-tight ${
          danger ? "text-red-300" : accent ? "text-cyan-300" : "text-slate-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
