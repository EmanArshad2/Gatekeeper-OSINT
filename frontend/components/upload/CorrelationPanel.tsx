"use client";
import { useMemo, useState } from "react";
import {
  AtSign,
  Check,
  Copy,
  Globe2,
  MessageCircle,
  Phone,
  ScanSearch,
  ShieldCheck,
  Filter,
} from "lucide-react";
interface CorrelationPanelProps {
  telegramUsers: string[];
  emails: string[];
  websites: string[];
  phones: string[];
}
type EntityType = "telegram" | "email" | "website" | "phone";
export default function CorrelationPanel({
  telegramUsers,
  emails,
  websites,
  phones,
}: CorrelationPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);
  /*
   * ==============================================================
   * ENTITY CLEANUP
   * ==============================================================
   */
  const cleanEntity = (value: string) => {
    return value
      .trim()
      .replace(/\s+/g, " ")
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/[.,;:]+$/g, "");
  };
  const isDummyEntity = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return true;
    const dummyPatterns = [
      /^test$/,
      /^testing$/,
      /^dummy$/,
      /^example$/,
      /^sample$/,
      /^placeholder$/,
      /^unknown$/,
      /^n\/a$/,
      /^na$/,
      /^none$/,
      /^null$/,
      /^undefined$/,
      /^not available$/,
      /^your[-_\s]?name$/,
      /^your[-_\s]?email$/,
      /^your[-_\s]?username$/,
      /^user@example\.(com|org|net)$/,
      /^test@example\.(com|org|net)$/,
      /^example@example\.(com|org|net)$/,
      /^john@example\.(com|org|net)$/,
      /^testuser\d*$/,
      /^dummyuser\d*$/,
      /^user\d+$/,
      /^test\d+$/,
      /^dummy\d+$/,
      /^1234567890+$/,
      /^0000000000+$/,
      /^1111111111+$/,
      /^123456789+$/,
      /^000000000+$/,
    ];
    return dummyPatterns.some((pattern) => pattern.test(normalized));
  };
  const normalizeForComparison = (value: string) => {
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
  };
  /*
   * ==============================================================
   * DEDUPLICATION
   * ==============================================================
   */
  const processEntities = (items: string[]) => {
    const seen = new Set<string>();
    const cleaned: string[] = [];
    let duplicates = 0;
    let dummyCount = 0;
    for (const raw of items) {
      const value = cleanEntity(raw);
      if (!value) continue;
      if (isDummyEntity(value)) {
        dummyCount++;
        continue;
      }
      const normalized = normalizeForComparison(value);
      if (seen.has(normalized)) {
        duplicates++;
        continue;
      }
      seen.add(normalized);
      cleaned.push(value);
    }
    return {
      items: cleaned,
      duplicates,
      dummyCount,
    };
  };
  const telegram = useMemo(
    () => processEntities(telegramUsers),
    [telegramUsers],
  );
  const email = useMemo(() => processEntities(emails), [emails]);
  const website = useMemo(() => processEntities(websites), [websites]);
  const phone = useMemo(() => processEntities(phones), [phones]);
  /*
   * ==============================================================
   * CROSS-CATEGORY CORRELATION
   * ==============================================================
   */
  const duplicateAcrossCategories = useMemo(() => {
    const map = new Map<string, Set<EntityType>>();
    const add = (items: string[], type: EntityType) => {
      for (const item of items) {
        const normalized = normalizeForComparison(item);
        if (!normalized) continue;
        if (!map.has(normalized)) {
          map.set(normalized, new Set());
        }
        map.get(normalized)!.add(type);
      }
    };
    add(telegram.items, "telegram");
    add(email.items, "email");
    add(website.items, "website");
    add(phone.items, "phone");
    let count = 0;
    map.forEach((types) => {
      if (types.size > 1) {
        count++;
      }
    });
    return count;
  }, [telegram.items, email.items, website.items, phone.items]);
  /*
   * ==============================================================
   * COUNTERS
   * ==============================================================
   */
  const totalEntities =
    telegram.items.length +
    email.items.length +
    website.items.length +
    phone.items.length;
  const totalRawEntities =
    telegramUsers.length + emails.length + websites.length + phones.length;
  const totalDuplicates =
    telegram.duplicates +
    email.duplicates +
    website.duplicates +
    phone.duplicates;
  const totalDummy =
    telegram.dummyCount +
    email.dummyCount +
    website.dummyCount +
    phone.dummyCount;
  const cleanupCount = totalDuplicates + totalDummy;
  /*
   * ==============================================================
   * COPY
   * ==============================================================
   */
  async function copyEntity(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => {
        setCopied(null);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy entity:", error);
    }
  }
  /*
   * ==============================================================
   * RENDER
   * ==============================================================
   */
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#05070b] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      {/* COMMAND CENTER GLOW */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-cyan-500/[0.035] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-violet-500/[0.025] blur-3xl" />
      {/* HEADER */}
      <div className="relative border-b border-white/[0.07]">
        <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {/* ICON */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.045]">
              <ScanSearch size={17} className="text-cyan-400" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-cyan-400 opacity-20" />
                <span className="relative block h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[8px] font-semibold tracking-[0.22em] text-cyan-400/80">
                GK // ENTITY CORRELATION
              </div>
              <h2 className="mt-1 truncate text-base font-medium tracking-tight text-slate-100">
                Context Correlation
              </h2>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">
                Unique entities recovered from submitted evidence
              </p>
            </div>
          </div>
          {/* STATUS */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.035] px-3 py-2">
              <ShieldCheck size={12} className="text-emerald-400" />
              <div>
                <div className="font-mono text-[6px] tracking-[0.16em] text-slate-500">
                  UNIQUE
                </div>
                <div className="font-mono text-xs font-bold text-emerald-400">
                  {totalEntities}
                </div>
              </div>
            </div>
            {cleanupCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-orange-400/15 bg-orange-400/[0.035] px-3 py-2">
                <Filter size={12} className="text-orange-400" />
                <div>
                  <div className="font-mono text-[6px] tracking-[0.16em] text-slate-500">
                    FILTERED
                  </div>
                  <div className="font-mono text-xs font-bold text-orange-400">
                    {cleanupCount}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* METRIC STRIP */}
        <div className="grid grid-cols-2 border-t border-white/[0.06] sm:grid-cols-4">
          <EntityMetric
            label="TELEGRAM"
            value={telegram.items.length}
            icon={<MessageCircle size={11} />}
            tone="cyan"
          />
          <EntityMetric
            label="EMAIL"
            value={email.items.length}
            icon={<AtSign size={11} />}
            tone="orange"
          />
          <EntityMetric
            label="WEBSITES"
            value={website.items.length}
            icon={<Globe2 size={11} />}
            tone="violet"
          />
          <EntityMetric
            label="PHONE"
            value={phone.items.length}
            icon={<Phone size={11} />}
            tone="emerald"
          />
        </div>
      </div>
      {/* CLEANUP NOTICE */}
      {cleanupCount > 0 && (
        <div className="relative border-b border-orange-400/10 bg-orange-400/[0.018] px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2 font-mono text-[7px] font-semibold uppercase tracking-[0.16em] text-orange-400">
              <Filter size={10} />
              Extraction cleanup
            </div>
            <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-slate-500">
              {totalDuplicates} duplicate
              {totalDuplicates === 1 ? "" : "s"}
            </div>
            <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-slate-500">
              {totalDummy} dummy / placeholder
            </div>
            {duplicateAcrossCategories > 0 && (
              <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-slate-500">
                {duplicateAcrossCategories} cross-category overlap
                {duplicateAcrossCategories === 1 ? "" : "s"}
              </div>
            )}
            <div className="ml-auto font-mono text-[7px] uppercase tracking-[0.1em] text-slate-500">
              <span className="text-slate-400">{totalRawEntities}</span>
              {" RAW "}
              <span className="text-slate-700">→</span>{" "}
              <span className="text-emerald-400">{totalEntities}</span>
              {" UNIQUE"}
            </div>
          </div>
        </div>
      )}
      {/* ENTITY GRID */}
      <div className="relative grid gap-4 p-4 sm:p-5 lg:grid-cols-2 lg:p-6">
        <EntitySection
          title="Telegram Handles"
          category="TELEGRAM"
          icon={<MessageCircle size={14} />}
          items={telegram.items}
          type="telegram"
          copied={copied}
          onCopy={copyEntity}
        />
        <EntitySection
          title="Email Addresses"
          category="EMAIL"
          icon={<AtSign size={14} />}
          items={email.items}
          type="email"
          copied={copied}
          onCopy={copyEntity}
        />
        <EntitySection
          title="Websites & Domains"
          category="WEB"
          icon={<Globe2 size={14} />}
          items={website.items}
          type="website"
          copied={copied}
          onCopy={copyEntity}
        />
        <EntitySection
          title="Phone Numbers"
          category="PHONE"
          icon={<Phone size={14} />}
          items={phone.items}
          type="phone"
          copied={copied}
          onCopy={copyEntity}
        />
      </div>
      {/* FOOTER */}
      <div className="flex flex-col gap-2 border-t border-white/[0.07] bg-[#030508]/80 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-mono text-[7px] uppercase tracking-[0.16em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
          Correlation engine operational
        </div>
        <div className="font-mono text-[7px] uppercase tracking-[0.12em] text-slate-600">
          {totalEntities} UNIQUE ENTITIES
          {totalDuplicates > 0 && ` · ${totalDuplicates} DUPLICATES REMOVED`}
        </div>
      </div>
    </section>
  );
}
/* ==============================================================
   ENTITY METRIC
   ============================================================== */
function EntityMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "cyan" | "orange" | "violet" | "emerald";
}) {
  const tones = {
    cyan: {
      icon: "text-cyan-400",
      value: "text-cyan-300",
      bg: "bg-cyan-400/[0.025]",
    },
    orange: {
      icon: "text-orange-400",
      value: "text-orange-300",
      bg: "bg-orange-400/[0.018]",
    },
    violet: {
      icon: "text-violet-400",
      value: "text-violet-300",
      bg: "bg-violet-400/[0.018]",
    },
    emerald: {
      icon: "text-emerald-400",
      value: "text-emerald-300",
      bg: "bg-emerald-400/[0.018]",
    },
  };
  return (
    <div
      className={`border-r border-white/[0.06] px-4 py-3.5 last:border-r-0 ${tones[tone].bg}`}
    >
      <div
        className={`flex items-center gap-1.5 font-mono text-[7px] font-semibold tracking-[0.16em] text-slate-500`}
      >
        <span className={tones[tone].icon}>{icon}</span>
        {label}
      </div>
      <div
        className={`mt-1.5 font-mono text-lg font-bold ${tones[tone].value}`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
/* ==============================================================
   ENTITY SECTION
   ============================================================== */
interface EntitySectionProps {
  title: string;
  category: string;
  icon: React.ReactNode;
  items: string[];
  type: EntityType;
  copied: string | null;
  onCopy: (value: string) => void;
}
function EntitySection({
  title,
  category,
  icon,
  items,
  type,
  copied,
  onCopy,
}: EntitySectionProps) {
  const theme = getEntityTheme(type);
  return (
    <div
      className={[
        "group flex min-h-[250px] flex-col overflow-hidden rounded-xl",
        "border border-white/[0.065] bg-white/[0.018]",
        "transition-all duration-200",
        "hover:border-white/[0.11] hover:bg-white/[0.022]",
      ].join(" ")}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
              theme.iconBorder,
              theme.iconBackground,
              theme.text,
            ].join(" ")}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-xs font-medium text-slate-200">
              {title}
            </h3>
            <div className="mt-0.5 font-mono text-[6px] uppercase tracking-[0.16em] text-slate-600">
              {category} CHANNEL
            </div>
          </div>
        </div>
        <span
          className={[
            "shrink-0 rounded-md border px-2 py-1 font-mono text-[8px] font-bold",
            theme.badge,
          ].join(" ")}
        >
          {items.length}
        </span>
      </div>
      {/* CONTENT */}
      <div className="flex-1 p-3">
        {items.length === 0 ? (
          <div className="flex h-full min-h-[165px] flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.07] bg-black/10 px-5 text-center">
            <div
              className={[
                "flex h-9 w-9 items-center justify-center rounded-lg border",
                "border-white/[0.07] bg-white/[0.018]",
                "text-slate-600",
              ].join(" ")}
            >
              {icon}
            </div>
            <div className="mt-3 font-mono text-[7px] font-semibold tracking-[0.16em] text-slate-600">
              NO ENTITIES DETECTED
            </div>
            <p className="mt-1.5 max-w-[220px] text-[10px] leading-4 text-slate-600">
              No {title.toLowerCase()} were identified in the current evidence.
            </p>
          </div>
        ) : (
          <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
            {items.map((item, index) => {
              const isCopied = copied === item;
              return (
                <div
                  key={`${item}-${index}`}
                  className={[
                    "group/item relative flex items-center gap-3 rounded-lg",
                    "border border-white/[0.055]",
                    "bg-black/20 px-3 py-2.5",
                    "transition-all duration-150",
                    "hover:border-cyan-400/15 hover:bg-cyan-400/[0.018]",
                  ].join(" ")}
                >
                  {/* ACTIVE EDGE */}
                  <span
                    className={[
                      "absolute bottom-2 left-0 top-2 w-px opacity-0 transition-opacity",
                      "group-hover/item:opacity-100",
                      theme.edge,
                    ].join(" ")}
                  />
                  {/* INDEX */}
                  <span className="w-5 shrink-0 text-center font-mono text-[7px] text-slate-700">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {/* ENTITY */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[10px] text-slate-300">
                      {item}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[6px] uppercase tracking-[0.12em] text-slate-600">
                      <span className={`h-1 w-1 rounded-full ${theme.dot}`} />
                      VERIFIED EXTRACTION
                    </div>
                  </div>
                  {/* COPY */}
                  <button
                    type="button"
                    onClick={() => onCopy(item)}
                    title={isCopied ? "Copied" : "Copy entity"}
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                      "transition-all duration-150",
                      isCopied
                        ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-400"
                        : "border-white/[0.065] bg-white/[0.018] text-slate-600 hover:border-cyan-400/20 hover:bg-cyan-400/[0.04] hover:text-cyan-400",
                    ].join(" ")}
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* FOOTER */}
      {items.length > 0 && (
        <div className="border-t border-white/[0.06] px-4 py-2">
          <div className="flex items-center justify-between font-mono text-[6px] uppercase tracking-[0.14em]">
            <span className="text-slate-600">MATCHES</span>
            <span className={theme.text}>{items.length} IDENTIFIED</span>
          </div>
        </div>
      )}
    </div>
  );
}
/* ==============================================================
   ENTITY THEMES
   ============================================================== */
function getEntityTheme(type: EntityType) {
  switch (type) {
    case "telegram":
      return {
        text: "text-cyan-400",
        iconBorder: "border-cyan-400/20",
        iconBackground: "bg-cyan-400/[0.045]",
        badge: "border-cyan-400/20 bg-cyan-400/[0.04] text-cyan-300",
        edge: "bg-cyan-400",
        dot: "bg-cyan-400",
      };
    case "email":
      return {
        text: "text-orange-400",
        iconBorder: "border-orange-400/20",
        iconBackground: "bg-orange-400/[0.04]",
        badge: "border-orange-400/20 bg-orange-400/[0.04] text-orange-300",
        edge: "bg-orange-400",
        dot: "bg-orange-400",
      };
    case "website":
      return {
        text: "text-violet-400",
        iconBorder: "border-violet-400/20",
        iconBackground: "bg-violet-400/[0.04]",
        badge: "border-violet-400/20 bg-violet-400/[0.04] text-violet-300",
        edge: "bg-violet-400",
        dot: "bg-violet-400",
      };
    case "phone":
      return {
        text: "text-emerald-400",
        iconBorder: "border-emerald-400/20",
        iconBackground: "bg-emerald-400/[0.04]",
        badge: "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-300",
        edge: "bg-emerald-400",
        dot: "bg-emerald-400",
      };
  }
}
