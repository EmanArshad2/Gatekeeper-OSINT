"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FolderSearch,
  FileText,
  Image as ImageIcon,
  Globe,
  Wallet,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  ShieldAlert,
  Loader2,
  FileCode,
} from "lucide-react";

interface EvidenceItem {
  id: number;
  filename: string;
  media_type: string;
  file_size?: number;
  wallet_count: number;
  wallets: string[];
  chain?: string;
  risk_score: number;
  risk_level: string;
  created_at: string;
}

const API = "http://127.0.0.1:8000/api";

export default function EvidenceWorkspace() {
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [generatingReportId, setGeneratingReportId] = useState<number | null>(null);

  useEffect(() => {
    async function loadEvidence() {
      try {
        setLoading(true);
        const res = await fetch(`${API}/evidence`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setEvidenceList(data.evidence || []);
        } else {
          // Default demo evidence if backend response is empty
          setEvidenceList(getDemoEvidence());
        }
      } catch (err) {
        console.warn("Using preset evidence dataset:", err);
        setEvidenceList(getDemoEvidence());
      } finally {
        setLoading(false);
      }
    }
    loadEvidence();
  }, []);

  const filteredEvidence = useMemo(() => {
    return evidenceList.filter((item) => {
      if (selectedType !== "ALL") {
        const type = item.media_type.toUpperCase();
        if (selectedType === "PDF" && !type.includes("PDF")) return false;
        if (selectedType === "IMAGE" && !type.includes("IMAGE") && !type.includes("JPG") && !type.includes("PNG")) return false;
        if (selectedType === "URL" && !type.includes("URL") && !type.includes("WEB")) return false;
        if (selectedType === "TEXT" && !type.includes("TEXT")) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.filename.toLowerCase().includes(q);
        const matchesWallets = item.wallets.some((w) => w.toLowerCase().includes(q));
        if (!matchesName && !matchesWallets) return false;
      }
      return true;
    });
  }, [evidenceList, selectedType, searchQuery]);

  async function handleGenerateItemReport(item: EvidenceItem) {
    try {
      setGeneratingReportId(item.id);
      const response = await fetch(`${API}/report/generate/adhoc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Evidence Report — ${item.filename}`,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate report");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gatekeeper-evidence-${item.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Evidence report error:", err);
      alert("Could not generate report for this evidence item.");
    } finally {
      setGeneratingReportId(null);
    }
  }

  return (
    <div className="space-y-6 pb-12 text-slate-200">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070b12]/90 p-6 backdrop-blur-xl lg:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-400/[0.05] blur-[100px]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08]">
              <FolderSearch size={22} className="text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-400">
                  EVIDENCE VAULT // INDEX
                </span>
                <span className="rounded border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-0.5 font-mono text-[8px] font-semibold text-emerald-400">
                  {evidenceList.length} FILES INDEXED
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white lg:text-3xl">
                Evidence Vault
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Browse ingested OSINT documents, images, web links, and generate per-item PDF reports.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Evidence Files"
          value={String(evidenceList.length)}
          description="Ingested images, PDFs, text & URLs"
          icon={<FileText size={18} className="text-cyan-400" />}
        />
        <MetricCard
          title="Extracted Wallets"
          value={String(
            evidenceList.reduce((acc, curr) => acc + (curr.wallet_count || curr.wallets.length), 0)
          )}
          description="Discovered crypto addresses"
          icon={<Wallet size={18} className="text-amber-400" />}
        />
        <MetricCard
          title="High Risk Flags"
          value={String(evidenceList.filter((e) => e.risk_score >= 60).length)}
          description="Evidence containing flagged wallets"
          icon={<ShieldAlert size={18} className="text-red-400" />}
        />
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-[#070b12]/90 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5 font-mono text-[10px]">
            {["ALL", "PDF", "IMAGE", "URL", "TEXT"].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`rounded-md px-3 py-1 font-semibold transition-all ${
                  selectedType === type
                    ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filename or wallet address..."
            className="w-full rounded-lg border border-white/[0.08] bg-[#05070b] pl-9 pr-3 py-1.5 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-400/40 focus:outline-none"
          />
        </div>
      </div>

      {/* EVIDENCE TABLE */}
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-white/[0.07] bg-[#070b12]/90">
          <Loader2 size={24} className="animate-spin text-cyan-400" />
        </div>
      ) : filteredEvidence.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-[#070b12]/90 font-mono text-xs text-slate-500">
          No evidence items match your search filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070b12]/90 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-white/[0.07] bg-white/[0.02] text-[9px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Evidence File</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Extracted Wallets</th>
                  <th className="px-5 py-3.5">Risk Score</th>
                  <th className="px-5 py-3.5">Uploaded</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredEvidence.map((item) => {
                  const score = item.risk_score;
                  const isGenerating = generatingReportId === item.id;

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300">
                            {getFileIcon(item.media_type)}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{item.filename}</p>
                            <p className="text-[10px] text-slate-500">ID: GK-EV-{item.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase text-slate-300">
                          {item.media_type}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-cyan-300">
                            <Wallet size={12} />
                            <span>{item.wallets.length} Addresses Detected</span>
                          </div>
                          {item.wallets[0] && (
                            <p className="text-[9px] text-slate-500 truncate max-w-[200px]">
                              {item.wallets[0]}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold ${
                            score >= 70
                              ? "border-red-400/30 bg-red-500/10 text-red-300"
                              : score >= 40
                                ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
                                : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                          }`}
                        >
                          {score >= 70 ? "CRITICAL" : score >= 40 ? "MEDIUM" : "LOW"} ({score}/100)
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-400 text-[10px]">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleGenerateItemReport(item)}
                            disabled={isGenerating}
                            className="flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-[10px] font-semibold text-violet-300 transition-all hover:bg-violet-400/20 disabled:opacity-40"
                          >
                            {isGenerating ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <FileText size={12} />
                            )}
                            {isGenerating ? "Generating..." : "PDF Report"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#070b12]/90 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold font-mono text-white">{value}</p>
      <p className="mt-1 text-[10px] text-slate-500">{description}</p>
    </div>
  );
}

function getFileIcon(type: string) {
  const t = (type || "").toUpperCase();
  if (t.includes("PDF")) return <FileText size={16} />;
  if (t.includes("IMAGE") || t.includes("JPG") || t.includes("PNG")) return <ImageIcon size={16} />;
  if (t.includes("URL") || t.includes("WEB")) return <Globe size={16} />;
  return <FileCode size={16} />;
}

function getDemoEvidence(): EvidenceItem[] {
  return [
    {
      id: 101,
      filename: "crypto_ransom_note.pdf",
      media_type: "PDF Document",
      wallet_count: 2,
      wallets: ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],
      chain: "bitcoin",
      risk_score: 85,
      risk_level: "HIGH",
      created_at: new Date().toISOString(),
    },
    {
      id: 102,
      filename: "telegram_post_evidence.png",
      media_type: "Image",
      wallet_count: 1,
      wallets: ["7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"],
      chain: "solana",
      risk_score: 45,
      risk_level: "MEDIUM",
      created_at: new Date().toISOString(),
    },
    {
      id: 103,
      filename: "darknet_forum_thread.txt",
      media_type: "Text Document",
      wallet_count: 3,
      wallets: ["48ed2AacDirectionBTC...", "0x89205A3A3b2A69De6Dbf7f01EDf3ca23AC000B00"],
      chain: "ethereum",
      risk_score: 75,
      risk_level: "CRITICAL",
      created_at: new Date().toISOString(),
    },
  ];
}
