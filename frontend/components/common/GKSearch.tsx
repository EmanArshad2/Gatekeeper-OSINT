"use client";
import { ChangeEvent } from "react";
export interface GKFilter {
  label: string;
  value: string;
  options: string[];
}
interface GKSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filters?: GKFilter[];
  onFilterChange?: (index: number, value: string) => void;
}
export default function GKSearch({
  value,
  onChange,
  placeholder = "Search...",
  filters = [],
  onFilterChange,
}: GKSearchProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="relative min-w-[280px] flex-1">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          🔍
        </span>
        <input
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-12 pr-4 text-white outline-none transition focus:border-cyan-500"
        />
      </div>
      {filters.map((filter, index) => (
        <select
          key={`${filter.label}-${index}`}
          value={filter.value}
          onChange={(e) => onFilterChange?.(index, e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none"
        >
          {filter.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
