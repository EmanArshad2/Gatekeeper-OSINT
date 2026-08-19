"use client";
import { InputHTMLAttributes, ReactNode } from "react";
interface GKInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}
export default function GKInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  loading = false,
  fullWidth = true,
  className = "",
  ...props
}: GKInputProps) {
  return (
    <div
      className={`
                flex
                flex-col
                gap-2
                ${fullWidth ? "w-full" : ""}
            `}
    >
      {label && (
        <label className="text-sm font-medium text-slate-300">{label}</label>
      )}
      <div
        className={`
                    flex
                    items-center
                    rounded-xl
                    border
                    bg-slate-900/70
                    backdrop-blur-md
                    transition-all
                    duration-300
                    ${
                      error
                        ? "border-red-500"
                        : "border-slate-700 hover:border-cyan-500 focus-within:border-cyan-500"
                    }
                `}
      >
        {leftIcon && <div className="px-4 text-slate-400">{leftIcon}</div>}
        <input
          {...props}
          className={`
                        flex-1
                        bg-transparent
                        px-4
                        py-3
                        text-white
                        outline-none
                        placeholder:text-slate-500
                        ${className}
                    `}
        />
        {loading ? (
          <div className="mr-4 h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        ) : (
          rightIcon && <div className="px-4 text-slate-400">{rightIcon}</div>
        )}
      </div>
      {error ? (
        <span className="text-sm text-red-400">{error}</span>
      ) : (
        hint && <span className="text-sm text-slate-500">{hint}</span>
      )}
    </div>
  );
}
