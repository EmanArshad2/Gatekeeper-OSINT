"use client";
import { Search, Download, Filter, Network, ArrowUpRight } from "lucide-react";
interface GraphToolbarProps {
  chain: string;
  setChain: (value: string) => void;
  onExport: () => void;
  searchQuery?: string;
  setSearchQuery?: (value: string) => void;
}
export default function GraphToolbar({
  chain,
  setChain,
  onExport,
  searchQuery = "",
  setSearchQuery,
}: GraphToolbarProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-5">
        {/* LEFT INFO */}
        <div className="flex items-start gap-4">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300">
            <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-cyan-400/[0.035] blur-xl" />
            <Network size={20} strokeWidth={1.6} />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </span>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
                TOPOLOGY // GRAPH
              </span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Forensic Network Graph
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Wallet relationships, evidence sources and entity connections
            </p>
          </div>
        </div>
        {/* RIGHT CONTROLS */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* SEARCH INPUT */}
          {setSearchQuery && (
            <div className="relative flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-2 backdrop-blur-xl transition-all duration-200 focus-within:border-cyan-400/30 focus-within:bg-white/[0.045]">
              <Search size={14} strokeWidth={1.6} className="text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search node..."
                className="w-28 bg-transparent font-mono text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none sm:w-36"
              />
            </div>
          )}
          {/* CHAIN FILTER */}
          <div className="relative flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 backdrop-blur-xl transition-all duration-200 hover:border-cyan-400/20">
            <Filter size={14} strokeWidth={1.6} className="text-slate-500" />
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="bg-transparent font-mono text-[10px] text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#05070b] text-slate-200">
                All Chains
              </option>
              <option value="BTC" className="bg-[#05070b] text-slate-200">
                Bitcoin
              </option>
              <option value="ETH" className="bg-[#05070b] text-slate-200">
                Ethereum
              </option>
              <option value="TRON" className="bg-[#05070b] text-slate-200">
                TRON
              </option>
            </select>
          </div>
          {/* EXPORT BUTTON */}
          <button
            type="button"
            onClick={onExport}
            className="
              group
              relative
              flex
              items-center
              gap-2
              overflow-hidden
              rounded-xl
              border
              border-cyan-400/30
              bg-cyan-400/[0.08]
              px-4
              py-2
              font-mono
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-cyan-300
              backdrop-blur-xl
              transition-all
              duration-300
              hover:border-cyan-400/60
              hover:bg-cyan-400/[0.14]
              hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]
              active:scale-[0.98]
            "
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <Download
              size={13}
              strokeWidth={1.8}
              className="transition-transform duration-300 group-hover:-translate-y-0.5"
            />
            <span>Export Graph</span>
          </button>
        </div>
      </div>
      {/* FOOTER TELEMETRY */}
      <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.015] px-5 py-2.5 lg:px-6">
        <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-600">
          Topology filter active // Chain: {chain}
        </span>
        <span className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.12em] text-cyan-400">
          <span>GRAPH ENGINE READY</span>
          <ArrowUpRight size={10} className="text-cyan-400" />
        </span>
      </div>
    </section>
  );
}
