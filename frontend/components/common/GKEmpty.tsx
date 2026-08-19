"use client";
import type { ReactNode } from "react";
import GKButton from "./GKButton";
interface GKEmptyProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  buttonText?: string;
  onButtonClick?: () => void;
}
export default function GKEmpty({
  title = "Nothing Found",
  description = "No data is currently available.",
  icon,
  buttonText,
  onButtonClick,
}: GKEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      {/* ICON */}
      {icon && (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-400">
          {icon}
        </div>
      )}
      {/* TITLE */}
      <h2 className="font-display text-lg font-medium tracking-tight text-slate-200">
        {title}
      </h2>
      {/* DESCRIPTION */}
      <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
        {description}
      </p>
      {/* ACTION */}
      {buttonText && (
        <div className="mt-6">
          <GKButton onClick={onButtonClick}>{buttonText}</GKButton>
        </div>
      )}
    </div>
  );
}
