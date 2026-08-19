"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Wallet, FileText, ScanText, Loader2, CornerDownLeft } from "lucide-react";
import { globalSearch, type SearchResult } from "@/services/search";
const TYPE_ICON: Record<SearchResult["type"], typeof Wallet> = {
  wallet: Wallet,
  evidence: FileText,
  extraction: ScanText,
};
const TYPE_LABEL: Record<SearchResult["type"], string> = {
  wallet: "WALLET",
  evidence: "EVIDENCE",
  extraction: "EXTRACTION",
};
export default function GlobalSearchModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Global ⌘K / Ctrl+K listener — opens the palette from anywhere in the app.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCmdK) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  // Also let anything in the app open it via a custom event, so the
  // Sidebar's search button can trigger it without prop drilling.
  useEffect(() => {
    function handleOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("gk:open-search", handleOpenEvent);
    return () => window.removeEventListener("gk:open-search", handleOpenEvent);
  }, []);
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await globalSearch(query);
        if (!cancelled) {
          setResults(data);
          setActiveIndex(0);
        }
      } catch (error) {
        console.error("Search failed:", error);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);
  function navigateTo(result: SearchResult) {
    setOpen(false);
    router.push(result.route);
  }
  function handleInputKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && results[activeIndex]) {
      navigateTo(results[activeIndex]);
    }
  }
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#1B2E31] bg-[#0B1416] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[#152225] px-4 py-3">
          <Search size={16} className="text-[#00E5FF]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search wallets, evidence, transaction hashes..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
          />
          {loading && <Loader2 size={14} className="animate-spin text-slate-500" />}
          <kbd className="rounded border border-[#1B2E31] px-1.5 py-0.5 text-[9px] text-slate-500">
            ESC
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {!query.trim() && (
            <div className="px-4 py-8 text-center text-xs text-slate-600">
              Type to search across wallets and evidence.
            </div>
          )}
          {query.trim() && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-slate-600">
              No matches for &ldquo;{query}&rdquo;.
            </div>
          )}
          {results.map((result, index) => {
            const Icon = TYPE_ICON[result.type];
            const active = index === activeIndex;
            return (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => navigateTo(result)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  active ? "bg-[#00E5FF]/[0.07]" : ""
                }`}
              >
                <Icon size={14} className="shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs text-slate-200">
                    {result.title}
                  </div>
                  {result.subtitle && (
                    <div className="truncate text-[10px] text-slate-500">
                      {result.subtitle}
                    </div>
                  )}
                </div>
                <span className="shrink-0 rounded border border-[#1B2E31] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-slate-500">
                  {TYPE_LABEL[result.type]}
                </span>
                {active && <CornerDownLeft size={12} className="shrink-0 text-slate-600" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}