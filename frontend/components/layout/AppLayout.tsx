"use client";
import { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import GlobalSearchModal from "../common/GlobalSearchModal";
interface Props {
  children: ReactNode;
}
export default function AppLayout({ children }: Props) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-[var(--gk-950)] text-[var(--gk-white)]">
      {/* =========================================================
          GLOBAL ENVIRONMENT
          ========================================================= */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Primary intelligence glow */}
        <div
          className="
            absolute
            -left-[280px]
            -top-[320px]
            h-[760px]
            w-[760px]
            rounded-full
            bg-cyan-400/[0.035]
            blur-[180px]
          "
        />
        {/* Secondary analytical glow */}
        <div
          className="
            absolute
            -right-[300px]
            top-[12%]
            h-[680px]
            w-[680px]
            rounded-full
            bg-violet-500/[0.025]
            blur-[190px]
          "
        />
        {/* Bottom ambient light */}
        <div
          className="
            absolute
            bottom-[-420px]
            left-[35%]
            h-[760px]
            w-[760px]
            rounded-full
            bg-cyan-400/[0.015]
            blur-[190px]
          "
        />
      </div>
      {/* =========================================================
          GLOBAL TOAST SYSTEM
          ========================================================= */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#0b1118",
            color: "#f4f7f9",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            fontSize: "13px",
            padding: "12px 14px",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.45), 0 0 30px rgba(34,211,238,0.035)",
          },
          success: {
            iconTheme: {
              primary: "#34d399",
              secondary: "#0b1118",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#0b1118",
            },
          },
        }}
      />
      <GlobalSearchModal />
      {/* =========================================================
          APPLICATION FRAME
          ========================================================= */}
      <div className="relative z-10 flex min-w-0 flex-1 overflow-hidden">
        {/* =======================================================
            SIDEBAR
            ======================================================= */}
        <aside
          className="
            relative
            z-30
            hidden
            h-full
            shrink-0
            border-r
            border-white/[0.07]
            bg-[#070b11]/90
            backdrop-blur-2xl
            lg:flex
          "
        >
          {/* Sidebar atmospheric edge */}
          <div
            className="
              pointer-events-none
              absolute
              right-0
              top-0
              h-full
              w-px
              bg-gradient-to-b
              from-transparent
              via-cyan-400/[0.18]
              to-transparent
            "
          />
          {/* Sidebar inner glow */}
          <div
            className="
              pointer-events-none
              absolute
              left-0
              top-0
              h-40
              w-full
              bg-gradient-to-b
              from-cyan-400/[0.025]
              to-transparent
            "
          />
          <Sidebar />
        </aside>
        {/* =======================================================
            MAIN APPLICATION
            ======================================================= */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* =====================================================
              TOP COMMAND BAR
              ===================================================== */}
          <header
            className="
              relative
              z-30
              shrink-0
              border-b
              border-white/[0.07]
              bg-[#070b11]/88
              backdrop-blur-2xl
            "
          >
            <Topbar />
            {/* Active command-line accent */}
            <div
              className="
                pointer-events-none
                absolute
                bottom-0
                left-0
                h-px
                w-40
                bg-gradient-to-r
                from-cyan-400/80
                via-cyan-400/25
                to-transparent
                shadow-[0_0_18px_rgba(34,211,238,0.22)]
              "
            />
          </header>
          {/* =====================================================
              WORKSPACE
              ================================================     */}
          <main
            className="
              relative
              flex-1
              overflow-x-hidden
              overflow-y-auto
              bg-[var(--gk-950)]
            "
          >
            {/* Technical grid */}
            <div
              className="
                gk-grid-fine
                pointer-events-none
                absolute
                inset-0
                opacity-[0.32]
                [mask-image:linear-gradient(to_bottom,black,transparent_78%)]
              "
            />
            {/* Upper intelligence atmosphere */}
            <div
              className="
                pointer-events-none
                absolute
                left-1/2
                top-[-220px]
                h-[480px]
                w-[1000px]
                -translate-x-1/2
                rounded-full
                bg-cyan-400/[0.018]
                blur-[150px]
              "
            />
            {/* Left edge atmosphere */}
            <div
              className="
                pointer-events-none
                absolute
                left-0
                top-0
                h-[420px]
                w-[320px]
                bg-gradient-to-r
                from-cyan-500/[0.012]
                to-transparent
              "
            />
            {/* =================================================
                CONTENT CONTAINER
                ================================================ */}
            <div
              className="
                relative
                mx-auto
                w-full
                max-w-[1900px]
                px-4
                py-5
                sm:px-5
                sm:py-6
                md:px-7
                md:py-7
                xl:px-9
                xl:py-8
                2xl:px-10
              "
            >
              {children}
            </div>
          </main>
          {/* =====================================================
              SYSTEM TELEMETRY
              ================================================     */}
          <footer
            className="
              relative
              z-30
              shrink-0
              border-t
              border-white/[0.07]
              bg-[#070b11]/92
              backdrop-blur-2xl
            "
          >
            {/* Telemetry line */}
            <div
              className="
                pointer-events-none
                absolute
                left-0
                right-0
                top-0
                h-px
                bg-gradient-to-r
                from-transparent
                via-cyan-400/[0.16]
                to-transparent
              "
            />
          </footer>
        </div>
      </div>
      {/* =========================================================
          GLOBAL FRAME
          ========================================================= */}
      <div
        className="
          pointer-events-none
          fixed
          inset-0
          z-50
          border
          border-white/[0.018]
        "
      />
    </div>
  );
}
