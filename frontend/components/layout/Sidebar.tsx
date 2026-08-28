"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronRight,
  CircleDot,
  Database,
  FileText,
  FolderSearch,
  Globe2,
  History,
  LayoutDashboard,
  Network,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  Terminal,
  Upload,
  Wallet,
  Zap,
} from "lucide-react";
interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  tone?: "cyan" | "green" | "amber" | "violet" | "red";
}
interface NavSection {
  category: string;
  items: NavItem[];
}
/* ================================================================
   NAVIGATION MODEL
   ================================================================ */
const navSections: NavSection[] = [
  {
    category: "OVERVIEW",
    items: [
      {
        name: "Command Center",
        href: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    category: "INTAKE & EXTRACTION",
    items: [
      {
        name: "Extraction Workbench",
        href: "/upload",
        icon: Upload,
      },
      {
        name: "Evidence Vault",
        href: "/evidence",
        icon: FolderSearch,
        tone: "cyan",
      },
      {
        name: "OSINT Feed",
        href: "/osint",
        icon: Radio,
        badge: "LIVE",
        tone: "green",
      },
    ],
  },
  {
    category: "ATTRIBUTION & REPORTS",
    items: [
      {
        name: "Wallet Identity",
        href: "/wallet",
        icon: Wallet,
        tone: "amber",
      },
      {
        name: "Entity Graph",
        href: "/graph",
        icon: Network,
        tone: "violet",
      },
      {
        name: "Investigation Reports",
        href: "/reports",
        icon: FileText,
      },
      {
        name: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];
/* ================================================================
   BADGE STYLES
   ================================================================ */
const badgeStyles: Record<NonNullable<NavItem["tone"]>, string> = {
  cyan: "border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300",
  green: "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300",
  amber: "border-amber-400/15 bg-amber-400/[0.06] text-amber-300",
  violet: "border-violet-400/15 bg-violet-400/[0.06] text-violet-300",
  red: "border-red-400/15 bg-red-400/[0.06] text-red-300",
};
/* ================================================================
   SIDEBAR
   ================================================================ */
export default function Sidebar() {
  const pathname = usePathname();
  /*
   * Global Search
   *
   * GlobalSearchModal is mounted in AppLayout.
   * The sidebar simply sends an event to open it.
   */
  const openGlobalSearch = () => {
    window.dispatchEvent(new Event("gk:open-search"));
  };
  return (
    <aside
      className="
        flex
        h-full
        w-[268px]
        shrink-0
        flex-col
        overflow-hidden
        bg-[#070b11]/95
        select-none
      "
    >
      {/* ==========================================================
          BRAND
          ========================================================== */}
      <div className="border-b border-white/[0.06] px-5 py-5">
        <Link href="/" className="group block">
          <div className="flex items-center gap-3">
            <div
              className="
                relative
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-[11px]
                border
                border-cyan-400/20
                bg-gradient-to-br
                from-cyan-400/[0.10]
                to-cyan-400/[0.025]
                text-cyan-300
                shadow-[0_0_25px_rgba(34,211,238,0.04)]
                transition-all
                duration-200
                group-hover:border-cyan-400/35
                group-hover:shadow-[0_0_25px_rgba(34,211,238,0.10)]
              "
            >
              <ShieldAlert size={21} strokeWidth={1.7} />
              <span className="absolute left-0 top-0 h-2.5 w-2.5 border-l border-t border-cyan-400/70" />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r border-cyan-400/70" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="
                    text-[14px]
                    font-bold
                    tracking-[0.18em]
                    text-[var(--gk-white)]
                  "
                >
                  GATEKEEPER
                </span>
                <span
                  className="
                    rounded-md
                    border
                    border-white/[0.08]
                    bg-white/[0.025]
                    px-1.5
                    py-0.5
                    font-data
                    text-[7px]
                    font-medium
                    tracking-[0.12em]
                    text-[var(--gk-dim)]
                  "
                ></span>
              </div>
              <p
                className="
                  mt-1
                  truncate
                  font-data
                  text-[8px]
                  tracking-[0.14em]
                  text-[var(--gk-dim)]
                "
              ></p>
            </div>
          </div>
        </Link>
      </div>
      {/* ==========================================================
          COMMAND SEARCH
          ========================================================== */}
      <div className="px-3 pt-4">
        <button
          type="button"
          onClick={openGlobalSearch}
          aria-label="Open global search"
          className="
            group
            flex
            w-full
            items-center
            gap-3
            rounded-[9px]
            border
            border-white/[0.06]
            bg-white/[0.025]
            px-3
            py-2.5
            text-left
            transition-all
            duration-200
            hover:border-cyan-400/15
            hover:bg-cyan-400/[0.035]
            focus:outline-none
            focus:ring-1
            focus:ring-cyan-400/20
          "
        >
          <Search
            size={14}
            className="
              text-[var(--gk-dim)]
              transition-colors
              group-hover:text-cyan-300
            "
          />
          <span className="flex-1 text-[11px] text-[var(--gk-muted)]">
            Search intelligence
          </span>
          <kbd
            className="
              rounded
              border
              border-white/[0.07]
              bg-black/20
              px-1.5
              py-0.5
              font-data
              text-[7px]
              text-[var(--gk-dim)]
            "
          >
            ⌘K
          </kbd>
        </button>
      </div>
      {/* ==========================================================
          NAVIGATION
          ========================================================== */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-6">
          {navSections.map((section) => (
            <div key={section.category}>
              <div className="mb-2 flex items-center gap-2 px-3">
                <span className="h-px w-3 bg-cyan-400/35" />
                <span
                  className="
                    font-data
                    text-[8px]
                    font-medium
                    tracking-[0.2em]
                    text-[var(--gk-dim)]
                  "
                >
                  {section.category}
                </span>
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        group
                        relative
                        flex
                        min-h-[40px]
                        items-center
                        justify-between
                        rounded-[8px]
                        px-3
                        transition-all
                        duration-150
                        ${
                          isActive
                            ? "bg-cyan-400/[0.065] text-[var(--gk-white)]"
                            : "text-[var(--gk-muted)] hover:bg-white/[0.025] hover:text-[var(--gk-text)]"
                        }
                      `}
                    >
                      {isActive && (
                        <span
                          className="
                            absolute
                            left-0
                            top-1/2
                            h-5
                            w-[2px]
                            -translate-y-1/2
                            rounded-r-full
                            bg-cyan-400
                            shadow-[0_0_12px_rgba(34,211,238,0.65)]
                          "
                        />
                      )}
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon
                          size={15}
                          strokeWidth={isActive ? 2 : 1.7}
                          className={`
                            shrink-0
                            transition-colors
                            ${
                              isActive
                                ? "text-cyan-300"
                                : "text-[var(--gk-dim)] group-hover:text-[var(--gk-text)]"
                            }
                          `}
                        />
                        <span
                          className={`
                            truncate
                            text-[11.5px]
                            ${isActive ? "font-semibold" : "font-medium"}
                          `}
                        >
                          {item.name}
                        </span>
                      </div>
                      {item.badge ? (
                        <span
                          className={`
                            ml-2
                            shrink-0
                            rounded-[5px]
                            border
                            px-1.5
                            py-0.5
                            font-data
                            text-[7px]
                            font-medium
                            tracking-[0.1em]
                            ${
                              item.tone
                                ? badgeStyles[item.tone]
                                : badgeStyles.cyan
                            }
                          `}
                        >
                          {item.badge}
                        </span>
                      ) : isActive ? (
                        <ChevronRight
                          size={12}
                          className="shrink-0 text-cyan-400/60"
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
      {/* ==========================================================
          ACTIVE INFRASTRUCTURE
          ========================================================== */}
      <div className="border-t border-white/[0.06] p-3">
        <div
          className="
            overflow-hidden
            rounded-[11px]
            border
            border-white/[0.06]
            bg-white/[0.018]
          "
        >
          <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-cyan-400/70" />
              <span
                className="
                  font-data
                  text-[8px]
                  font-medium
                  tracking-[0.12em]
                  text-[var(--gk-dim)]
                "
              >
                INFRASTRUCTURE
              </span>
            </div>
            <CircleDot size={9} className="text-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
            <InfrastructureItem
              icon={Database}
              label="DATABASE"
              value="READY"
            />
            <InfrastructureItem icon={Radio} label="COLLECTOR" value="LIVE" />
            <InfrastructureItem
              icon={Activity}
              label="OCR ENGINE"
              value="ACTIVE"
            />
            <InfrastructureItem icon={Network} label="GRAPH" value="SYNC" />
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[var(--gk-dim)]">
            <Globe2 size={10} />
            <span
              className="
                font-data
                text-[7px]
                tracking-[0.12em]
              "
            ></span>
          </div>
          <span
            className="
              font-data
              text-[7px]
              tracking-[0.1em]
              text-emerald-400/70
            "
          ></span>
        </div>
      </div>
    </aside>
  );
}
/* ================================================================
   INFRASTRUCTURE ITEM
   ================================================================ */
function InfrastructureItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#0b1017] px-2.5 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon size={10} className="text-[var(--gk-dim)]" />
        <span
          className="
            font-data
            text-[6.5px]
            tracking-[0.1em]
            text-[var(--gk-dim)]
          "
        >
          {label}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-emerald-400" />
        <span
          className="
            font-data
            text-[7px]
            font-medium
            tracking-[0.08em]
            text-[var(--gk-muted)]
          "
        >
          {value}
        </span>
      </div>
    </div>
  );
}
