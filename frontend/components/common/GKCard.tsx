"use client";
import { ReactNode } from "react";
interface GKCardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}
export default function GKCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: GKCardProps) {
  return (
    <div
      className={`
                rounded-2xl
                border
                border-slate-800
                bg-slate-900/70
                backdrop-blur-md
                shadow-lg
                shadow-cyan-950/20
                transition-all
                duration-300
                hover:border-cyan-500/50
                hover:shadow-cyan-500/10
                ${className}
            `}
    >
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between border-b border-slate-800 p-6">
          <div>
            {title && (
              <h2 className="text-xl font-semibold text-white">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
