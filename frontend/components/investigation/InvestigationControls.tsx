"use client";
import { useEffect, useState } from "react";
import type { InvestigationCase } from "./CaseManager";
import {
  Search,
  Loader2,
  RefreshCw,
  ShieldAlert,
  PlayCircle,
  Clock3,
  CheckCircle2,
  XCircle,
  Database,
  Network,
  Wallet,
  Activity,
  Layers3,
  ChevronRight,
  FolderSearch,
  FileText,
  History,
  Target,
} from "lucide-react";
interface Props {
  activeCase: InvestigationCase | null;
  onInvestigationComplete: () => void;
  walletsVersion?: number;
}
interface InvestigationStats {
  wallet: string;
  nodes: number;
  edges: number;
  maxDepth: number;
  levels: Record<number, number>;
}
interface CaseWalletSummary {
  id: number;
  address: string;
  chain: string;
  risk_score: number;
  risk_level: string;
}
type InvestigationStatus =
  | "Idle"
  | "Loading"
  | "Running"
  | "Completed"
  | "Failed";
type OsintStatus = "Idle" | "Scanning" | "Completed" | "Failed";
type ResultSource = "None" | "Previous Case" | "Live Investigation";
interface PersistedInvestigation {
  caseId: string;
  caseName?: string;
  wallet?: string;
  root?: string;
  depth?: number;
  nodes?: number;
  edges?: number;
  maxDepth?: number;
  levels?: Record<number, number>;
  status?: string;
  completedAt?: string;
  updatedAt?: string;
  osint?: {
    completed?: boolean;
    completedAt?: string;
    wallet?: string;
    wallets?: string[];
    results?: Record<string, unknown>;
    result?: unknown;
    failures?: string[];
  };
  result?: unknown;
}
interface InvestigationOneResult {
  rootWallet: string;
  nodeCount: number;
  edgeCount: number;
  maxDiscoveredDepth: number;
  levels: Record<number, number>;
  investigation: unknown;
}
interface OsintOneResult {
  wallet: string;
  result: unknown;
}
const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8000";
/*
 * Normalize the API base so:
 *
 * http://127.0.0.1:8000
 * http://127.0.0.1:8000/
 * http://127.0.0.1:8000/api
 * http://127.0.0.1:8000/api/
 *
 * all become:
 *
 * http://127.0.0.1:8000
 */
const API_BASE = RAW_API_BASE.replace(/\/+$/, "").replace(/\/api$/, "");
/* ===============================================================
   COMPONENT
=============================================================== */
export default function InvestigationControls({
  activeCase,
  onInvestigationComplete,
  walletsVersion,
}: Props) {
  const [address, setAddress] = useState("");
  const [depth, setDepth] = useState(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<InvestigationStatus>("Idle");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [stats, setStats] = useState<InvestigationStats>({
    wallet: "",
    nodes: 0,
    edges: 0,
    maxDepth: 0,
    levels: {},
  });
  const [osintLoading, setOsintLoading] = useState(false);
  const [osintStatus, setOsintStatus] = useState<OsintStatus>("Idle");
  const [loadingCaseResult, setLoadingCaseResult] = useState(false);
  const [resultSource, setResultSource] = useState<ResultSource>("None");
  const [caseInvestigation, setCaseInvestigation] =
    useState<PersistedInvestigation | null>(null);
  const [caseWallets, setCaseWallets] = useState<CaseWalletSummary[]>([]);
  const [loadingCaseWallets, setLoadingCaseWallets] = useState(false);
  const [investigatingCase, setInvestigatingCase] = useState(false);
  const [caseProgress, setCaseProgress] = useState({ done: 0, total: 0 });
  /* =============================================================
     CASE ID
  ============================================================= */
  function getCaseId(): string | null {
    if (!activeCase) {
      return null;
    }
    return String(activeCase.id);
  }
  /* =============================================================
     RESET UI
  ============================================================= */
  function resetInvestigationState() {
    setAddress("");
    setDepth(1);
    setLoading(false);
    setStatus("Idle");
    setProgress(0);
    setDuration(0);
    setStats({
      wallet: "",
      nodes: 0,
      edges: 0,
      maxDepth: 0,
      levels: {},
    });
    setOsintLoading(false);
    setOsintStatus("Idle");
    setCaseInvestigation(null);
    setResultSource("None");
    setCaseProgress({
      done: 0,
      total: 0,
    });
  }
  /* =============================================================
     LOAD LOCAL FALLBACK
  ============================================================= */
  function loadLocalCaseInvestigation(
    caseId: string,
  ): PersistedInvestigation | null {
    try {
      const storageKey = `gatekeeper:investigation:${caseId}`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (error) {
      console.warn("Could not load local investigation:", error);
      return null;
    }
  }
  /* =============================================================
     APPLY INVESTIGATION RESULT
  ============================================================= */
  function applyInvestigationResult(
    investigation: PersistedInvestigation | any,
    source: ResultSource,
  ) {
    if (!investigation) {
      return;
    }
    const data =
      investigation.investigation || investigation.result || investigation;
    const rootWallet =
      data.root ||
      data.wallet ||
      investigation.root ||
      investigation.wallet ||
      "";
    const nodesData = Array.isArray(data.nodes) ? data.nodes : [];
    const edgesData = Array.isArray(data.edges) ? data.edges : [];
    const levels: Record<number, number> = {};
    for (const node of nodesData) {
      const nodeDepth = Number(
        node?.depth ?? node?.discovery_depth ?? node?.properties?.depth ?? 0,
      );
      levels[nodeDepth] = (levels[nodeDepth] ?? 0) + 1;
    }
    /*
     * If the persisted record already contains level data,
     * prefer that when no node array is available.
     */
    if (
      Object.keys(levels).length === 0 &&
      investigation.levels &&
      typeof investigation.levels === "object"
    ) {
      for (const [key, value] of Object.entries(investigation.levels)) {
        levels[Number(key)] = Number(value);
      }
    }
    const discoveredDepths = Object.keys(levels).map(Number);
    const calculatedMaxDepth =
      discoveredDepths.length > 0
        ? Math.max(...discoveredDepths)
        : Number(
            data.maxDepth ??
              investigation.maxDepth ??
              data.depth ??
              investigation.depth ??
              0,
          );
    const nodeCount = Number(
      investigation.nodes ??
        data.node_count ??
        data.nodes_count ??
        (Array.isArray(data.nodes) ? data.nodes.length : 0),
    );
    const edgeCount = Number(
      investigation.edges ??
        data.edge_count ??
        data.edges_count ??
        (Array.isArray(data.edges) ? data.edges.length : 0),
    );
    const investigationDepth = Number(
      investigation.depth ?? data.depth ?? calculatedMaxDepth ?? 1,
    );
    setAddress(String(rootWallet));
    setDepth(
      investigationDepth >= 1 && investigationDepth <= 3
        ? investigationDepth
        : 1,
    );
    setStats({
      wallet: String(rootWallet),
      nodes: nodeCount,
      edges: edgeCount,
      maxDepth: calculatedMaxDepth,
      levels,
    });
    const osintCompleted =
      investigation.osint?.completed === true || data.osint?.completed === true;
    setOsintStatus(osintCompleted ? "Completed" : "Idle");
    if (nodeCount > 0 || edgeCount > 0 || rootWallet) {
      setStatus("Completed");
      setProgress(100);
    }
    setResultSource(source);
  }
  /* =============================================================
     LOAD CASE INVESTIGATION
  ============================================================= */
  async function loadCaseInvestigation(caseId: string) {
    setLoadingCaseResult(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/investigate/case/${encodeURIComponent(caseId)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );
      if (response.ok) {
        const result = await response.json();
        if (result && result.status !== "NOT_FOUND" && result.investigation) {
          setCaseInvestigation(result.investigation);
          applyInvestigationResult(result.investigation, "Previous Case");
          try {
            localStorage.setItem(
              `gatekeeper:investigation:${caseId}`,
              JSON.stringify(result.investigation),
            );
          } catch {
            // Ignore localStorage failures.
          }
          return;
        }
      }
      const localResult = loadLocalCaseInvestigation(caseId);
      if (localResult) {
        setCaseInvestigation(localResult);
        applyInvestigationResult(localResult, "Previous Case");
        return;
      }
      setCaseInvestigation(null);
      setResultSource("None");
    } catch (error) {
      console.warn("Could not load case investigation from backend:", error);
      const localResult = loadLocalCaseInvestigation(caseId);
      if (localResult) {
        setCaseInvestigation(localResult);
        applyInvestigationResult(localResult, "Previous Case");
      }
    } finally {
      setLoadingCaseResult(false);
    }
  }
  /* =============================================================
     LOAD CASE WALLETS
     IMPORTANT:
     This function now RETURNS the freshly fetched wallet list.
     That fixes the React state timing bug where:
       await loadCaseWallets()
       const wallets = caseWallets
     could still use stale state.
  ============================================================= */
  async function loadCaseWallets(caseId: string): Promise<CaseWalletSummary[]> {
    setLoadingCaseWallets(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/cases/${encodeURIComponent(caseId)}`,
        {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );
      if (!response.ok) {
        setCaseWallets([]);
        return [];
      }
      const data = await response.json();
      const wallets: CaseWalletSummary[] = Array.isArray(data.wallets)
        ? data.wallets
        : [];
      setCaseWallets(wallets);
      return wallets;
    } catch (error) {
      console.warn("Could not load case wallets:", error);
      setCaseWallets([]);
      return [];
    } finally {
      setLoadingCaseWallets(false);
    }
  }
  /* =============================================================
     CASE CHANGE
  ============================================================= */
  useEffect(() => {
    if (!activeCase) {
      resetInvestigationState();
      setCaseWallets([]);
      return;
    }
    resetInvestigationState();
    const caseId = String(activeCase.id);
    loadCaseInvestigation(caseId);
    loadCaseWallets(caseId);
  }, [activeCase?.id]);
  /* =============================================================
     WALLETS CHANGED
  ============================================================= */
  useEffect(() => {
    if (!activeCase) {
      return;
    }
    if (walletsVersion === undefined) {
      return;
    }
    loadCaseWallets(String(activeCase.id));
  }, [walletsVersion]);
  /* =============================================================
     SAVE LOCAL INVESTIGATION
  ============================================================= */
  function saveInvestigationLocally(
    investigationRecord: PersistedInvestigation,
  ) {
    if (!activeCase) {
      return;
    }
    try {
      localStorage.setItem(
        `gatekeeper:investigation:${activeCase.id}`,
        JSON.stringify(investigationRecord),
      );
    } catch (error) {
      console.warn("Could not save investigation locally:", error);
    }
  }
  /* =============================================================
     INVESTIGATE ONE ADDRESS
  ============================================================= */
  async function investigateOneAddress(
    targetAddress: string,
    caseId: string,
  ): Promise<InvestigationOneResult> {
    const cleanAddress = targetAddress.trim();
    if (!cleanAddress) {
      throw new Error("Wallet address is empty.");
    }
    const response = await fetch(
      `${API_BASE}/api/investigate/${encodeURIComponent(
        cleanAddress,
      )}?depth=${depth}&case_id=${encodeURIComponent(caseId)}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      },
    );
    let result: any = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }
    if (!response.ok) {
      throw new Error(
        typeof result.detail === "string"
          ? result.detail
          : `Investigation failed for ${cleanAddress}`,
      );
    }
    const investigation = result.result || result.investigation || result;
    const nodesData = Array.isArray(investigation?.nodes)
      ? investigation.nodes
      : [];
    const edgesData = Array.isArray(investigation?.edges)
      ? investigation.edges
      : [];
    const levels: Record<number, number> = {};
    for (const node of nodesData) {
      const nodeDepth = Number(
        node?.depth ?? node?.discovery_depth ?? node?.properties?.depth ?? 0,
      );
      levels[nodeDepth] = (levels[nodeDepth] ?? 0) + 1;
    }
    const discoveredDepths = Object.keys(levels).map(Number);
    const maxDiscoveredDepth =
      discoveredDepths.length > 0 ? Math.max(...discoveredDepths) : depth;
    const rootWallet = result.root || investigation?.root || cleanAddress;
    const nodeCount = Number(
      result.nodes ??
        investigation?.node_count ??
        investigation?.nodes_count ??
        nodesData.length,
    );
    const edgeCount = Number(
      result.edges ??
        investigation?.edge_count ??
        investigation?.edges_count ??
        edgesData.length,
    );
    return {
      rootWallet: String(rootWallet),
      nodeCount,
      edgeCount,
      maxDiscoveredDepth,
      levels,
      investigation,
    };
  }
  /* =============================================================
     START SINGLE ADDRESS INVESTIGATION
  ============================================================= */
  async function startInvestigation() {
    if (!activeCase) {
      alert("Select an investigation case before starting an investigation.");
      return;
    }
    if (!address.trim()) {
      alert("Enter a BTC or ETH wallet address.");
      return;
    }
    const caseId = getCaseId();
    if (!caseId) {
      return;
    }
    setLoading(true);
    setStatus("Running");
    setResultSource("Live Investigation");
    setProgress(10);
    setDuration(0);
    const started = Date.now();
    let timer: ReturnType<typeof setInterval> | null = null;
    try {
      timer = setInterval(() => {
        setProgress((current) =>
          current < 90 ? Math.min(current + 4, 90) : current,
        );
      }, 500);
      const result = await investigateOneAddress(address, caseId);
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      const elapsed = Number(((Date.now() - started) / 1000).toFixed(1));
      const investigationRecord: PersistedInvestigation = {
        caseId,
        caseName: activeCase.name,
        wallet: result.rootWallet,
        root: result.rootWallet,
        depth,
        nodes: result.nodeCount,
        edges: result.edgeCount,
        maxDepth: result.maxDiscoveredDepth,
        levels: result.levels,
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
        result: result.investigation,
      };
      saveInvestigationLocally(investigationRecord);
      setCaseInvestigation(investigationRecord);
      setProgress(100);
      setDuration(elapsed);
      setStats({
        wallet: result.rootWallet,
        nodes: result.nodeCount,
        edges: result.edgeCount,
        maxDepth: result.maxDiscoveredDepth,
        levels: result.levels,
      });
      setStatus("Completed");
      setResultSource("Live Investigation");
      await loadCaseWallets(caseId);
      onInvestigationComplete();
    } catch (error) {
      console.error("Investigation failed:", error);
      if (timer) {
        clearInterval(timer);
      }
      setStatus("Failed");
      setProgress(0);
      setResultSource("None");
    } finally {
      setLoading(false);
    }
  }
  /* =============================================================
     INVESTIGATE CASE
     IMPORTANT:
     Uses the RETURN VALUE from loadCaseWallets()
     instead of immediately reading stale React state.
  ============================================================= */
  async function investigateCase() {
    if (!activeCase) {
      alert("Select an investigation case first.");
      return;
    }
    const caseId = String(activeCase.id);
    const walletsToInvestigate = await loadCaseWallets(caseId);
    if (walletsToInvestigate.length === 0) {
      alert(
        "This case has no attached wallets yet. Attach at least one wallet address above, then investigate.",
      );
      return;
    }
    setInvestigatingCase(true);
    setLoading(true);
    setStatus("Running");
    setResultSource("Live Investigation");
    setProgress(5);
    setDuration(0);
    setCaseProgress({
      done: 0,
      total: walletsToInvestigate.length,
    });
    const started = Date.now();
    let aggregatedNodes = 0;
    let aggregatedEdges = 0;
    let combinedLevels: Record<number, number> = {};
    let maxDiscoveredDepth = depth;
    const investigationResults: Record<string, unknown> = {};
    const failures: string[] = [];
    try {
      for (let i = 0; i < walletsToInvestigate.length; i++) {
        const wallet = walletsToInvestigate[i];
        try {
          const result = await investigateOneAddress(wallet.address, caseId);
          aggregatedNodes += result.nodeCount;
          aggregatedEdges += result.edgeCount;
          maxDiscoveredDepth = Math.max(
            maxDiscoveredDepth,
            result.maxDiscoveredDepth,
          );
          for (const [level, count] of Object.entries(result.levels)) {
            const levelNumber = Number(level);
            combinedLevels[levelNumber] =
              (combinedLevels[levelNumber] ?? 0) + count;
          }
          investigationResults[wallet.address] = result.investigation;
        } catch (walletError) {
          console.error(
            `Investigation failed for ${wallet.address}:`,
            walletError,
          );
          failures.push(wallet.address);
        }
        setCaseProgress({
          done: i + 1,
          total: walletsToInvestigate.length,
        });
        setProgress(
          5 + Math.round(((i + 1) / walletsToInvestigate.length) * 90),
        );
      }
      const elapsed = Number(((Date.now() - started) / 1000).toFixed(1));
      const walletAddresses = walletsToInvestigate.map(
        (wallet) => wallet.address,
      );
      const walletLabel = walletAddresses.join(", ");
      /*
       * We store the individual investigation
       * results instead of only the last wallet.
       */
      const investigationRecord: PersistedInvestigation = {
        caseId,
        caseName: activeCase.name,
        wallet: walletLabel,
        root: walletAddresses[0] ?? "",
        depth,
        nodes: aggregatedNodes,
        edges: aggregatedEdges,
        maxDepth: maxDiscoveredDepth,
        levels: combinedLevels,
        status: failures.length > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
        completedAt: new Date().toISOString(),
        result: investigationResults,
      };
      saveInvestigationLocally(investigationRecord);
      setCaseInvestigation(investigationRecord);
      setAddress(walletAddresses[0] ?? "");
      setProgress(100);
      setDuration(elapsed);
      setStats({
        wallet: walletLabel,
        nodes: aggregatedNodes,
        edges: aggregatedEdges,
        maxDepth: maxDiscoveredDepth,
        levels: combinedLevels,
      });
      setStatus(failures.length > 0 ? "Failed" : "Completed");
      setResultSource("Live Investigation");
      if (failures.length > 0) {
        alert(
          `Investigated ${walletsToInvestigate.length - failures.length} of ${
            walletsToInvestigate.length
          } wallets.\n\nFailed:\n${failures.join("\n")}`,
        );
      }
      onInvestigationComplete();
    } catch (error) {
      console.error("Case investigation failed:", error);
      setStatus("Failed");
      setProgress(0);
      setResultSource("None");
    } finally {
      setInvestigatingCase(false);
      setLoading(false);
    }
  }
  /* =============================================================
     REFRESH CASE RESULT
  ============================================================= */
  async function refreshCaseResult() {
    if (!activeCase) {
      return;
    }
    await loadCaseInvestigation(String(activeCase.id));
    await loadCaseWallets(String(activeCase.id));
    onInvestigationComplete();
  }
  /* =============================================================
     OSINT — SCAN ONE WALLET
  ============================================================= */
  async function scanOneWalletOSINT(
    walletAddress: string,
    caseId: string,
  ): Promise<OsintOneResult> {
    const cleanAddress = walletAddress.trim();
    if (!cleanAddress) {
      throw new Error("Wallet address is empty.");
    }
    /*
     * IMPORTANT:
     *
     * OSINT endpoint receives ONE address only.
     *
     * Previously stats.wallet could contain:
     *
     * walletA, walletB, walletC
     *
     * which caused:
     *
     * /api/osint/walletA,%20walletB,%20walletC
     *
     * and the backend correctly returned:
     *
     * Wallet not found
     */
    const response = await fetch(
      `${API_BASE}/api/osint/${encodeURIComponent(
        cleanAddress,
      )}?case_id=${encodeURIComponent(caseId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
    let responseObject: any = {};
    try {
      responseObject = await response.json();
    } catch {
      responseObject = {};
    }
    if (!response.ok) {
      throw new Error(
        typeof responseObject.detail === "string"
          ? responseObject.detail
          : "OSINT scan failed",
      );
    }
    return {
      wallet: cleanAddress,
      result: responseObject,
    };
  }
  /* =============================================================
     OSINT
     FIX:
     Scan each attached wallet independently.
  ============================================================= */
  async function scanOSINT() {
    if (!activeCase) {
      alert("Select an investigation case before running OSINT.");
      return;
    }
    const caseId = String(activeCase.id);
    /*
     * Always get the freshest wallet list.
     */
    const freshWallets = await loadCaseWallets(caseId);
    /*
     * If the case has attached wallets,
     * use them individually.
     *
     * This is the preferred path because
     * stats.wallet may contain multiple
     * comma-separated addresses.
     */
    let walletsForOSINT = freshWallets
      .map((wallet) => wallet.address.trim())
      .filter(Boolean);
    /*
     * Fallback for an ad-hoc single-wallet
     * investigation.
     *
     * stats.wallet can contain multiple
     * addresses, so only use it directly
     * when it contains exactly one.
     */
    if (
      walletsForOSINT.length === 0 &&
      stats.wallet &&
      !stats.wallet.includes(",")
    ) {
      walletsForOSINT = [stats.wallet.trim()];
    }
    /*
     * Last fallback:
     * use the manual address field.
     */
    if (walletsForOSINT.length === 0 && address.trim()) {
      walletsForOSINT = [address.trim()];
    }
    if (walletsForOSINT.length === 0) {
      alert(
        "No wallet is available for OSINT. Run the blockchain investigation or attach a wallet to this case first.",
      );
      return;
    }
    /*
     * Remove duplicate wallet addresses.
     */
    walletsForOSINT = Array.from(new Set(walletsForOSINT));
    try {
      setOsintLoading(true);
      setOsintStatus("Scanning");
      const osintResults: Record<string, unknown> = {};
      const failures: string[] = [];
      for (let i = 0; i < walletsForOSINT.length; i++) {
        const wallet = walletsForOSINT[i];
        try {
          const scanResult = await scanOneWalletOSINT(wallet, caseId);
          osintResults[wallet] = scanResult.result;
        } catch (walletError) {
          console.error(`OSINT failed for ${wallet}:`, walletError);
          failures.push(wallet);
        }
      }
      /*
       * If every wallet failed, OSINT genuinely failed.
       */
      if (failures.length === walletsForOSINT.length) {
        setOsintStatus("Failed");
        alert(
          `OSINT could not find any of the ${
            walletsForOSINT.length
          } investigated wallet${
            walletsForOSINT.length === 1 ? "" : "s"
          }.\n\n${failures.join("\n")}`,
        );
        return;
      }
      /*
       * At least one wallet succeeded.
       *
       * Persist all successful results.
       */
      const existing = loadLocalCaseInvestigation(caseId);
      const baseInvestigation = existing ||
        caseInvestigation || {
          caseId,
          caseName: activeCase.name,
        };
      const updatedInvestigation: PersistedInvestigation = {
        ...baseInvestigation,
        wallet: stats.wallet || walletsForOSINT.join(", "),
        root: stats.wallet || walletsForOSINT[0],
        depth,
        nodes: stats.nodes,
        edges: stats.edges,
        maxDepth: stats.maxDepth,
        levels: stats.levels,
        status: "COMPLETED",
        osint: {
          completed: true,
          completedAt: new Date().toISOString(),
          wallet: walletsForOSINT.join(", "),
          wallets: walletsForOSINT,
          results: osintResults,
          failures,
          /*
           * Keep result for backwards
           * compatibility with your
           * previous persisted structure.
           */
          result:
            walletsForOSINT.length === 1
              ? osintResults[walletsForOSINT[0]]
              : osintResults,
        },
        updatedAt: new Date().toISOString(),
      };
      saveInvestigationLocally(updatedInvestigation);
      setCaseInvestigation(updatedInvestigation);
      setOsintStatus(failures.length > 0 ? "Completed" : "Completed");
      if (failures.length > 0) {
        alert(
          `OSINT completed for ${walletsForOSINT.length - failures.length} of ${
            walletsForOSINT.length
          } wallets.\n\nNot found / failed:\n${failures.join("\n")}`,
        );
      }
      onInvestigationComplete();
    } catch (error) {
      console.error("OSINT scan failed:", error);
      setOsintStatus("Failed");
    } finally {
      setOsintLoading(false);
    }
  }
  /* =============================================================
     REPORT CONTEXT
  ============================================================= */
  function prepareReportContext() {
    if (!activeCase) {
      alert("Select a case before creating a report.");
      return;
    }
    if (!stats.wallet) {
      alert("Complete an investigation before creating a report.");
      return;
    }
    const reportContext = {
      caseId: String(activeCase.id),
      caseName: activeCase.name,
      wallet: stats.wallet,
      nodes: stats.nodes,
      edges: stats.edges,
      maxDepth: stats.maxDepth,
      depth,
      levels: stats.levels,
      osintCompleted: osintStatus === "Completed",
      generatedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      `gatekeeper:report-context:${activeCase.id}`,
      JSON.stringify(reportContext),
    );
    window.dispatchEvent(
      new CustomEvent("gatekeeper:create-report", {
        detail: reportContext,
      }),
    );
    alert(`Report context prepared for case ${activeCase.name}.`);
  }
  /* =============================================================
     STATUS CONFIG
  ============================================================= */
  const statusConfig = {
    Idle: {
      classes: "border-white/[0.07] bg-white/[0.025] text-slate-500",
      glow: "",
    },
    Loading: {
      classes: "border-violet-400/40 bg-violet-400/[0.08] text-violet-300",
      glow: "shadow-[0_0_15px_rgba(167,139,250,0.15)]",
    },
    Running: {
      classes: "border-cyan-400/40 bg-cyan-400/[0.08] text-cyan-300",
      glow: "shadow-[0_0_15px_rgba(34,211,238,0.15)]",
    },
    Completed: {
      classes: "border-emerald-400/40 bg-emerald-400/[0.08] text-emerald-300",
      glow: "shadow-[0_0_15px_rgba(52,211,153,0.15)]",
    },
    Failed: {
      classes: "border-red-400/40 bg-red-400/[0.08] text-red-300",
      glow: "shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    },
  }[status];
  /* =============================================================
     UI
  ============================================================= */
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#080d17]/80 backdrop-blur-xl">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      {/* =========================================================
          HEADER
      ========================================================= */}
      <div className="flex flex-col gap-3 border-b border-white/[0.05] bg-white/[0.01] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`
              flex h-9 w-9 shrink-0
              items-center justify-center
              rounded-xl border
              backdrop-blur-md
              transition-all duration-300
              ${
                status === "Running"
                  ? "border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  : status === "Completed"
                    ? "border-emerald-400/30 bg-emerald-400/[0.06]"
                    : status === "Failed"
                      ? "border-red-400/30 bg-red-400/[0.06]"
                      : status === "Loading"
                        ? "border-violet-400/30 bg-violet-400/[0.06]"
                        : "border-white/[0.08] bg-white/[0.02]"
              }
            `}
          >
            {status === "Running" ? (
              <Activity size={16} className="animate-pulse text-cyan-400" />
            ) : status === "Loading" ? (
              <Loader2 size={16} className="animate-spin text-violet-400" />
            ) : (
              <ShieldAlert
                size={16}
                className={
                  status === "Failed"
                    ? "text-red-400"
                    : status === "Completed"
                      ? "text-emerald-400"
                      : "text-slate-400"
                }
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80">
              Gatekeeper Engine
            </div>
            <div className="mt-0.5 truncate text-sm font-semibold text-slate-200">
              Blockchain Topology Discovery
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeCase && (
            <div className="flex items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-400/[0.05] px-3 py-1.5">
              <FolderSearch size={12} className="text-violet-300" />
              <div className="max-w-[220px] truncate font-mono text-[9px] font-bold uppercase tracking-widest text-violet-300">
                {activeCase.name}
              </div>
            </div>
          )}
          {resultSource !== "None" && (
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-1.5">
              <History
                size={11}
                className={
                  resultSource === "Live Investigation"
                    ? "text-cyan-400"
                    : "text-violet-400"
                }
              />
              <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-slate-400">
                {resultSource}
              </span>
            </div>
          )}
          <div
            className={`
              w-fit rounded-lg border px-3 py-1.5
              font-mono text-[9px]
              font-bold uppercase tracking-widest
              transition-all duration-300
              ${statusConfig.classes}
              ${statusConfig.glow}
            `}
          >
            {status}
          </div>
        </div>
      </div>
      {/* =========================================================
          LOADING PREVIOUS CASE
      ========================================================= */}
      {loadingCaseResult && activeCase && (
        <div className="border-b border-violet-400/10 bg-violet-400/[0.025] px-5 py-3">
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="animate-spin text-violet-400" />
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-violet-300">
              RESTORING CASE INVESTIGATION
            </div>
            <span className="font-mono text-[8px] text-slate-600">
              Loading persisted forensic results...
            </span>
          </div>
        </div>
      )}
      {/* =========================================================
          NO CASE
      ========================================================= */}
      {!activeCase && (
        <div className="border-b border-amber-400/10 bg-amber-400/[0.025] px-5 py-4">
          <div className="flex items-start gap-3">
            <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-400" />
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">
                INVESTIGATION LOCKED
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Select or create an investigation case above before running
                blockchain analysis. All investigation results and reports will
                be associated with the selected case.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* =========================================================
          ACTIVE CASE
      ========================================================= */}
      {activeCase && (
        <div className="border-b border-white/[0.05] bg-violet-400/[0.015] px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] font-bold tracking-[0.16em] text-slate-600">
                ACTIVE CASE
              </span>
              <span className="font-mono text-[10px] font-bold text-violet-300">
                GK-
                {String(activeCase.id).padStart(4, "0")}
              </span>
            </div>
            <div className="h-3 w-px bg-white/[0.08]" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] font-bold tracking-[0.16em] text-slate-600">
                STATUS
              </span>
              <span className="font-mono text-[9px] font-bold uppercase text-emerald-300">
                {activeCase.status}
              </span>
            </div>
            <div className="h-3 w-px bg-white/[0.08]" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] font-bold tracking-[0.16em] text-slate-600">
                WORKFLOW
              </span>
              <span className="font-mono text-[9px] text-slate-400">
                CASE → TRACE → OSINT → GRAPH → REPORT
              </span>
            </div>
          </div>
        </div>
      )}
      {/* =========================================================
          PREVIOUS CASE RESULT
      ========================================================= */}
      {activeCase && resultSource === "Previous Case" && stats.wallet && (
        <div className="border-b border-emerald-400/10 bg-emerald-400/[0.025] px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06]">
                <History size={13} className="text-emerald-400" />
              </div>
              <div>
                <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                  PREVIOUS INVESTIGATION RESTORED
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  Results for this case were recovered from the persisted
                  investigation record.
                </div>
              </div>
            </div>
            <button
              onClick={refreshCaseResult}
              disabled={loadingCaseResult}
              className="flex h-8 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 font-mono text-[8px] font-bold tracking-widest text-slate-400 transition-all hover:border-cyan-400/30 hover:text-cyan-300 disabled:opacity-50"
            >
              <RefreshCw
                size={11}
                className={loadingCaseResult ? "animate-spin" : ""}
              />
              REFRESH CASE RESULT
            </button>
          </div>
        </div>
      )}
      {/* =========================================================
          MAIN
      ========================================================= */}
      <div className="p-5">
        {/* PRIMARY ACTION */}
        <div className="grid min-w-0 gap-3 lg:grid-cols-[auto_150px]">
          <button
            disabled={loading || !activeCase || caseWallets.length === 0}
            onClick={investigateCase}
            className="group flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/[0.08] px-5 font-mono text-[10px] font-bold tracking-wider text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all hover:border-cyan-400/50 hover:bg-cyan-400/[0.15] hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] disabled:cursor-not-allowed disabled:border-white/[0.05] disabled:bg-white/[0.02] disabled:text-slate-500 disabled:shadow-none"
          >
            {investigatingCase ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <PlayCircle
                size={14}
                className="transition-transform group-hover:scale-110"
              />
            )}
            {investigatingCase
              ? `TRACING ${caseProgress.done}/${caseProgress.total}`
              : caseWallets.length > 0
                ? `INVESTIGATE CASE (${caseWallets.length} WALLET${
                    caseWallets.length === 1 ? "" : "S"
                  })`
                : "INVESTIGATE CASE"}
          </button>
          <div className="relative">
            <Layers3
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/60"
            />
            <select
              value={depth}
              onChange={(event) => setDepth(Number(event.target.value))}
              disabled={loading || !activeCase}
              className="h-11 w-full appearance-none rounded-xl border border-white/[0.07] bg-[#04070a]/50 pl-9 pr-3 font-mono text-[10px] font-semibold text-slate-300 outline-none transition-all focus:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={1}>DEPTH 1</option>
              <option value={2}>DEPTH 2</option>
              <option value={3}>DEPTH 3</option>
            </select>
          </div>
        </div>
        {activeCase && !loadingCaseWallets && caseWallets.length === 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/10 bg-amber-400/[0.03] px-3 py-2">
            <ShieldAlert size={12} className="shrink-0 text-amber-400" />
            <span className="font-mono text-[8px] leading-4 tracking-wide text-amber-300/70">
              NO WALLETS ATTACHED — attach at least one wallet address to this
              case above, then investigate.
            </span>
          </div>
        )}
        {/* SECONDARY */}
        <div className="mt-4 border-t border-white/[0.05] pt-4">
          <div className="mb-2 font-mono text-[8px] font-bold tracking-[0.16em] text-slate-600">
            OR INVESTIGATE ONE SPECIFIC ADDRESS
          </div>
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="relative min-w-0 group">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-400"
              />
              <input
                disabled={loading || !activeCase}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder={
                  activeCase
                    ? "Enter BTC / ETH wallet address..."
                    : "Select a case first..."
                }
                className="h-10 w-full rounded-xl border border-white/[0.07] bg-[#04070a]/50 pl-9 pr-4 font-mono text-[11px] text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-cyan-400/40 focus:bg-cyan-400/[0.02] focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <button
              disabled={loading || !activeCase}
              onClick={() =>
                setAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
              }
              className="h-10 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 font-mono text-[10px] font-bold tracking-wider text-slate-400 transition-all hover:border-cyan-400/30 hover:bg-cyan-400/[0.04] hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              DEMO
            </button>
            <button
              disabled={loading || !activeCase || !address.trim()}
              onClick={startInvestigation}
              className="group flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 font-mono text-[10px] font-bold tracking-wider text-slate-300 transition-all hover:border-cyan-400/30 hover:bg-cyan-400/[0.05] hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && !investigatingCase ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <PlayCircle size={14} />
              )}
              {loading && !investigatingCase ? "TRACING" : "INVESTIGATE"}
            </button>
          </div>
        </div>
        {/* DEPTH WARNING */}
        {depth >= 3 && !loading && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/10 bg-amber-400/[0.03] px-3 py-2">
            <ShieldAlert size={12} className="shrink-0 text-amber-400" />
            <span className="font-mono text-[8px] leading-4 tracking-wide text-amber-300/70">
              DEEP TRACE — blockchain topology may expand significantly
            </span>
          </div>
        )}
        {/* PROGRESS */}
        <div className="mt-5">
          <div className="flex items-center justify-between font-mono text-[9px] font-semibold tracking-widest">
            <span className="text-slate-500">TOPOLOGY DISCOVERY</span>
            <span className="text-cyan-400">{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40 shadow-inner">
            <div
              className="relative h-full rounded-full bg-cyan-400 transition-all duration-300 shadow-[0_0_12px_rgba(34,211,238,0.45)]"
              style={{
                width: `${progress}%`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="absolute right-0 top-0 h-full w-4 bg-white/50 blur-[2px]" />
            </div>
          </div>
        </div>
        {/* RESULT TELEMETRY */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Telemetry
            icon={<Wallet size={14} />}
            label="WALLETS"
            value={stats.nodes}
            highlight={stats.nodes > 0}
          />
          <Telemetry
            icon={<Network size={14} />}
            label="TRANSACTIONS"
            value={stats.edges}
            highlight={stats.edges > 0}
          />
          <Telemetry
            icon={<Layers3 size={14} />}
            label="MAX DEPTH"
            value={stats.maxDepth > 0 ? `L${stats.maxDepth}` : "-"}
            highlight={stats.maxDepth > 0}
          />
          <Telemetry
            icon={<Clock3 size={14} />}
            label="DURATION"
            value={duration > 0 ? `${duration}s` : "-"}
            highlight={duration > 0}
          />
          <Telemetry
            icon={<Database size={14} />}
            label="ROOT NODE"
            value={stats.wallet ? `${stats.wallet.slice(0, 10)}...` : "-"}
            highlight={!!stats.wallet}
          />
        </div>
        {/* CASE RESULT */}
        {stats.wallet && (
          <div className="mt-5 overflow-hidden rounded-xl border border-emerald-400/10 bg-emerald-400/[0.015]">
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06]">
                  <Target size={14} className="text-emerald-400" />
                </div>
                <div>
                  <div className="font-mono text-[9px] font-bold tracking-[0.18em] text-emerald-300">
                    CASE INVESTIGATION RESULT
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-600">
                    Persisted forensic investigation associated with this case
                  </div>
                </div>
              </div>
              <div className="font-mono text-[8px] font-bold uppercase tracking-widest text-emerald-400/60">
                {resultSource}
              </div>
            </div>
            <div className="grid gap-px bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-4">
              <ResultField
                label="CASE"
                value={`GK-${String(activeCase?.id ?? "").padStart(4, "0")}`}
              />
              <ResultField label="ROOT WALLET" value={stats.wallet} mono />
              <ResultField label="TRACE DEPTH" value={`LEVEL ${depth}`} />
              <ResultField
                label="INVESTIGATION"
                value={
                  status === "Completed" ? "COMPLETED" : status.toUpperCase()
                }
              />
            </div>
          </div>
        )}
        {/* DISCOVERY LEVELS */}
        {stats.nodes > 0 && (
          <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.05] bg-[#04070a]/40">
            <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
              <div>
                <div className="font-mono text-[8px] font-bold tracking-[0.18em] text-cyan-400/70">
                  DISCOVERY LAYERS
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  Wallet expansion by investigation depth
                </div>
              </div>
              <div className="font-mono text-[8px] text-slate-600">
                ROOT → NETWORK
              </div>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {Array.from(
                {
                  length: Math.max(depth + 1, stats.maxDepth + 1),
                },
                (_, index) => index,
              ).map((level) => {
                const count = stats.levels[level] ?? 0;
                const maxCount = Math.max(...Object.values(stats.levels), 1);
                const percentage = (count / maxCount) * 100;
                return (
                  <div
                    key={level}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <div className="w-12 shrink-0 font-mono text-[8px] font-bold text-slate-500">
                      L{level}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                        <div
                          className="h-full rounded-full bg-cyan-400/70 transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right font-mono text-[9px] font-bold text-slate-300">
                      {count}
                    </div>
                    <ChevronRight size={11} className="text-slate-700" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* WORKFLOW */}
        {activeCase && (
          <div className="mt-5 rounded-xl border border-white/[0.05] bg-white/[0.015] p-4">
            <div className="mb-3">
              <div className="font-mono text-[8px] font-bold tracking-[0.18em] text-slate-500">
                CASE INVESTIGATION WORKFLOW
              </div>
              <div className="mt-1 text-[10px] text-slate-600">
                Evidence and intelligence remain associated with the active
                case.
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <WorkflowStep
                number="01"
                label="TRACE"
                completed={status === "Completed"}
                active={status === "Running"}
              />
              <WorkflowStep
                number="02"
                label="OSINT"
                completed={osintStatus === "Completed"}
                active={osintStatus === "Scanning"}
              />
              <WorkflowStep
                number="03"
                label="GRAPH"
                completed={status === "Completed"}
                active={false}
              />
              <WorkflowStep
                number="04"
                label="REPORT"
                completed={false}
                active={false}
              />
            </div>
          </div>
        )}
        {/* ACTIONS */}
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/[0.05] pt-5">
          <button
            onClick={refreshCaseResult}
            disabled={!activeCase || loadingCaseResult}
            className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 font-mono text-[9px] font-bold tracking-widest text-slate-400 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw
              size={12}
              className={loadingCaseResult ? "animate-spin" : ""}
            />
            REFRESH CASE
          </button>
          {/* OSINT */}
          {status === "Completed" && (
            <button
              disabled={osintLoading || !activeCase}
              onClick={scanOSINT}
              className="group flex h-9 items-center gap-2 rounded-lg border border-violet-400/30 bg-violet-400/[0.08] px-4 font-mono text-[9px] font-bold tracking-widest text-violet-300 shadow-[0_0_15px_rgba(167,139,250,0.1)] transition-all hover:border-violet-400/50 hover:bg-violet-400/[0.12] hover:shadow-[0_0_20px_rgba(167,139,250,0.2)] disabled:opacity-50"
            >
              {osintLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Search
                  size={12}
                  className="transition-transform group-hover:scale-110"
                />
              )}
              {osintLoading ? "SCANNING OSINT..." : "CORRELATE OSINT"}
            </button>
          )}
          {osintStatus === "Completed" && (
            <div className="flex h-9 items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] px-4 font-mono text-[9px] font-bold tracking-widest text-emerald-300">
              <CheckCircle2 size={12} />
              OSINT COMPLETE
            </div>
          )}
          {osintStatus === "Failed" && (
            <div className="flex h-9 items-center gap-2 rounded-lg border border-red-400/20 bg-red-400/[0.08] px-4 font-mono text-[9px] font-bold tracking-widest text-red-300">
              <XCircle size={12} />
              OSINT FAILED
            </div>
          )}
          {/* REPORT */}
          {status === "Completed" && (
            <button
              onClick={prepareReportContext}
              disabled={!activeCase}
              className="group flex h-9 items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/[0.06] px-4 font-mono text-[9px] font-bold tracking-widest text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-400/[0.12] hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileText
                size={12}
                className="transition-transform group-hover:scale-110"
              />
              PREPARE CASE REPORT
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
/* ===============================================================
   RESULT FIELD
=============================================================== */
function ResultField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 bg-[#04070a]/60 px-4 py-3">
      <div className="font-mono text-[7px] font-bold tracking-[0.18em] text-slate-600">
        {label}
      </div>
      <div
        className={`
          mt-1.5 truncate text-[10px] font-semibold
          ${mono ? "font-mono text-emerald-300" : "text-slate-300"}
        `}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
/* ===============================================================
   WORKFLOW STEP
=============================================================== */
function WorkflowStep({
  number,
  label,
  completed,
  active,
}: {
  number: string;
  label: string;
  completed: boolean;
  active: boolean;
}) {
  return (
    <div
      className={`
        flex items-center gap-3 rounded-lg border px-3 py-2.5
        ${
          completed
            ? "border-emerald-400/20 bg-emerald-400/[0.04]"
            : active
              ? "border-cyan-400/25 bg-cyan-400/[0.04]"
              : "border-white/[0.05] bg-black/20"
        }
      `}
    >
      <div
        className={`
          flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border
          font-mono text-[8px] font-bold
          ${
            completed
              ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300"
              : active
                ? "border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300"
                : "border-white/[0.07] bg-white/[0.02] text-slate-600"
          }
        `}
      >
        {completed ? <CheckCircle2 size={13} /> : number}
      </div>
      <div>
        <div
          className={`
            font-mono text-[9px] font-bold tracking-widest
            ${
              completed
                ? "text-emerald-300"
                : active
                  ? "text-cyan-300"
                  : "text-slate-500"
            }
          `}
        >
          {label}
        </div>
        <div className="mt-0.5 font-mono text-[7px] uppercase tracking-wider text-slate-700">
          {completed ? "COMPLETE" : active ? "RUNNING" : "PENDING"}
        </div>
      </div>
    </div>
  );
}
/* ===============================================================
   TELEMETRY
=============================================================== */
function Telemetry({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`
        min-w-0 rounded-xl border p-3
        transition-all duration-300
        ${
          highlight
            ? "border-cyan-400/20 bg-cyan-400/[0.03] shadow-[inset_0_0_20px_rgba(34,211,238,0.02)]"
            : "border-white/[0.05] bg-[#04070a]/50"
        }
      `}
    >
      <div
        className={`
          flex items-center gap-2
          ${highlight ? "text-cyan-400/70" : "text-slate-500"}
        `}
      >
        {icon}
        <span className="font-mono text-[8px] font-bold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div
        className={`
          mt-1.5 truncate font-mono text-xs font-bold
          ${highlight ? "text-cyan-300" : "text-slate-300"}
        `}
      >
        {value}
      </div>
    </div>
  );
}
