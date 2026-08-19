"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
interface GKButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}
export default function GKButton({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  type = "button",
  ...props
}: GKButtonProps) {
  const variants = {
    primary:
      "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-300 hover:border-cyan-400/40 hover:bg-cyan-400/[0.13]",
    secondary:
      "border-white/[0.10] bg-white/[0.035] text-slate-300 hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-slate-100",
    danger:
      "border-red-400/20 bg-red-400/[0.06] text-red-300 hover:border-red-400/35 hover:bg-red-400/[0.10]",
    ghost:
      "border-transparent bg-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
  };
  const sizes = {
    sm: "h-8 px-3 text-[8px]",
    md: "h-9 px-4 text-[9px]",
    lg: "h-10 px-5 text-[10px]",
  };
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2",
        "rounded-lg border",
        "font-data font-semibold uppercase tracking-[0.12em]",
        "transition-all duration-200",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      ].join(" ")}
    >
      {loading && (
        <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
