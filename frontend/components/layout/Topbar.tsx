"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Bell,
  Upload,
  Flame,
  CheckCircle2,
  Command,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import NotificationsPanel from "./NotificationsPanel";
interface TopbarProps {
  onToggleFilters?: () => void;
  showFilterToggle?: boolean;
}
export default function Topbar({
  onToggleFilters,
  showFilterToggle = false,
}: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  return (
    <header
      className="
        relative
        z-20
        h-[68px]
        shrink-0
        border-b
        border-white/[0.065]
        bg-[#060b12]/90
        px-4
        backdrop-blur-2xl
        md:px-6
        xl:px-8
      "
    >
      <div className="flex h-full items-center gap-4">
        {/* =========================================================
            SYSTEM CONTEXT
            ========================================================= */}
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {/* Operational indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className="
                  absolute
                  inline-flex
                  h-full
                  w-full
                  animate-ping
                  rounded-full
                  bg-emerald-400
                  opacity-40
                "
              />
              <span
                className="
                  relative
                  h-2
                  w-2
                  rounded-full
                  bg-emerald-400
                "
              />
            </span>
            <span
              className="
                font-mono
                text-[9px]
                font-semibold
                tracking-[0.16em]
                text-slate-400
              "
            >
              INTELLIGENCE COMMAND
            </span>
          </div>
          <div className="h-5 w-px bg-white/[0.07]" />
          {/* Threat state */}
          <div
            className="
              flex
              items-center
              gap-2
              rounded-md
              border
              border-red-400/15
              bg-red-400/[0.05]
              px-2.5
              py-1.5
            "
          ></div>
        </div>
        {/* =========================================================
            GLOBAL SEARCH
            ========================================================= */}
        <div className="relative mx-auto w-full max-w-[620px] flex-1">
          <Search
            size={15}
            strokeWidth={1.7}
            className="
              pointer-events-none
              absolute
              left-3.5
              top-1/2
              -translate-y-1/2
              text-slate-600
            "
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search wallet, transaction hash, entity, username..."
            aria-label="Global search"
            className="
              h-10
              w-full
              rounded-lg
              border
              border-white/[0.07]
              bg-white/[0.025]
              pl-10
              pr-20
              font-mono
              text-[11px]
              text-slate-200
              placeholder:text-slate-600
              outline-none
              transition-all
              duration-200
              focus:border-cyan-400/30
              focus:bg-cyan-400/[0.025]
              focus:ring-1
              focus:ring-cyan-400/10
            "
          />
          {/* Keyboard shortcut */}
          <div
            className="
              absolute
              right-2.5
              top-1/2
              hidden
              -translate-y-1/2
              items-center
              gap-1
              rounded
              border
              border-white/[0.07]
              bg-white/[0.035]
              px-1.5
              py-0.5
              font-mono
              text-[9px]
              text-slate-600
              sm:flex
            "
          >
            <Command size={9} strokeWidth={1.5} />
            <span>K</span>
          </div>
        </div>
        {/* =========================================================
            ACTIONS
            ========================================================= */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Optional filter toggle button */}
          {showFilterToggle && (
            <button
              type="button"
              onClick={onToggleFilters}
              aria-label="Toggle filters"
              className="
                flex
                h-9
                items-center
                gap-2
                rounded-md
                border
                border-white/[0.07]
                bg-white/[0.025]
                px-3
                font-mono
                text-[10px]
                font-medium
                text-slate-400
                transition-all
                duration-150
                hover:border-white/[0.12]
                hover:bg-white/[0.04]
                hover:text-slate-200
              "
            >
              <SlidersHorizontal size={13} strokeWidth={1.7} />
              <span className="hidden sm:inline">FILTERS</span>
            </button>
          )}
          {/* Ingest Evidence */}
          <Link
            href="/upload"
            className="
              flex
              h-9
              items-center
              gap-2
              rounded-md
              border
              border-cyan-400/20
              bg-cyan-400/[0.08]
              px-3
              font-mono
              text-[10px]
              font-semibold
              tracking-wider
              text-cyan-300
              transition-all
              duration-150
              hover:border-cyan-400/40
              hover:bg-cyan-400/[0.12]
              hover:text-cyan-200
            "
          >
            <Upload size={14} strokeWidth={1.7} />
            <span className="hidden xl:inline">INGEST EVIDENCE</span>
          </Link>
          {/* Notifications */}
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((v) => !v)}
            className="
              relative
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-md
              border
              border-white/[0.07]
              bg-white/[0.025]
              text-slate-500
              transition-all
              duration-150
              hover:border-white/[0.12]
              hover:bg-white/[0.04]
              hover:text-slate-200
            "
          >
            <Bell size={15} strokeWidth={1.7} />
            {unreadCount > 0 && (
              <span
                className="
                  absolute
                  right-2
                  top-2
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-cyan-400
                  shadow-[0_0_7px_rgba(34,211,238,0.8)]
                "
              />
            )}
          </button>
          <NotificationsPanel
            open={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            onUnreadCount={setUnreadCount}
          />
          <div className="hidden h-5 w-px bg-white/[0.07] sm:block" />
          {/* =======================================================
              ANALYST
              ======================================================= */}
          <div className="hidden items-center gap-2.5 sm:flex">
            {/* Analyst icon */}
            <div
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-md
                border
                border-cyan-400/20
                bg-cyan-400/[0.06]
                text-cyan-300
              "
            >
              <ShieldAlert size={15} strokeWidth={1.7} />
            </div>
            <div
              className="
                  mt-0.5
                  flex
                  items-center
                  gap-1
                  font-mono
                  text-[8px]
                  tracking-wider
                  text-cyan-400/70
                "
            ></div>
          </div>
        </div>
      </div>
      {/* =========================================================
          ACTIVE COMMAND ACCENT
          ========================================================= */}
      <div
        className="
          pointer-events-none
          absolute
          bottom-0
          left-0
          h-px
          w-28
          bg-gradient-to-r
          from-cyan-400/80
          via-cyan-400/30
          to-transparent
          shadow-[0_0_16px_rgba(34,211,238,0.25)]
        "
      />
    </header>
  );
}
