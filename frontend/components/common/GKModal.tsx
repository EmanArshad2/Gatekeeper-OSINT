"use client";
import { ReactNode, useEffect } from "react";
interface GKModalProps {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}
export default function GKModal({
  open,
  title,
  children,
  onClose,
  footer,
  size = "md",
}: GKModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);
  if (!open) {
    return null;
  }
  const widths = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`
                    w-full
                    ${widths[size]}
                    rounded-2xl
                    border
                    border-slate-800
                    bg-slate-900
                    shadow-2xl
                    animate-in
                    fade-in
                    zoom-in-95
                    duration-200
                `}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-800 p-6">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="border-t border-slate-800 p-6">{footer}</div>
        )}
      </div>
    </div>
  );
}
