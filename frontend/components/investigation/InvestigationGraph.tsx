"use client";
import { useEffect, useMemo, useState } from "react";
interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}
interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties?: Record<string, any>;
}
interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  filter: "ALL" | "ETH" | "BTC";
  onSelect: (node: GraphNode) => void;
}
interface Position {
  x: number;
  y: number;
}
function riskColor(score: number) {
  if (score >= 90) return "#f87171";
  if (score >= 70) return "#fb923c";
  if (score >= 40) return "#facc15";
  return "#34d399";
}
function riskLabel(score: number) {
  if (score >= 90) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}
function shortenAddress(address: unknown) {
  if (!address) return "UNKNOWN";
  const value = String(address);
  if (value.length <= 16) {
    return value;
  }
  return `${value.slice(0, 7)}...${value.slice(-6)}`;
}
function chainLabel(chain: unknown) {
  const value = String(chain ?? "").toLowerCase();
  if (value === "ethereum") return "ETH";
  if (value === "bitcoin") return "BTC";
  return value ? value.toUpperCase() : "UNK";
}
export default function InvestigationGraph({
  nodes,
  edges,
  filter,
  onSelect,
}: Props) {
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  /*
   * ============================================================
   * FILTERED TOPOLOGY
   * ============================================================
   */
  const filteredNodes = useMemo(() => {
    if (filter === "ALL") {
      return nodes;
    }
    return nodes.filter((node) => {
      const chain = String(node.properties?.chain ?? "").toLowerCase();
      if (filter === "ETH") {
        return chain === "ethereum";
      }
      return chain === "bitcoin";
    });
  }, [nodes, filter]);
  const allowedIds = useMemo(
    () => new Set(filteredNodes.map((node) => node.id)),
    [filteredNodes],
  );
  const filteredEdges = useMemo(() => {
    return edges.filter(
      (edge) => allowedIds.has(edge.source) && allowedIds.has(edge.target),
    );
  }, [edges, allowedIds]);
  /*
   * ============================================================
   * NODE POSITIONING
   * ============================================================
   */
  useEffect(() => {
    const nextPositions: Record<string, Position> = {};
    if (!filteredNodes.length) {
      setPositions({});
      return;
    }
    const groups = new Map<number, GraphNode[]>();
    filteredNodes.forEach((node) => {
      const rawDepth = node.properties?.depth;
      if (rawDepth === null || rawDepth === undefined) {
        return;
      }
      const depth = Number(rawDepth);
      if (!Number.isFinite(depth)) {
        return;
      }
      if (!groups.has(depth)) {
        groups.set(depth, []);
      }
      groups.get(depth)!.push(node);
    });
    const sortedDepths = [...groups.keys()].sort((a, b) => a - b);
    sortedDepths.forEach((depth) => {
      const group = groups.get(depth)!;
      if (depth === 0) {
        group.forEach((node, index) => {
          nextPositions[node.id] = {
            x: (index - group.length / 2 + 0.5) * 84,
            y: 0,
          };
        });
        return;
      }
      const radius = Math.min(
        245,
        100 + depth * 85 + Math.min(group.length * 4, 60),
      );
      group.forEach((node, index) => {
        const angle =
          (index / Math.max(group.length, 1)) * Math.PI * 2 -
          Math.PI / 2 +
          depth * 0.35;
        nextPositions[node.id] = {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        };
      });
    });
    setPositions(nextPositions);
  }, [filteredNodes]);
  /*
   * ============================================================
   * NODE RELATIONSHIP HELPERS
   * ============================================================
   */
  const connectedIds = useMemo(() => {
    if (!hovered) {
      return new Set<string>();
    }
    const connected = new Set<string>([hovered]);
    filteredEdges.forEach((edge) => {
      if (edge.source === hovered) {
        connected.add(edge.target);
      }
      if (edge.target === hovered) {
        connected.add(edge.source);
      }
    });
    return connected;
  }, [hovered, filteredEdges]);
  /*
   * ============================================================
   * RISK COUNTERS
   * ============================================================
   */
  const suspiciousCount = useMemo(
    () =>
      filteredNodes.filter(
        (node) => Number(node.properties?.risk_score ?? 0) >= 70,
      ).length,
    [filteredNodes],
  );
  const criticalCount = useMemo(
    () =>
      filteredNodes.filter(
        (node) => Number(node.properties?.risk_score ?? 0) >= 90,
      ).length,
    [filteredNodes],
  );
  /*
   * ============================================================
   * RENDER
   * ============================================================
   */
  return (
    <section className="relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#080d17]/90 shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      {/* Top accent */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      {/* HEADER */}
      <div className="relative z-10 flex min-w-0 flex-col gap-3 border-b border-white/[0.055] bg-white/[0.012] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05]">
            <span className="absolute h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.9)]" />
            <span className="absolute h-5 w-5 rounded-full border border-cyan-400/20" />
            <span className="absolute h-7 w-7 rounded-full border border-cyan-400/10 border-dashed" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-mono text-[10px] font-semibold tracking-[0.22em] text-cyan-300/90">
                TRANSACTION TOPOLOGY
              </h2>
              <span className="hidden rounded-md border border-emerald-400/15 bg-emerald-400/[0.06] px-2 py-0.5 font-mono text-[7px] font-bold tracking-[0.16em] text-emerald-300 sm:inline">
                LIVE
              </span>
            </div>
            <p className="mt-1 truncate font-mono text-[8px] tracking-[0.16em] text-slate-600">
              BLOCKCHAIN RELATIONSHIP ANALYSIS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[8px]">
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5">
            <span className="text-slate-600">NODES </span>
            <span className="font-bold text-slate-300">
              {filteredNodes.length}
            </span>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5">
            <span className="text-slate-600">LINKS </span>
            <span className="font-bold text-slate-300">
              {filteredEdges.length}
            </span>
          </div>
          {suspiciousCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-2.5 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
              <span className="font-bold text-red-300">
                {suspiciousCount} THREAT
                {suspiciousCount !== 1 ? "S" : ""}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* GRAPH CANVAS */}
      <div className="relative h-[min(68vh,680px)] min-h-[440px] w-full overflow-hidden bg-[#060a11]">
        {/* Grid */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-[0.32]
            [background-image:linear-gradient(rgba(148,163,184,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.045)_1px,transparent_1px)]
            [background-size:32px_32px]
          "
        />
        {/* Fine grid */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-[0.12]
            [background-image:linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)]
            [background-size:8px_8px]
          "
        />
        {/* Center glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/[0.025] blur-3xl" />
        {/* Secondary glow */}
        <div className="pointer-events-none absolute left-[30%] top-[35%] h-[180px] w-[180px] rounded-full bg-violet-500/[0.025] blur-3xl" />
        {/* Corner markers */}
        <div className="pointer-events-none absolute left-3 top-3 h-5 w-5 border-l border-t border-cyan-400/25" />
        <div className="pointer-events-none absolute right-3 top-3 h-5 w-5 border-r border-t border-cyan-400/25" />
        <div className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 border-b border-l border-cyan-400/25" />
        <div className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 border-b border-r border-cyan-400/25" />
        {/* Coordinate markers */}
        <div className="pointer-events-none absolute left-5 top-1/2 h-px w-10 bg-cyan-400/10" />
        <div className="pointer-events-none absolute right-5 top-1/2 h-px w-10 bg-cyan-400/10" />
        <div className="pointer-events-none absolute left-1/2 top-5 h-10 w-px bg-cyan-400/10" />
        <div className="pointer-events-none absolute bottom-5 left-1/2 h-10 w-px bg-cyan-400/10" />
        {/* EMPTY STATE */}
        {filteredNodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.015]">
                <span className="h-2 w-2 rounded-full bg-slate-700" />
              </div>
              <div className="mt-5 font-mono text-[9px] font-semibold tracking-[0.22em] text-slate-500">
                NO TOPOLOGY DATA
              </div>
              <p className="mt-2 font-mono text-[8px] tracking-wider text-slate-700">
                ADJUST FILTER OR RUN AN INVESTIGATION
              </p>
            </div>
          </div>
        ) : (
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="-320 -320 640 640"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Node glow */}
              <filter
                id="nodeGlow"
                x="-150%"
                y="-150%"
                width="400%"
                height="400%"
              >
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Threat glow */}
              <filter
                id="threatGlow"
                x="-200%"
                y="-200%"
                width="500%"
                height="500%"
              >
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Arrow */}
              <marker
                id="topologyArrow"
                markerWidth="7"
                markerHeight="7"
                refX="6"
                refY="3.5"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M0,0 L0,7 L7,3.5 z" fill="#334155" />
              </marker>
              {/* Active arrow */}
              <marker
                id="activeTopologyArrow"
                markerWidth="7"
                markerHeight="7"
                refX="6"
                refY="3.5"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M0,0 L0,7 L7,3.5 z" fill="#22d3ee" />
              </marker>
            </defs>
            {/* DEPTH RINGS */}
            {[1, 2, 3].map((depth) => {
              const radius = 100 + depth * 85;
              return (
                <circle
                  key={`depth-ring-${depth}`}
                  cx="0"
                  cy="0"
                  r={radius}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="0.5"
                  strokeDasharray="2 8"
                  opacity="0.22"
                />
              );
            })}
            {/* CONNECTIONS */}
            {filteredEdges.map((edge, index) => {
              const a = positions[edge.source];
              const b = positions[edge.target];
              if (!a || !b) {
                return null;
              }
              const active = hovered === edge.source || hovered === edge.target;
              const dimmed = hovered !== null && !active;
              const amount = edge.properties?.amount;
              const edgeType = edge.type || "TRANSFER";
              const midX = (a.x + b.x) / 2;
              const midY = (a.y + b.y) / 2;
              return (
                <g
                  key={`${edge.source}-${edge.target}-${index}`}
                  opacity={dimmed ? 0.12 : 1}
                >
                  {active && (
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="#22d3ee"
                      strokeWidth="5"
                      opacity="0.08"
                      filter="url(#nodeGlow)"
                    />
                  )}
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={active ? "#22d3ee" : "#26364a"}
                    strokeWidth={active ? 1.5 : 0.75}
                    strokeDasharray={active ? undefined : "3 3"}
                    opacity={active ? 0.95 : 0.65}
                    markerEnd={
                      active
                        ? "url(#activeTopologyArrow)"
                        : "url(#topologyArrow)"
                    }
                  />
                  {active && (
                    <circle cx={midX} cy={midY} r="2" fill="#22d3ee">
                      <animate
                        attributeName="opacity"
                        values="0.2;1;0.2"
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                  {active && (
                    <g>
                      <rect
                        x={midX - 32}
                        y={midY - 16}
                        width="64"
                        height="18"
                        rx="4"
                        fill="#080d17"
                        stroke="#22d3ee"
                        strokeWidth="0.5"
                        opacity="0.95"
                      />
                      <text
                        x={midX}
                        y={midY - 7}
                        fill="#64748b"
                        fontSize="5"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {edgeType.slice(0, 14).toUpperCase()}
                      </text>
                      {amount !== undefined && amount !== null && (
                        <text
                          x={midX}
                          y={midY + 0.5}
                          fill="#22d3ee"
                          fontSize="6"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {String(amount).slice(0, 14)}
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
            {/* NODES */}
            {filteredNodes.map((node) => {
              const position = positions[node.id];
              if (!position) {
                return null;
              }
              const score = Number(node.properties?.risk_score ?? 0);
              const color = riskColor(score);
              const highRisk = score >= 70;
              const critical = score >= 90;
              const rawDepth = node.properties?.depth;
              /*
               * IMPORTANT:
               * map() cannot use `continue`.
               * Return null instead.
               */
              if (rawDepth === null || rawDepth === undefined) {
                return null;
              }
              const depth = Number(rawDepth);
              if (!Number.isFinite(depth)) {
                return null;
              }
              const root = depth === 0;
              const isHovered = hovered === node.id;
              const isConnected = connectedIds.has(node.id);
              const dimmed = hovered !== null && !isHovered && !isConnected;
              const address = node.properties?.address;
              const shortAddress = shortenAddress(address);
              const chain = chainLabel(node.properties?.chain);
              return (
                <g
                  key={node.id}
                  transform={`translate(${position.x},${position.y})`}
                  style={{
                    cursor: "pointer",
                    transition: "opacity 150ms ease",
                  }}
                  opacity={dimmed ? 0.18 : 1}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect(node)}
                >
                  {/* THREAT PULSE */}
                  {highRisk && (
                    <>
                      <circle
                        r={isHovered ? 30 : 22}
                        fill="none"
                        stroke={color}
                        strokeWidth="1"
                        opacity="0.25"
                        filter={critical ? "url(#threatGlow)" : undefined}
                      >
                        <animate
                          attributeName="r"
                          values="20;32;20"
                          dur="2.2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.35;0;0.35"
                          dur="2.2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        r="20"
                        fill="none"
                        stroke={color}
                        strokeWidth="0.5"
                        strokeDasharray="2 5"
                        opacity="0.35"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0"
                          to="360"
                          dur="8s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </>
                  )}
                  {/* ROOT RINGS */}
                  {root && (
                    <>
                      <circle
                        r="27"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="1"
                        strokeDasharray="3 4"
                        opacity="0.65"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0"
                          to="360"
                          dur="12s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        r="33"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="0.5"
                        opacity="0.12"
                      />
                    </>
                  )}
                  {/* NODE GLOW */}
                  {isHovered && (
                    <circle
                      r="19"
                      fill={color}
                      opacity="0.07"
                      filter="url(#nodeGlow)"
                    />
                  )}
                  {/* NODE BODY */}
                  <circle
                    r={isHovered ? 17 : 14}
                    fill="#0b121e"
                    stroke={color}
                    strokeWidth={isHovered ? 2 : 1.2}
                    filter={isHovered ? "url(#nodeGlow)" : undefined}
                  />
                  {/* Inner core */}
                  <circle r={isHovered ? 5 : 4} fill={color} opacity="0.9" />
                  {/* Core highlight */}
                  <circle
                    cx="-1.2"
                    cy="-1.2"
                    r="1.2"
                    fill="#fff"
                    opacity="0.45"
                  />
                  {/* THREAT BADGE */}
                  {highRisk && (
                    <g>
                      <circle
                        cx="11"
                        cy="-12"
                        r="5"
                        fill="#070b12"
                        stroke={color}
                        strokeWidth="0.8"
                      />
                      <text
                        x="11"
                        y="-9.7"
                        textAnchor="middle"
                        fill={color}
                        fontSize="6"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        !
                      </text>
                    </g>
                  )}
                  {/* CHAIN BADGE */}
                  <g transform="translate(-24, -6)">
                    <rect
                      width="20"
                      height="9"
                      rx="3"
                      fill="#080d17"
                      stroke="#334155"
                      strokeWidth="0.5"
                    />
                    <text
                      x="10"
                      y="6.2"
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {chain}
                    </text>
                  </g>
                  {/* ADDRESS */}
                  <text
                    y="30"
                    textAnchor="middle"
                    fill={isHovered ? "#e2e8f0" : "#94a3b8"}
                    fontSize={isHovered ? "8" : "7"}
                    fontWeight={isHovered ? "600" : "400"}
                    fontFamily="monospace"
                  >
                    {shortAddress}
                  </text>
                  {/* RISK */}
                  <text
                    y="41"
                    textAnchor="middle"
                    fill={color}
                    opacity="0.8"
                    fontSize="6"
                    fontWeight="600"
                    fontFamily="monospace"
                    letterSpacing="0.5"
                  >
                    {riskLabel(score)} {score}
                  </text>
                  {/* ROOT LABEL */}
                  {root && (
                    <g>
                      <rect
                        x="-22"
                        y="-42"
                        width="44"
                        height="10"
                        rx="4"
                        fill="#22d3ee"
                        fillOpacity="0.07"
                        stroke="#22d3ee"
                        strokeOpacity="0.2"
                        strokeWidth="0.5"
                      />
                      <text
                        y="-35"
                        textAnchor="middle"
                        fill="#22d3ee"
                        fontSize="5.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                        letterSpacing="1"
                      >
                        ROOT WALLET
                      </text>
                    </g>
                  )}
                  {/* DEPTH */}
                  <text
                    y="52"
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="5"
                    fontFamily="monospace"
                  >
                    DEPTH {depth}
                  </text>
                  {/* TOOLTIP */}
                  <title>
                    {address || node.label}
                    {"\n"}
                    Risk: {score}/100
                    {"\n"}
                    Level: {riskLabel(score)}
                    {"\n"}
                    Entity: {node.properties?.entity_type || "Wallet"}
                    {"\n"}
                    Blockchain: {node.properties?.chain || "Unknown"}
                    {"\n"}
                    Organization: {node.properties?.organization || "Unknown"}
                    {"\n"}
                    Depth: {depth}
                  </title>
                </g>
              );
            })}
          </svg>
        )}
        {/* TOP LEFT STATUS */}
        <div className="absolute left-3 top-3 rounded-xl border border-white/[0.06] bg-[#080d17]/85 px-3 py-2 backdrop-blur-md">
          <div className="font-mono text-[6px] tracking-[0.2em] text-slate-600">
            ANALYSIS MODE
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_7px_rgba(34,211,238,0.7)]" />
            <span className="font-mono text-[7px] font-bold tracking-wider text-cyan-300">
              {filter === "ALL"
                ? "MULTI-CHAIN"
                : filter === "ETH"
                  ? "ETHEREUM"
                  : "BITCOIN"}
            </span>
          </div>
        </div>
        {/* TOP RIGHT STATUS */}
        <div className="absolute right-3 top-3 hidden items-center gap-2 rounded-xl border border-white/[0.05] bg-[#080d17]/85 px-2.5 py-2 backdrop-blur-md md:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[7px] font-bold tracking-[0.14em] text-emerald-400/80">
            GRAPH SYNC
          </span>
        </div>
        {/* CRITICAL COUNTER */}
        {criticalCount > 0 && (
          <div className="absolute left-3 top-16 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-2.5 py-1.5 font-mono text-[7px] font-bold tracking-[0.14em] text-red-300">
            {criticalCount} CRITICAL
          </div>
        )}
        {/* LEGEND */}
        <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-24px)] flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/[0.06] bg-[#080d17]/90 px-3 py-2.5 backdrop-blur-md">
          <Legend color="#34d399" label="LOW" />
          <Legend color="#facc15" label="MEDIUM" />
          <Legend color="#fb923c" label="HIGH" />
          <Legend color="#f87171" label="CRITICAL" />
          <span className="hidden h-3 w-px bg-white/[0.08] sm:block" />
          <div className="hidden items-center gap-1.5 font-mono text-[7px] text-slate-500 sm:flex">
            <span className="h-2 w-2 rounded-full border border-cyan-400/60" />
            ROOT
          </div>
        </div>
        {/* INTERACTION HINT */}
        <div className="absolute bottom-3 right-3 hidden rounded-xl border border-white/[0.06] bg-[#080d17]/90 px-3 py-2.5 font-mono text-[7px] font-semibold tracking-[0.12em] text-slate-500 backdrop-blur-md sm:block">
          CLICK NODE FOR INTELLIGENCE
        </div>
      </div>
    </section>
  );
}
/*
 * ==============================================================
 * LEGEND
 * ==============================================================
 */
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[7px] font-bold tracking-wider text-slate-400">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}55`,
        }}
      />
      {label}
    </div>
  );
}
