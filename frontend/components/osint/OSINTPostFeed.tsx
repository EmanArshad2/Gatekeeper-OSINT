"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Filter,
  RefreshCw,
  Radio,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import OSINTPostCard, { type OSINTPost } from "./OSINTPostCard";
/* ==========================================================================
   API CONFIGURATION
========================================================================== */
const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8000";
function normalizeApiUrl(value: string) {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/api$/i, "")
    .replace(/\/api$/i, "");
}
const API_BASE_URL = normalizeApiUrl(RAW_API_URL);
function apiUrl(path: string) {
  const cleanPath = path.replace(/^\/+/, "");
  return `${API_BASE_URL}/api/${cleanPath}`;
}
/* ==========================================================================
   CONSTANTS
========================================================================== */
const POLL_INTERVAL = 15000;
const KEYWORD_REFRESH_INTERVAL = 60000;
const REQUEST_TIMEOUT = 12000;
const POSTS_LIMIT = 20;
const FILTERS: { label: string; value: string | null }[] = [
  { label: "ALL", value: null },
  { label: "TELEGRAM", value: "telegram" },
  { label: "WEBSITE", value: "website" },
  { label: "X / TWITTER", value: "twitter" },
  { label: "UPLOADS", value: "upload" },
];
/* ==========================================================================
   TYPES
========================================================================== */
interface OSINTPostsResponse {
  status?: string;
  total?: number;
  count?: number;
  posts?: OSINTPost[];
}
interface KeywordsResponse {
  status?: string;
  keywords?: string[];
  message?: string;
}
export interface OSINTPostFeedProps {
  /**
   * Optional controlled keyword selection.
   *
   * If supplied, the parent controls the selected keywords.
   * If omitted, this component manages the selection itself.
   */
  selectedKeywords?: string[];
  /**
   * Current keyword matching mode.
   */
  keywordMode?: "any" | "all";
  /**
   * Called whenever the keyword selection changes.
   */
  onKeywordsChange?: (keywords: string[]) => void;
  /**
   * Called whenever ANY/ALL mode changes.
   */
  onKeywordModeChange?: (mode: "any" | "all") => void;
}
/* ==========================================================================
   FETCH HELPER
========================================================================== */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT,
) {
  const externalSignal = options.signal;
  const controller = new AbortController();
  let timeoutId: number | undefined;
  const abortFromExternalSignal = () => {
    controller.abort();
  };
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", abortFromExternalSignal, {
        once: true,
      });
    }
  }
  timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeout);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }
}
/* ==========================================================================
   NORMALIZATION
========================================================================== */
function normalizeKeyword(keyword: string) {
  return keyword.trim().toLowerCase();
}
function uniqueKeywords(keywords: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const keyword of keywords) {
    const cleaned = keyword.trim();
    if (!cleaned) {
      continue;
    }
    const normalized = normalizeKeyword(cleaned);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(cleaned);
  }
  return result;
}
/* ==========================================================================
   COMPONENT
========================================================================== */
export default function OSINTPostFeed({
  selectedKeywords: controlledKeywords,
  keywordMode: controlledKeywordMode,
  onKeywordsChange,
  onKeywordModeChange,
}: OSINTPostFeedProps) {
  const router = useRouter();
  /* ==========================================================================
     STATE
  ========================================================================== */
  const [posts, setPosts] = useState<OSINTPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [online, setOnline] = useState(false);
  /* Backend keyword registry */
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(true);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);
  /* Keyword UI */
  const [keywordSearch, setKeywordSearch] = useState("");
  const [showKeywordPanel, setShowKeywordPanel] = useState(true);
  /* Internal keyword selection */
  const [internalKeywords, setInternalKeywords] = useState<string[]>([]);
  /* Internal keyword mode */
  const [internalKeywordMode, setInternalKeywordMode] = useState<"any" | "all">(
    "any",
  );
  /* Abort / lifecycle */
  const mountedRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const keywordRequestRef = useRef<AbortController | null>(null);
  /* ==========================================================================
     EFFECTIVE KEYWORD STATE
  ========================================================================== */
  const selectedKeywords = useMemo(() => {
    return uniqueKeywords(
      controlledKeywords !== undefined ? controlledKeywords : internalKeywords,
    );
  }, [controlledKeywords, internalKeywords]);
  const keywordMode = controlledKeywordMode ?? internalKeywordMode;
  /* ==========================================================================
     UPDATE KEYWORDS
  ========================================================================== */
  const updateSelectedKeywords = useCallback(
    (nextKeywords: string[]) => {
      const cleaned = uniqueKeywords(nextKeywords);
      /*
       * Always update internal state.
       *
       * This allows the component to work correctly when the parent
       * doesn't provide selectedKeywords.
       */
      setInternalKeywords(cleaned);
      /*
       * If the component is controlled, notify the parent.
       */
      onKeywordsChange?.(cleaned);
    },
    [onKeywordsChange],
  );
  /* ==========================================================================
     TOGGLE KEYWORD
  ========================================================================== */
  const toggleKeyword = useCallback(
    (keyword: string) => {
      const normalizedKeyword = normalizeKeyword(keyword);
      const exists = selectedKeywords.some(
        (item) => normalizeKeyword(item) === normalizedKeyword,
      );
      const nextKeywords = exists
        ? selectedKeywords.filter(
            (item) => normalizeKeyword(item) !== normalizedKeyword,
          )
        : [...selectedKeywords, keyword];
      updateSelectedKeywords(nextKeywords);
    },
    [selectedKeywords, updateSelectedKeywords],
  );
  /* ==========================================================================
     CLEAR KEYWORDS
  ========================================================================== */
  const clearKeywords = useCallback(() => {
    updateSelectedKeywords([]);
  }, [updateSelectedKeywords]);
  /* ==========================================================================
     KEYWORD MODE
  ========================================================================== */
  const updateKeywordMode = useCallback(
    (mode: "any" | "all") => {
      setInternalKeywordMode(mode);
      onKeywordModeChange?.(mode);
    },
    [onKeywordModeChange],
  );
  /* ==========================================================================
     LOAD BACKEND KEYWORDS
  ========================================================================== */
  const loadKeywords = useCallback(async () => {
    keywordRequestRef.current?.abort();
    const controller = new AbortController();
    keywordRequestRef.current = controller;
    try {
      if (mountedRef.current) {
        setKeywordsLoading(true);
        setKeywordsError(null);
      }
      const endpoint = apiUrl("keywords");
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        },
        REQUEST_TIMEOUT,
      );
      if (!response.ok) {
        throw new Error(`Keywords request failed: ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Keywords endpoint returned a non-JSON response");
      }
      const data: KeywordsResponse = await response.json();
      if (data.status && data.status !== "SUCCESS") {
        throw new Error(data.message || "Failed to load intelligence keywords");
      }
      const keywords = Array.isArray(data.keywords)
        ? uniqueKeywords(
            data.keywords.map((keyword) => String(keyword)).filter(Boolean),
          )
        : [];
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }
      setAvailableKeywords(keywords);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      console.error("[OSINT] Keywords load error:", err);
      if (mountedRef.current) {
        setKeywordsError("Keyword registry unavailable");
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setKeywordsLoading(false);
      }
    }
  }, []);
  /* ==========================================================================
     LOAD POSTS
  ========================================================================== */
  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      if (mountedRef.current) {
        setLoading(true);
      }
      const params = new URLSearchParams();
      params.set("limit", String(POSTS_LIMIT));
      /* SOURCE FILTER */
      if (sourceFilter) {
        params.set("source_type", sourceFilter);
      }
      /* KEYWORD FILTER */
      if (selectedKeywords.length > 0) {
        params.set("keywords", selectedKeywords.join(","));
        params.set("keyword_mode", keywordMode);
      }
      const endpoint = `${apiUrl("osint/posts")}?${params.toString()}`;
      console.debug("[OSINT] Loading posts:", endpoint);
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        },
        REQUEST_TIMEOUT,
      );
      if (!response.ok) {
        throw new Error(`OSINT posts returned ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("OSINT posts returned a non-JSON response");
      }
      const data: OSINTPostsResponse = await response.json();
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }
      const incomingPosts = Array.isArray(data.posts) ? data.posts : [];
      setPosts(incomingPosts);
      setTotal(
        typeof data.total === "number"
          ? data.total
          : typeof data.count === "number"
            ? data.count
            : incomingPosts.length,
      );
      setOnline(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      console.error("[OSINT] Posts load error:", err);
      if (mountedRef.current) {
        setOnline(false);
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [sourceFilter, selectedKeywords, keywordMode]);
  /* ==========================================================================
     INITIAL LOAD
  ========================================================================== */
  useEffect(() => {
    mountedRef.current = true;
    void loadKeywords();
    void load();
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      keywordRequestRef.current?.abort();
      requestRef.current = null;
      keywordRequestRef.current = null;
    };
  }, [load, loadKeywords]);
  /* ==========================================================================
     POLLING
  ========================================================================== */
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (mountedRef.current && document.visibilityState === "visible") {
        void load();
      }
    }, POLL_INTERVAL);
    return () => {
      window.clearInterval(interval);
    };
  }, [load]);
  /* ==========================================================================
     REFRESH KEYWORDS
  ========================================================================== */
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (mountedRef.current && document.visibilityState === "visible") {
        void loadKeywords();
      }
    }, KEYWORD_REFRESH_INTERVAL);
    return () => {
      window.clearInterval(interval);
    };
  }, [loadKeywords]);
  /* ==========================================================================
     VISIBILITY REFRESH
  ========================================================================== */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        void load();
        void loadKeywords();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load, loadKeywords]);
  /* ==========================================================================
     FILTER KEYWORDS
  ========================================================================== */
  const filteredKeywords = useMemo(() => {
    const query = keywordSearch.trim().toLowerCase();
    if (!query) {
      return availableKeywords;
    }
    return availableKeywords.filter((keyword) =>
      keyword.toLowerCase().includes(query),
    );
  }, [availableKeywords, keywordSearch]);
  /* ==========================================================================
     SELECTED KEYWORD CHECK
  ========================================================================== */
  const isKeywordSelected = useCallback(
    (keyword: string) => {
      const normalized = normalizeKeyword(keyword);
      return selectedKeywords.some(
        (item) => normalizeKeyword(item) === normalized,
      );
    },
    [selectedKeywords],
  );
  /* ==========================================================================
     UI
  ========================================================================== */
  return (
    <div className="space-y-4">
      {/* ======================================================================
          FEED CONTROL BAR
      ====================================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070d14] px-4 py-3.5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* SOURCE FILTER */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="mr-1 flex items-center gap-2 border-r border-white/[0.06] pr-3">
              <SlidersHorizontal size={13} className="text-cyan-400" />
              <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                SOURCE FILTER
              </span>
            </div>
            {FILTERS.map((filter) => {
              const selected = sourceFilter === filter.value;
              return (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => setSourceFilter(filter.value)}
                  className={`group relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[8px] font-semibold tracking-[0.12em] transition-all duration-200 ${
                    selected
                      ? "border-cyan-400/30 bg-cyan-400/[0.075] text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.035)]"
                      : "border-white/[0.055] bg-white/[0.018] text-slate-600 hover:border-white/[0.10] hover:bg-white/[0.035] hover:text-slate-300"
                  }`}
                >
                  {selected && (
                    <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" />
                  )}
                  {filter.label}
                </button>
              );
            })}
          </div>
          {/* STATUS */}
          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden items-center gap-2 sm:flex">
              <Filter size={12} className="text-slate-700" />
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-700">
                {sourceFilter || "ALL SOURCES"}
              </span>
            </div>
            <div className="h-4 w-px bg-white/[0.06]" />
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  online
                    ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]"
                    : loading
                      ? "animate-pulse bg-cyan-400"
                      : "bg-slate-700"
                }`}
              />
              <span
                className={`font-mono text-[8px] font-semibold uppercase tracking-[0.12em] ${
                  online
                    ? "text-emerald-400"
                    : loading
                      ? "text-cyan-400"
                      : "text-slate-700"
                }`}
              >
                {loading
                  ? "SYNCING"
                  : online
                    ? "STREAM ONLINE"
                    : "STREAM OFFLINE"}
              </span>
            </div>
            <div className="hidden font-mono text-[9px] text-slate-600 sm:block">
              {total.toLocaleString()}{" "}
              <span className="text-slate-700">TOTAL</span>
            </div>
          </div>
        </div>
      </div>
      {/* ======================================================================
          INTELLIGENCE KEYWORD SELECTOR
      ====================================================================== */}
      <div className="relative overflow-hidden rounded-xl border border-cyan-400/10 bg-[#070d14]">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-cyan-400/30" />
        {/* HEADER */}
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/[0.035]">
              <Search size={13} className="text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                  INTELLIGENCE KEYWORDS
                </span>
                <span className="rounded-md border border-cyan-400/10 bg-cyan-400/[0.035] px-2 py-1 font-mono text-[7px] text-cyan-400/70">
                  {keywordsLoading
                    ? "SYNCING"
                    : `${availableKeywords.length} TERMS`}
                </span>
              </div>
              <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.12em] text-slate-700">
                SELECT COLLECTION INTELLIGENCE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedKeywords.length > 0 && (
              <button
                type="button"
                onClick={clearKeywords}
                className="flex items-center gap-1.5 rounded-md border border-red-400/10 bg-red-400/[0.02] px-3 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-red-400/70 transition hover:border-red-400/20 hover:bg-red-400/[0.05] hover:text-red-300"
              >
                <X size={10} />
                CLEAR
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowKeywordPanel((current) => !current)}
              className="flex items-center gap-1.5 rounded-md border border-cyan-400/15 bg-cyan-400/[0.035] px-3 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-cyan-400 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.07]"
            >
              {showKeywordPanel ? "HIDE TERMS" : "SELECT TERMS"}
            </button>
          </div>
        </div>
        {/* SELECTED SUMMARY */}
        {selectedKeywords.length > 0 && (
          <div className="border-t border-cyan-400/[0.07] bg-cyan-400/[0.018] px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[7px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                ACTIVE:
              </span>
              {selectedKeywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => toggleKeyword(keyword)}
                  className="group flex items-center gap-1 rounded-md border border-cyan-400/20 bg-cyan-400/[0.07] px-2 py-1 font-mono text-[8px] lowercase text-cyan-300 transition hover:border-red-400/20 hover:bg-red-400/[0.04] hover:text-red-300"
                  title="Remove keyword"
                >
                  <Check size={9} />
                  {keyword}
                  <X
                    size={9}
                    className="ml-0.5 opacity-40 group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
        {/* KEYWORD PANEL */}
        {showKeywordPanel && (
          <div className="border-t border-white/[0.05] px-4 py-4">
            {/* SEARCH + MATCH MODE */}
            <div className="flex flex-col gap-2.5 lg:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={11}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700"
                />
                <input
                  value={keywordSearch}
                  onChange={(event) => setKeywordSearch(event.target.value)}
                  placeholder="Search intelligence keywords..."
                  className="w-full rounded-md border border-white/[0.07] bg-white/[0.018] py-2.5 pl-8 pr-3 font-mono text-[9px] text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-400/25 focus:bg-cyan-400/[0.018]"
                />
              </div>
              {/* MATCH MODE */}
              <div className="flex shrink-0 items-center rounded-md border border-white/[0.06] bg-white/[0.012] p-1">
                <span className="px-2 font-mono text-[7px] uppercase tracking-[0.1em] text-slate-700">
                  MATCH
                </span>
                <button
                  type="button"
                  onClick={() => updateKeywordMode("any")}
                  className={`rounded px-2.5 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] transition ${
                    keywordMode === "any"
                      ? "bg-cyan-400/[0.10] text-cyan-300"
                      : "text-slate-700 hover:text-slate-400"
                  }`}
                >
                  ANY
                </button>
                <button
                  type="button"
                  onClick={() => updateKeywordMode("all")}
                  className={`rounded px-2.5 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] transition ${
                    keywordMode === "all"
                      ? "bg-cyan-400/[0.10] text-cyan-300"
                      : "text-slate-700 hover:text-slate-400"
                  }`}
                >
                  ALL
                </button>
              </div>
            </div>
            {/* KEYWORD REGISTRY */}
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-slate-700">
                  BACKEND KEYWORD REGISTRY
                </span>
                <span className="font-mono text-[7px] text-slate-800">
                  {filteredKeywords.length} AVAILABLE
                </span>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-white/[0.045] bg-black/10 p-2">
                {keywordsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <RefreshCw
                      size={13}
                      className="animate-spin text-cyan-400"
                    />
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-700">
                      Loading keyword registry
                    </span>
                  </div>
                ) : keywordsError ? (
                  <div className="py-8 text-center">
                    <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-red-400/70">
                      {keywordsError}
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadKeywords()}
                      className="mt-2 font-mono text-[7px] uppercase tracking-[0.1em] text-cyan-400 hover:text-cyan-300"
                    >
                      RETRY
                    </button>
                  </div>
                ) : filteredKeywords.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-slate-700">
                      NO MATCHING KEYWORDS
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {filteredKeywords.map((keyword) => {
                      const selected = isKeywordSelected(keyword);
                      return (
                        <button
                          key={keyword}
                          type="button"
                          title={
                            selected
                              ? "Selected keyword — click to remove"
                              : "Backend intelligence keyword — click to select"
                          }
                          onClick={() => toggleKeyword(keyword)}
                          className={`rounded-md border px-2 py-1 font-mono text-[8px] transition-all duration-150 ${
                            selected
                              ? "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.035)]"
                              : "border-white/[0.05] bg-white/[0.015] text-slate-600 hover:border-cyan-400/15 hover:bg-cyan-400/[0.025] hover:text-cyan-400/80"
                          }`}
                        >
                          {selected && (
                            <span className="mr-1 inline-block h-1 w-1 rounded-full bg-cyan-400" />
                          )}
                          {keyword}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            {/* INFO */}
            <div className="mt-3 flex items-start gap-2 rounded-md border border-white/[0.04] bg-white/[0.01] px-3 py-2">
              <Radio size={11} className="mt-0.5 shrink-0 text-cyan-400/40" />
              <p className="font-mono text-[7px] leading-relaxed text-slate-700">
                Select one or more keywords to filter intelligence posts. ANY
                returns posts matching at least one selected term. ALL requires
                every selected term to match. Keywords are loaded directly from
                the Gatekeeper backend registry.
              </p>
            </div>
          </div>
        )}
      </div>
      {/* ======================================================================
          ACTIVE FILTER STATUS
      ====================================================================== */}
      {(selectedKeywords.length > 0 || sourceFilter !== null) && (
        <div className="relative overflow-hidden rounded-xl border border-cyan-400/10 bg-cyan-400/[0.018] px-4 py-3">
          <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-cyan-400/30" />
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="mr-1 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                ACTIVE FILTERS
              </span>
              {sourceFilter && (
                <span className="flex items-center gap-1 rounded-md border border-violet-400/15 bg-violet-400/[0.05] px-2 py-1 font-mono text-[8px] uppercase text-violet-300">
                  <Filter size={9} />
                  {sourceFilter}
                </span>
              )}
              {selectedKeywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => toggleKeyword(keyword)}
                  className="flex items-center gap-1 rounded-md border border-cyan-400/15 bg-cyan-400/[0.05] px-2 py-1 font-mono text-[8px] lowercase text-cyan-400 transition hover:border-red-400/20 hover:text-red-300"
                >
                  {keyword}
                  <X size={9} />
                </button>
              ))}
            </div>
            {selectedKeywords.length > 0 && (
              <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-600">
                MATCH MODE <span className="text-cyan-400">{keywordMode}</span>
              </span>
            )}
          </div>
        </div>
      )}
      {/* ======================================================================
          LOADING STATE
      ====================================================================== */}
      {loading && posts.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.055] bg-[#070d14] py-14 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.035),transparent_55%)]" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.035]">
              <RefreshCw size={17} className="animate-spin text-cyan-400" />
            </div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-400/80">
              Synchronizing intelligence
            </p>
            <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-700">
              Establishing collection stream...
            </p>
          </div>
        </div>
      )}
      {/* ======================================================================
          EMPTY STATE
      ========================================================================== */}
      {!loading && posts.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.055] bg-[#070d14] px-6 py-14 text-center">
          <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-64 -translate-x-1/2 rounded-full bg-cyan-400/[0.025] blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Radio size={18} className="text-slate-700" />
            </div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
              No matching intelligence
            </p>
            <p className="mx-auto mt-2 max-w-md text-[10px] leading-5 text-slate-700">
              {selectedKeywords.length > 0
                ? `No intelligence posts matched the selected keywords using ${keywordMode.toUpperCase()} matching${
                    sourceFilter ? ` from ${sourceFilter}` : ""
                  }.`
                : sourceFilter
                  ? `No OSINT posts are currently available from ${sourceFilter}.`
                  : "No OSINT posts are currently available. Start a collector or upload evidence to begin collection."}
            </p>
            {selectedKeywords.length > 0 && (
              <button
                type="button"
                onClick={clearKeywords}
                className="mt-4 rounded-md border border-cyan-400/15 bg-cyan-400/[0.035] px-3 py-2 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-cyan-400 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.07]"
              >
                CLEAR KEYWORD FILTER
              </button>
            )}
          </div>
        </div>
      )}
      {/* ======================================================================
          POSTS
      ========================================================================== */}
      <div className="space-y-3">
        {posts.map((post) => (
          <OSINTPostCard
            key={post.id}
            post={post}
            onWalletClick={(address) =>
              router.push(`/wallets?highlight=${encodeURIComponent(address)}`)
            }
          />
        ))}
      </div>
      {/* ======================================================================
          BACKGROUND REFRESH
      ========================================================================== */}
      {loading && posts.length > 0 && (
        <div className="flex items-center justify-center gap-2 border-t border-white/[0.04] pt-3">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-slate-700">
            Synchronizing intelligence stream
          </span>
        </div>
      )}
    </div>
  );
}
