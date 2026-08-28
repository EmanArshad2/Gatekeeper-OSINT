"use client";

import { useMemo, useState } from "react";
import { GraphNode } from "./NodeInspector";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Layers,
  Network,
  Share2,
} from "lucide-react";

interface EntityGraphProps {
  nodes: GraphNode[];
  edges: any[];
  onSelectNode: (node: GraphNode) => void;
}

export default function EntityGraph({
  nodes,
  edges,
  onSelectNode,
}: EntityGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  // Graph Display Options requested by user
  const [maxNodesLimit, setMaxNodesLimit] = useState<number>(10);
  const [filterType, setFilterType] = useState<string>("ALL");

  // Filter nodes based on user limits and type filter
  const visibleNodes = useMemo(() => {
    let filtered = nodes;
    if (filterType === "WALLETS_ONLY") {
      filtered = filtered.filter(
        (n) => n.type?.toLowerCase().includes("wallet") || n.address
      );
    } else if (filterType === "HIGH_RISK") {
      filtered = filtered.filter((n) => (n.risk_score ?? 0) >= 60);
    }
    return filtered.slice(0, maxNodesLimit);
  }, [nodes, filterType, maxNodesLimit]);

  // Multi-Depth Tiered Radial Layout Algorithm (Zero Clustering)
  const positionedNodes = useMemo(() => {
    if (!visibleNodes.length) return [];

    const width = 1200;
    const height = 750;
    const centerX = width / 2;
    const centerY = height / 2;

    // Categorize into depth tiers
    const rootNodes = visibleNodes.filter(
      (n, idx) => n.type?.toLowerCase().includes("source") || idx === 0
    );
    const primaryRoot = rootNodes[0] || visibleNodes[0];

    const tier1Wallets = visibleNodes.filter(
      (n) => n.id !== primaryRoot.id && (n.type?.toLowerCase().includes("wallet") || n.address)
    );

    const tier2Entities = visibleNodes.filter(
      (n) => n.id !== primaryRoot.id && !tier1Wallets.some((w) => w.id === n.id)
    );

    const result: (GraphNode & { x: number; y: number; isRoot?: boolean; depth: number })[] = [];

    // Depth 0: Primary Root Node at Exact Center
    result.push({
      ...primaryRoot,
      x: centerX,
      y: centerY,
      isRoot: true,
      depth: 0,
    });

    // Depth 1: Tier 1 Inner Ring (Radius 270px) for Wallets
    const t1Count = tier1Wallets.length;
    const t1Radius = 270;
    tier1Wallets.forEach((node, idx) => {
      const angle = (idx / (t1Count || 1)) * 2 * Math.PI - Math.PI / 2;
      result.push({
        ...node,
        x: centerX + t1Radius * Math.cos(angle),
        y: centerY + t1Radius * Math.sin(angle),
        depth: 1,
      });
    });

    // Depth 2: Tier 2 Outer Ring (Radius 420px) for Entities & Social Sources
    const t2Count = tier2Entities.length;
    const t2Radius = 430;
    tier2Entities.forEach((node, idx) => {
      const angle = (idx / (t2Count || 1)) * 2 * Math.PI - Math.PI / 4;
      result.push({
        ...node,
        x: centerX + t2Radius * Math.cos(angle),
        y: centerY + t2Radius * Math.sin(angle),
        depth: 2,
      });
    });

    return result;
  }, [visibleNodes]);

  // Create node lookup map
  const nodeMap = useMemo(() => {
    const map = new Map<string, (typeof positionedNodes)[0]>();
    for (const node of positionedNodes) {
      map.set(node.id, node);
    }
    return map;
  }, [positionedNodes]);

  // Visible Edges connecting visible nodes
  const visibleEdges = useMemo(() => {
    const nodeIds = new Set(positionedNodes.map((n) => n.id));
    return edges.filter(
      (e) => nodeIds.has(String(e.source)) && nodeIds.has(String(e.target))
    );
  }, [edges, positionedNodes]);

  // Dragging Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).tagName === "svg" ||
      (e.target as HTMLElement).tagName === "rect"
    ) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  function getRiskColor(score: number) {
    if (score >= 70) return "#f87171"; // Red
    if (score >= 40) return "#facc15"; // Yellow/Amber
    return "#34d399"; // Green
  }

  function getRiskLabel(score: number) {
    if (score >= 70) return "CRITICAL";
    if (score >= 40) return "MEDIUM";
    return "LOW";
  }

  return (
    <div className="space-y-3">
      {/* USER OPTIONS & TELEMETRY TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#070b12]/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-[9px] font-bold tracking-wider text-cyan-400">
            <Network size={14} />
            <span>DEPTH LAYOUT // SPRAY TOPOLOGY</span>
          </div>

          <div className="h-4 w-px bg-white/[0.08]" />

          {/* NODE LIMIT CONTROLS */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-slate-500">MAX NODES:</span>
            <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
              {[5, 10, 15, 20].map((limit) => (
                <button
                  key={limit}
                  onClick={() => setMaxNodesLimit(limit)}
                  className={`rounded-md px-2 py-0.5 font-mono text-[9px] transition-all ${
                    maxNodesLimit === limit
                      ? "bg-cyan-400/20 text-cyan-300 font-bold"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {limit}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-white/[0.08]" />

          {/* FILTER OPTIONS */}
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-white/[0.08] bg-[#05070b] px-2.5 py-1 font-mono text-[9px] text-slate-300 focus:border-cyan-400/40 focus:outline-none"
            >
              <option value="ALL">Show All Node Types</option>
              <option value="WALLETS_ONLY">Crypto Wallets Only</option>
              <option value="HIGH_RISK">High Risk (&ge; 60 Risk)</option>
            </select>
          </div>
        </div>

        {/* TELEMETRY BADGES */}
        <div className="flex items-center gap-3 font-mono text-[9px]">
          <span className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-1 text-cyan-300">
            INDEXED: {positionedNodes.length} NODES
          </span>
          <span className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-1 text-emerald-300">
            RELATIONSHIPS: {visibleEdges.length} EDGES
          </span>
        </div>
      </div>

      {/* SVG CIRCULAR GRAPH CANVAS */}
      <div
        className="relative h-[680px] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#05070b] shadow-2xl backdrop-blur-xl select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* BACKGROUND GRID & RADIAL GUIDE RINGS */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.02] blur-[150px]" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        </div>

        <svg
          className="h-full w-full cursor-grab active:cursor-grabbing"
          viewBox="0 0 1200 750"
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            <defs>
              <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="9" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* DEPTH TIER RADIAL GUIDELINE RINGS */}
            <circle
              cx="600"
              cy="375"
              r="270"
              fill="none"
              stroke="rgba(34,211,238,0.06)"
              strokeDasharray="4 6"
              strokeWidth="1.5"
            />
            <circle
              cx="600"
              cy="375"
              r="430"
              fill="none"
              stroke="rgba(34,211,238,0.04)"
              strokeDasharray="6 8"
              strokeWidth="1.5"
            />

            {/* RELATIONSHIP EDGES */}
            {visibleEdges.map((edge, idx) => {
              const sourceNode = nodeMap.get(String(edge.source));
              const targetNode = nodeMap.get(String(edge.target));
              if (!sourceNode || !targetNode) return null;

              const isHovered =
                hoveredNodeId === sourceNode.id || hoveredNodeId === targetNode.id;

              const midX = (sourceNode.x + targetNode.x) / 2;
              const midY = (sourceNode.y + targetNode.y) / 2;

              return (
                <g key={`edge-${idx}`}>
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={isHovered ? "#22d3ee" : "rgba(34, 211, 238, 0.28)"}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    strokeDasharray={edge.type === "CO_OCCURS_WITH" ? "5 5" : "none"}
                  />
                  {edge.type && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-40"
                        y="-9"
                        width="80"
                        height="18"
                        rx="5"
                        fill="#05070b"
                        stroke={isHovered ? "#22d3ee" : "rgba(255,255,255,0.12)"}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill={isHovered ? "#22d3ee" : "#94a3b8"}
                        fontSize="7.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {edge.type}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* CIRCULAR NODES */}
            {positionedNodes.map((node) => {
              const score = node.risk_score ?? 0;
              const color = getRiskColor(score);
              const isHovered = hoveredNodeId === node.id;
              const highRisk = score >= 70;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer"
                  onClick={() => onSelectNode(node)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {/* OUTER GLOW RING */}
                  <circle
                    r={isHovered ? "34" : "28"}
                    fill="none"
                    stroke={color}
                    strokeWidth={isHovered ? "3" : "1.8"}
                    strokeOpacity={isHovered ? "1" : "0.5"}
                    filter={highRisk ? "url(#glow-red)" : "url(#glow-cyan)"}
                  />

                  {/* INNER CIRCLE */}
                  <circle
                    r={isHovered ? "28" : "24"}
                    fill="#080e18"
                    stroke={color}
                    strokeWidth="1.5"
                  />

                  {/* THREAT ALERT BADGE */}
                  {highRisk && (
                    <g transform="translate(16, -16)">
                      <circle r="8" fill="#05070b" stroke="#f87171" strokeWidth="1.5" />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#f87171"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        !
                      </text>
                    </g>
                  )}

                  {/* CHAIN TAG */}
                  {node.chain && (
                    <g transform="translate(-26, -32)">
                      <rect
                        width="52"
                        height="13"
                        rx="3.5"
                        fill="#05070b"
                        stroke="rgba(255,255,255,0.18)"
                        strokeWidth="0.8"
                      />
                      <text
                        x="26"
                        y="9"
                        textAnchor="middle"
                        fill="#22d3ee"
                        fontSize="7"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {String(node.chain).toUpperCase()}
                      </text>
                    </g>
                  )}

                  {/* NODE LABEL */}
                  <text
                    y="42"
                    textAnchor="middle"
                    fill={isHovered ? "#ffffff" : "#cbd5e1"}
                    fontSize={isHovered ? "9.5" : "8.5"}
                    fontWeight={isHovered ? "700" : "500"}
                    fontFamily="monospace"
                  >
                    {node.label.length > 24
                      ? `${node.label.substring(0, 11)}...${node.label.substring(node.label.length - 8)}`
                      : node.label}
                  </text>

                  {/* RISK SCORE BADGE */}
                  <text
                    y="54"
                    textAnchor="middle"
                    fill={color}
                    fontSize="7.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {getRiskLabel(score)} {score}/100
                  </text>

                  {/* ROOT TAG FOR PRIMARY NODE */}
                  {node.isRoot && (
                    <g transform="translate(-32, -48)">
                      <rect
                        width="64"
                        height="13"
                        rx="4"
                        fill="rgba(34,211,238,0.18)"
                        stroke="#22d3ee"
                        strokeWidth="0.8"
                      />
                      <text
                        x="32"
                        y="9"
                        textAnchor="middle"
                        fill="#22d3ee"
                        fontSize="7"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        TARGET ROOT
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* OVERLAY STATUS */}
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#070b12]/90 px-3.5 py-2 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
          <span className="font-mono text-[9px] font-bold tracking-widest text-cyan-300">
            NEO4J RADIAL TOPOLOGY NETWORK
          </span>
        </div>

        {/* ZOOM CONTROLS */}
        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#070b12]/90 p-1.5 backdrop-blur-md">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
            title="Reset View"
          >
            <Maximize2 size={15} />
          </button>
        </div>

        {/* LEGEND */}
        <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.08] bg-[#070b12]/90 px-4 py-2.5 backdrop-blur-md font-mono text-[9px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            LOW RISK
          </div>
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#facc15]" />
            MEDIUM RISK
          </div>
          <div className="flex items-center gap-1.5 text-red-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_6px_#f87171]" />
            CRITICAL RISK
          </div>
        </div>
      </div>
    </div>
  );
}
