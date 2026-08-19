"use client";
import { useMemo, useState } from "react";
import {
  Copy,
  Check,
  Search,
  FileText,
  ScanSearch,
  AlignLeft,
  Hash,
  AlertTriangle,
  Repeat2,
  ShieldCheck,
  ChevronRight,
  Activity,
} from "lucide-react";
interface OCRViewerProps {
  text: string;
}
type LineStatus = {
  text: string;
  originalIndex: number;
  normalized: string;
  isDuplicate: boolean;
  duplicateCount: number;
  isDummy: boolean;
};
const DUMMY_PATTERNS = [
  "dummy",
  "dummy text",
  "dummy data",
  "test",
  "test text",
  "test data",
  "sample text",
  "sample data",
  "placeholder",
  "placeholder text",
  "lorem ipsum",
  "lorem",
  "example text",
  "example data",
  "your text here",
  "insert text here",
  "replace this text",
  "ocr test",
  "testing",
];
export default function OCRViewer({ text }: OCRViewerProps) {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQualityOnly, setShowQualityOnly] = useState(false);
  const lines = useMemo(() => {
    if (!text) return [];
    return text.split(/\r?\n/);
  }, [text]);
  const normalizeLine = (value: string) => {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
  };
  const analyzedLines = useMemo<LineStatus[]>(() => {
    if (!lines.length) return [];
    const frequency = new Map<string, number>();
    for (const line of lines) {
      const normalized = normalizeLine(line);
      if (!normalized) continue;
      frequency.set(normalized, (frequency.get(normalized) ?? 0) + 1);
    }
    return lines.map((line, index) => {
      const normalized = normalizeLine(line);
      const duplicateCount =
        normalized.length > 0 ? (frequency.get(normalized) ?? 1) : 1;
      const isDuplicate = normalized.length > 0 && duplicateCount > 1;
      const isDummy = isDummyText(normalized);
      return {
        text: line,
        originalIndex: index,
        normalized,
        isDuplicate,
        duplicateCount,
        isDummy,
      };
    });
  }, [lines]);
  const searchTerm = search.trim().toLowerCase();
  const filteredLines = useMemo(() => {
    let result = analyzedLines;
    if (searchTerm) {
      result = result.filter((line) =>
        line.text.toLowerCase().includes(searchTerm),
      );
    }
    if (showQualityOnly) {
      result = result.filter((line) => line.isDuplicate || line.isDummy);
    }
    return result;
  }, [analyzedLines, searchTerm, showQualityOnly]);
  const nonEmptyLines = useMemo(
    () => analyzedLines.filter((line) => line.text.trim().length > 0).length,
    [analyzedLines],
  );
  const wordCount = useMemo(() => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }, [text]);
  const characterCount = text.length;
  const matchCount = useMemo(() => {
    if (!searchTerm) return 0;
    return analyzedLines.filter((line) =>
      line.text.toLowerCase().includes(searchTerm),
    ).length;
  }, [analyzedLines, searchTerm]);
  const dummyLines = useMemo(
    () =>
      analyzedLines.filter(
        (line) => line.isDummy && line.text.trim().length > 0,
      ),
    [analyzedLines],
  );
  const repeatedLines = useMemo(
    () =>
      analyzedLines.filter(
        (line) => line.isDuplicate && line.text.trim().length > 0,
      ),
    [analyzedLines],
  );
  const uniqueRepeatedEntries = useMemo(() => {
    const seen = new Set<string>();
    return repeatedLines.filter((line) => {
      if (seen.has(line.normalized)) {
        return false;
      }
      seen.add(line.normalized);
      return true;
    });
  }, [repeatedLines]);
  const qualityIssueCount = useMemo(() => {
    const uniqueIssues = new Set<string>();
    for (const line of analyzedLines) {
      if (line.isDummy) {
        uniqueIssues.add(`dummy:${line.normalized}`);
      }
      if (line.isDuplicate) {
        uniqueIssues.add(`duplicate:${line.normalized}`);
      }
    }
    return uniqueIssues.size;
  }, [analyzedLines]);
  const qualityStatus =
    dummyLines.length > 0
      ? "REVIEW REQUIRED"
      : repeatedLines.length > 0
        ? "DUPLICATES DETECTED"
        : text.trim()
          ? "CLEAN"
          : "NO DATA";
  async function copyOCR() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch (error) {
      console.error("OCR copy failed:", error);
    }
  }
  function highlightText(value: string) {
    if (!searchTerm) return value;
    const parts = value.split(
      new RegExp(`(${escapeRegExp(searchTerm)})`, "gi"),
    );
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm ? (
        <mark
          key={index}
          className="rounded bg-cyan-400/15 px-0.5 text-cyan-300 ring-1 ring-cyan-400/20"
        >
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      ),
    );
  }
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#05070b] shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
      {/* HEADER */}
      <div className="border-b border-white/[0.07] bg-white/[0.015]">
        <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.055]">
              <FileText size={17} className="text-cyan-300" />
              <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-20" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,.55)]" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div>
                  <p className="font-mono text-[8px] font-semibold tracking-[0.2em] text-cyan-400">
                    01 // OCR EXTRACTION
                  </p>
                  <h2 className="mt-1 truncate text-sm font-semibold tracking-tight text-white">
                    OCR Evidence Reader
                  </h2>
                </div>
                <span className="hidden rounded-md border border-emerald-400/20 bg-emerald-400/[0.045] px-2 py-0.5 font-mono text-[7px] font-bold tracking-[0.14em] text-emerald-300 sm:inline-flex">
                  EXTRACTED
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">
                <ScanSearch size={9} className="text-cyan-400/70" />
                Text recovered from source evidence
              </p>
            </div>
          </div>
          {/* ACTIONS */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:w-[230px]">
              <Search
                size={12}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search extracted text..."
                className="h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.025] pl-9 pr-3 font-mono text-[9px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-cyan-400/[0.025] focus:ring-1 focus:ring-cyan-400/10"
              />
            </div>
            <button
              type="button"
              onClick={copyOCR}
              disabled={!text}
              className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.045] px-4 font-mono text-[9px] font-semibold tracking-wide text-cyan-300 transition hover:border-cyan-400/35 hover:bg-cyan-400/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {copied ? (
                <>
                  <Check size={12} />
                  COPIED
                </>
              ) : (
                <>
                  <Copy size={12} />
                  COPY EVIDENCE
                </>
              )}
            </button>
          </div>
        </div>
        {/* METADATA */}
        <div className="grid grid-cols-2 border-t border-white/[0.06] sm:grid-cols-4">
          <OCRStat
            icon={<AlignLeft size={10} />}
            label="LINES"
            value={nonEmptyLines}
          />
          <OCRStat icon={<Hash size={10} />} label="WORDS" value={wordCount} />
          <OCRStat
            icon={<FileText size={10} />}
            label="CHARACTERS"
            value={characterCount}
          />
          <OCRStat
            icon={<Search size={10} />}
            label="MATCHES"
            value={searchTerm ? matchCount : "—"}
            accent={Boolean(searchTerm)}
          />
        </div>
      </div>
      {/* QUALITY STRIP */}
      {text && (
        <div className="border-b border-white/[0.06] bg-white/[0.012]">
          <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.06] sm:grid-cols-4 sm:divide-y-0">
            <QualityStat
              label="QUALITY"
              value={qualityStatus}
              tone={
                dummyLines.length > 0
                  ? "danger"
                  : repeatedLines.length > 0
                    ? "warning"
                    : "safe"
              }
            />
            <QualityStat
              label="UNIQUE LINES"
              value={Math.max(
                nonEmptyLines -
                  repeatedLines.length +
                  uniqueRepeatedEntries.length,
                0,
              )}
            />
            <QualityStat
              label="REPEATED"
              value={uniqueRepeatedEntries.length}
              tone={uniqueRepeatedEntries.length > 0 ? "warning" : "default"}
            />
            <QualityStat
              label="DUMMY / PLACEHOLDER"
              value={dummyLines.length}
              tone={dummyLines.length > 0 ? "danger" : "default"}
            />
          </div>
        </div>
      )}
      {/* QUALITY WARNING */}
      {(dummyLines.length > 0 || uniqueRepeatedEntries.length > 0) && (
        <div
          className={[
            "flex flex-col gap-3 border-b px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between",
            dummyLines.length > 0
              ? "border-red-400/15 bg-red-400/[0.025]"
              : "border-orange-400/15 bg-orange-400/[0.02]",
          ].join(" ")}
        >
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={[
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                dummyLines.length > 0
                  ? "border-red-400/20 bg-red-400/[0.06] text-red-400"
                  : "border-orange-400/20 bg-orange-400/[0.06] text-orange-400",
              ].join(" ")}
            >
              <AlertTriangle size={13} />
            </div>
            <div className="min-w-0">
              <p
                className={[
                  "font-mono text-[8px] font-bold tracking-[0.15em]",
                  dummyLines.length > 0 ? "text-red-400" : "text-orange-400",
                ].join(" ")}
              >
                OCR QUALITY REVIEW
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">
                {dummyLines.length > 0 && (
                  <>
                    {dummyLines.length} line
                    {dummyLines.length === 1 ? "" : "s"} resemble dummy or
                    placeholder content.
                  </>
                )}
                {dummyLines.length > 0 && uniqueRepeatedEntries.length > 0 && (
                  <span className="mx-1 text-slate-600">·</span>
                )}
                {uniqueRepeatedEntries.length > 0 && (
                  <>
                    {uniqueRepeatedEntries.length} repeated OCR entr
                    {uniqueRepeatedEntries.length === 1 ? "y" : "ies"} detected.
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowQualityOnly((value) => !value)}
            className={[
              "flex shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 font-mono text-[8px] font-semibold tracking-[0.12em] transition",
              showQualityOnly
                ? "border-cyan-400/30 bg-cyan-400/[0.07] text-cyan-300"
                : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-cyan-400/20 hover:text-cyan-300",
            ].join(" ")}
          >
            <Repeat2 size={11} />
            {showQualityOnly ? "SHOW ALL OCR" : "REVIEW FLAGGED"}
          </button>
        </div>
      )}
      {/* SEARCH NOTICE */}
      {searchTerm && (
        <div className="flex items-center justify-between border-b border-cyan-400/10 bg-cyan-400/[0.018] px-5 py-2.5">
          <div className="flex min-w-0 items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-400">
            <Search size={10} className="shrink-0 text-cyan-400" />
            <span className="truncate">
              Searching for{" "}
              <span className="font-semibold text-cyan-300">
                &quot;{search}&quot;
              </span>
            </span>
          </div>
          <span className="shrink-0 font-mono text-[8px] text-cyan-400/70">
            {matchCount} {matchCount === 1 ? "MATCH" : "MATCHES"}
          </span>
        </div>
      )}
      {/* EVIDENCE READER */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-[#05070b] to-transparent" />
        <div className="max-h-[460px] overflow-auto bg-[#05070b] font-mono scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
          {!text ? (
            <EmptyOCR />
          ) : filteredLines.length === 0 ? (
            <NoMatchState qualityMode={showQualityOnly} searchTerm={search} />
          ) : (
            <div className="min-w-[620px] py-2">
              {filteredLines.map((line) => {
                const hasIssue = line.isDuplicate || line.isDummy;
                return (
                  <div
                    key={`${line.originalIndex}-${line.text}`}
                    className={[
                      "group relative flex min-h-[34px] border-b transition-colors",
                      line.isDummy
                        ? "border-red-400/[0.08] bg-red-400/[0.018] hover:bg-red-400/[0.035]"
                        : line.isDuplicate
                          ? "border-orange-400/[0.07] bg-orange-400/[0.012] hover:bg-orange-400/[0.025]"
                          : "border-white/[0.025] hover:bg-cyan-400/[0.018]",
                    ].join(" ")}
                  >
                    {/* ISSUE INDICATOR */}
                    {hasIssue && (
                      <div
                        className={[
                          "absolute bottom-0 left-0 top-0 w-px",
                          line.isDummy ? "bg-red-400" : "bg-orange-400",
                        ].join(" ")}
                      />
                    )}
                    {/* LINE NUMBER */}
                    <div className="sticky left-0 flex w-16 shrink-0 select-none items-start justify-end gap-1 border-r border-white/[0.045] bg-[#05070b] px-3 py-2 text-[9px] text-slate-600">
                      <span className="opacity-70">
                        {String(line.originalIndex + 1).padStart(3, "0")}
                      </span>
                      <ChevronRight
                        size={9}
                        className="mt-0.5 text-cyan-400 opacity-0 transition-opacity group-hover:opacity-50"
                      />
                    </div>
                    {/* TEXT */}
                    <div className="min-w-0 flex-1 px-4 py-2">
                      <div className="flex flex-wrap items-start gap-2">
                        <div className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-300">
                          {highlightText(line.text)}
                        </div>
                        {/* QUALITY FLAGS */}
                        {line.isDummy && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-red-400/20 bg-red-400/[0.05] px-1.5 py-0.5 font-mono text-[6px] font-bold uppercase tracking-[0.1em] text-red-400">
                            <AlertTriangle size={8} />
                            DUMMY
                          </span>
                        )}
                        {line.isDuplicate && (
                          <span
                            title={`${line.duplicateCount} occurrences detected`}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-orange-400/20 bg-orange-400/[0.045] px-1.5 py-0.5 font-mono text-[6px] font-bold uppercase tracking-[0.1em] text-orange-400"
                          >
                            <Repeat2 size={8} />
                            REPEATED ×{line.duplicateCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* READER FOOTER */}
        {text && (
          <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-white/[0.012] px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-mono text-[7px] uppercase tracking-[0.14em] text-slate-500">
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  dummyLines.length > 0
                    ? "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,.45)]"
                    : repeatedLines.length > 0
                      ? "bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,.4)]"
                      : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.45)]",
                ].join(" ")}
              />
              {qualityStatus}
            </div>
            <div className="flex items-center gap-3 font-mono text-[7px] text-slate-600">
              <span>
                {filteredLines.length} / {lines.length} LINES
              </span>
              {qualityIssueCount > 0 && (
                <>
                  <span className="text-slate-700">·</span>
                  <span>
                    {qualityIssueCount} QUALITY SIGNAL
                    {qualityIssueCount === 1 ? "" : "S"}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
/* ===============================================================
   OCR STAT
   =============================================================== */
function OCRStat({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 border-r border-white/[0.06] px-4 py-2.5 last:border-r-0">
      <div
        className={[
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
          accent
            ? "border-cyan-400/20 bg-cyan-400/[0.055] text-cyan-300"
            : "border-white/[0.06] bg-white/[0.02] text-slate-500",
        ].join(" ")}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[7px] tracking-[0.14em] text-slate-600">
          {label}
        </div>
        <div
          className={[
            "mt-0.5 font-mono text-[11px] font-bold",
            accent ? "text-cyan-300" : "text-slate-300",
          ].join(" ")}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
      </div>
    </div>
  );
}
/* ===============================================================
   QUALITY STAT
   =============================================================== */
function QualityStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "safe" | "warning" | "danger";
}) {
  const styles = {
    default: "text-slate-300",
    safe: "text-emerald-400",
    warning: "text-orange-400",
    danger: "text-red-400",
  };
  return (
    <div className="min-w-0 px-4 py-2.5">
      <div className="font-mono text-[6px] font-semibold tracking-[0.14em] text-slate-600">
        {label}
      </div>
      <div
        className={[
          "mt-1 truncate font-mono text-[9px] font-bold",
          styles[tone],
        ].join(" ")}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
/* ===============================================================
   EMPTY OCR
   =============================================================== */
function EmptyOCR() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025]">
        <FileText size={20} className="text-slate-600" />
        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md border border-white/[0.08] bg-[#05070b]">
          <ScanSearch size={9} className="text-cyan-400/60" />
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-400">
        No OCR evidence available
      </p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">
        Upload an image or document to initialize forensic text extraction.
      </p>
      <div className="mt-4 flex items-center gap-2 font-mono text-[7px] uppercase tracking-[0.14em] text-slate-600">
        <Activity size={10} className="text-cyan-400/60" />
        OCR ENGINE STANDBY
      </div>
    </div>
  );
}
/* ===============================================================
   NO MATCH / QUALITY FILTER
   =============================================================== */
function NoMatchState({
  qualityMode,
  searchTerm,
}: {
  qualityMode: boolean;
  searchTerm: string;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/[0.04]">
        {qualityMode ? (
          <AlertTriangle size={18} className="text-orange-400" />
        ) : (
          <Search size={18} className="text-orange-400" />
        )}
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-400">
        {qualityMode ? "No quality anomalies detected" : "No matching evidence"}
      </p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">
        {qualityMode
          ? "No repeated or dummy-like OCR lines were detected."
          : `No extracted text lines contain "${searchTerm}".`}
      </p>
    </div>
  );
}
/* ===============================================================
   DUMMY TEXT DETECTION
   =============================================================== */
function isDummyText(normalized: string) {
  if (!normalized) return false;
  if (DUMMY_PATTERNS.includes(normalized)) {
    return true;
  }
  if (normalized.length >= 4 && normalized.length <= 30) {
    if (
      /^test[\s_-]?\d*$/.test(normalized) ||
      /^dummy[\s_-]?\d*$/.test(normalized) ||
      /^sample[\s_-]?\d*$/.test(normalized) ||
      /^placeholder[\s_-]?\d*$/.test(normalized)
    ) {
      return true;
    }
  }
  if (
    normalized.startsWith("lorem ipsum") ||
    normalized.includes("lorem ipsum dolor")
  ) {
    return true;
  }
  return false;
}
/* ===============================================================
   REGEX ESCAPE
   =============================================================== */
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
