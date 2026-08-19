"use client";
import { ReactNode } from "react";
interface GKBadgeProps {
  children: ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "gray";
  size?: "sm" | "md" | "lg";
  rounded?: boolean;
  className?: string;
}
export default function GKBadge({
  children,
  variant = "primary",
  size = "md",
  rounded = true,
  className = "",
}: GKBadgeProps) {
  const variants = {
    primary: "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30",
    secondary: "bg-slate-700/30 text-slate-300 border border-slate-600",
    success: "bg-green-600/20 text-green-400 border border-green-500/30",
    warning: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    danger: "bg-red-600/20 text-red-400 border border-red-500/30",
    info: "bg-blue-600/20 text-blue-400 border border-blue-500/30",
    gray: "bg-gray-700/30 text-gray-300 border border-gray-600",
  };
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };
  return (
    <span
      className={`
                inline-flex
                items-center
                justify-center
                font-medium
                whitespace-nowrap
                transition-all
                duration-300
                ${variants[variant]}
                ${sizes[size]}
                ${rounded ? "rounded-full" : "rounded-lg"}
                ${className}
            `}
    >
      {children}
    </span>
  );
}
