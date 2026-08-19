"use client";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Plus,
  ChevronDown,
  X,
  Wallet as WalletIcon,
} from "lucide-react";
const API = "http://127.0.0.1:8000/api";
export interface InvestigationCase {
  id: number;
  name: string;
  description: string | null;
  status: string;
  analyst: string | null;
  wallet_count: number;
  created_at: string | null;
  updated_at: string | null;
}
interface CaseWalletSummary {
  id: number;
  address: string;
  chain: string;
  risk_score: number;
  risk_level: string;
}
interface Props {
  activeCase: InvestigationCase | null;
  onCaseChange: (activeCase: InvestigationCase | null) => void;
  /**
   * Fired after a wallet is attached or detached here. InvestigationControls
   * keeps its own separate copy of "wallets attached to this case" (that's
   * what actually gates the INVESTIGATE button), and it has no way to know
   * this component just changed that list. Without this callback, a wallet
   * attached here would work in the database immediately but the
   * INVESTIGATE button would keep showing "NO WALLETS ATTACHED" until the
   * case was deselected and reselected.
   */
  onWalletsChanged?: () => void;
}
export default function CaseManager({
  activeCase,
  onCaseChange,
  onWalletsChanged,
}: Props) {
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [attachAddress, setAttachAddress] = useState("");
  const [caseWallets, setCaseWallets] = useState<CaseWalletSummary[]>([]);
  const [error, setError] = useState("");
  /* ============================================================
     LOAD CASES
  ============================================================ */
  async function loadCases() {
    try {
      const response = await fetch(`${API}/cases`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Failed to load cases: ${response.status}`);
      }
      const data = await response.json();
      console.log("[GATEKEEPER] Cases loaded:", data.cases);
      setCases(Array.isArray(data.cases) ? data.cases : []);
    } catch (err) {
      console.error("[GATEKEEPER] Failed to load cases:", err);
      setError("Unable to load investigation cases.");
    }
  }
  /* ============================================================
     LOAD CASE WALLETS
  ============================================================ */
  async function loadCaseWallets(caseId: number) {
    try {
      const response = await fetch(`${API}/cases/${caseId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        console.warn(`[GATEKEEPER] Failed to load wallets for case ${caseId}`);
        setCaseWallets([]);
        return;
      }
      const data = await response.json();
      setCaseWallets(Array.isArray(data.wallets) ? data.wallets : []);
    } catch (err) {
      console.error("[GATEKEEPER] Failed to load case wallets:", err);
      setCaseWallets([]);
    }
  }
  /* ============================================================
     INITIAL LOAD
  ============================================================ */
  useEffect(() => {
    loadCases();
  }, []);
  /* ============================================================
     ACTIVE CASE CHANGE
  ============================================================ */
  useEffect(() => {
    console.log("[GATEKEEPER] Active case changed:", activeCase);
    if (activeCase) {
      loadCaseWallets(activeCase.id);
    } else {
      setCaseWallets([]);
    }
  }, [activeCase]);
  /* ============================================================
     SELECT CASE
  ============================================================ */
  function selectCase(c: InvestigationCase) {
    console.log("[GATEKEEPER] Selecting case:", c);
    /*
     * Explicitly update the parent state.
     */
    onCaseChange(c);
    /*
     * Close dropdown after selection.
     */
    setOpen(false);
    /*
     * Clear any previous error.
     */
    setError("");
  }
  /* ============================================================
     CREATE CASE
  ============================================================ */
  async function createCase() {
    const name = newName.trim();
    if (!name) {
      setError("Enter a case name.");
      return;
    }
    try {
      setCreating(true);
      setError("");
      console.log("[GATEKEEPER] Creating case:", name);
      const response = await fetch(`${API}/cases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
        }),
      });
      const data = await response.json().catch(() => null);
      console.log("[GATEKEEPER] Create case response:", data);
      if (!response.ok) {
        throw new Error(data?.detail || "Failed to create case.");
      }
      const createdCase = data?.case;
      if (!createdCase) {
        throw new Error(
          "Backend created the case but did not return case data.",
        );
      }
      /*
       * Add the new case immediately to the UI.
       */
      setCases((previous) => {
        const exists = previous.some((item) => item.id === createdCase.id);
        if (exists) {
          return previous;
        }
        return [createdCase, ...previous];
      });
      /*
       * IMPORTANT:
       * Immediately make the newly created case active.
       */
      onCaseChange(createdCase);
      setNewName("");
      setOpen(false);
      /*
       * Refresh from backend.
       */
      await loadCases();
    } catch (err) {
      console.error("[GATEKEEPER] Create case error:", err);
      setError(err instanceof Error ? err.message : "Failed to create case.");
    } finally {
      setCreating(false);
    }
  }
  /* ============================================================
     ATTACH WALLET
  ============================================================ */
  async function attachWallet() {
    if (!activeCase) {
      setError("Select a case first.");
      return;
    }
    const address = attachAddress.trim();
    if (!address) {
      setError("Enter a wallet address.");
      return;
    }
    try {
      setError("");
      const response = await fetch(`${API}/cases/${activeCase.id}/wallets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          address,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || "Failed to attach wallet.");
      }
      setAttachAddress("");
      await loadCaseWallets(activeCase.id);
      await loadCases();
      onWalletsChanged?.();
    } catch (err) {
      console.error("[GATEKEEPER] Attach wallet error:", err);
      setError(err instanceof Error ? err.message : "Failed to attach wallet.");
    }
  }
  /* ============================================================
     DETACH WALLET
  ============================================================ */
  async function detachWallet(walletId: number) {
    if (!activeCase) return;
    try {
      const response = await fetch(
        `${API}/cases/${activeCase.id}/wallets/${walletId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to detach wallet.");
      }
      await loadCaseWallets(activeCase.id);
      await loadCases();
      onWalletsChanged?.();
    } catch (err) {
      console.error("[GATEKEEPER] Detach wallet error:", err);
      setError("Failed to detach wallet.");
    }
  }
  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="relative z-50 rounded-xl border border-white/[0.07] bg-[#070b12]/95 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* ACTIVE CASE LABEL */}
        <div className="flex items-center gap-2 text-cyan-300">
          <Briefcase size={15} />
          <span className="font-mono text-[9px] font-semibold tracking-[0.14em]">
            ACTIVE CASE
          </span>
        </div>
        {/* CASE SELECTOR */}
        <div className="relative z-[60]">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              console.log("[GATEKEEPER] Case selector clicked");
              setOpen((previous) => !previous);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[11px] text-slate-200 transition-colors hover:border-cyan-400/25 hover:bg-cyan-400/[0.03]"
          >
            <span className="max-w-[220px] truncate">
              {activeCase ? activeCase.name : "No case selected"}
            </span>
            <ChevronDown
              size={12}
              className={`text-slate-500 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
          {/* DROPDOWN */}
          {open && (
            <div
              className="absolute left-0 top-full z-[9999] mt-2 w-80 rounded-lg border border-white/[0.10] bg-[#0B1416] p-3 shadow-2xl"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              {/* CREATE CASE */}
              <div className="mb-3 flex gap-2">
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      createCase();
                    }
                  }}
                  placeholder="New case name..."
                  className="min-w-0 flex-1 rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    createCase();
                  }}
                  disabled={creating}
                  className="flex cursor-pointer items-center justify-center rounded-md border border-cyan-400/25 bg-cyan-400/[0.07] px-2.5 py-1.5 text-cyan-300 transition hover:bg-cyan-400/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={13} />
                </button>
              </div>
              {/* CASE LIST */}
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {cases.length === 0 && (
                  <p className="px-1 py-2 font-mono text-[9px] text-slate-600">
                    No cases yet — create one above.
                  </p>
                )}
                {cases.map((c) => {
                  const selected = activeCase?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(event) => {
                        /*
                         * Prevent another element from stealing
                         * the click before React processes it.
                         */
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        console.log("[GATEKEEPER] CASE CLICK:", c);
                        selectCase(c);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-left text-[11px] transition-colors ${
                        selected
                          ? "border border-cyan-400/15 bg-cyan-400/[0.10] text-cyan-200"
                          : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <span className="min-w-0 truncate">{c.name}</span>
                      <span className="ml-2 shrink-0 font-mono text-[9px] text-slate-500">
                        {c.wallet_count}{" "}
                        {c.wallet_count === 1 ? "wallet" : "wallets"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {/* STATUS */}
        {activeCase && (
          <span className="ml-auto rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-1 font-mono text-[8px] font-semibold tracking-wider text-emerald-300">
            {activeCase.status}
          </span>
        )}
      </div>
      {/* ========================================================
          ACTIVE CASE CONTENT
      ======================================================== */}
      {activeCase && (
        <div className="mt-4 border-t border-white/[0.05] pt-3">
          <div className="mb-2 flex gap-2">
            <input
              value={attachAddress}
              onChange={(event) => setAttachAddress(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  attachWallet();
                }
              }}
              placeholder="Wallet address to attach to this case..."
              className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[10px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={attachWallet}
              className="cursor-pointer rounded-md border border-cyan-400/25 bg-cyan-400/[0.07] px-3 py-1.5 font-mono text-[9px] font-semibold tracking-wider text-cyan-300 transition hover:bg-cyan-400/[0.12]"
            >
              ATTACH
            </button>
          </div>
          {/* CASE WALLETS */}
          {caseWallets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {caseWallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1"
                >
                  <WalletIcon size={10} className="text-slate-500" />
                  <span className="font-mono text-[9px] text-slate-300">
                    {wallet.address.slice(0, 10)}…{wallet.address.slice(-6)}
                  </span>
                  <button
                    type="button"
                    onClick={() => detachWallet(wallet.id)}
                    className="cursor-pointer text-slate-600 hover:text-red-400"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* ERROR */}
      {error && (
        <p className="mt-2 font-mono text-[9px] text-red-400">{error}</p>
      )}
    </div>
  );
}
