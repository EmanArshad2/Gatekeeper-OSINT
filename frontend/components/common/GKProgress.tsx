"use client";
interface GKProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  animated?: boolean;
  color?: "cyan" | "green" | "yellow" | "red";
  height?: "sm" | "md" | "lg";
  className?: string;
}
export default function GKProgress({
  value,
  max = 100,
  label,
  showValue = true,
  animated = true,
  color = "cyan",
  height = "md",
  className = "",
}: GKProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const colors = {
    cyan: "bg-cyan-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };
  const heights = {
    sm: "h-2",
    md: "h-3",
    lg: "h-5",
  };
  return (
    <div className={`space-y-2 ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-sm text-slate-300">{label}</span>}
          {showValue && (
            <span className="text-sm font-medium text-white">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`
                    w-full
                    overflow-hidden
                    rounded-full
                    bg-slate-800
                    ${heights[height]}
                `}
      >
        <div
          className={`
                        h-full
                        rounded-full
                        ${colors[color]}
                        ${animated ? "transition-all duration-700 ease-out" : ""}
                    `}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}
