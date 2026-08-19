"use client";
import {
  Upload,
  ScanSearch,
  Wallet,
  Globe,
  Network,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Clock3,
  Layers,
} from "lucide-react";
export interface TimelineItem {
  title: string;
  description: string;
  completed: boolean;
  timestamp?: string;
  icon: any;
}
interface Props {
  timeline?: TimelineItem[];
}
const defaultTimeline: TimelineItem[] = [
  {
    title: "Evidence Uploaded",
    description: "Media evidence received.",
    completed: true,
    icon: Upload,
  },
  {
    title: "OCR Extraction",
    description: "Extracting text from evidence.",
    completed: true,
    icon: ScanSearch,
  },
  {
    title: "Wallet Detection",
    description: "Blockchain addresses identified.",
    completed: true,
    icon: Wallet,
  },
  {
    title: "OSINT Correlation",
    description: "Searching intelligence sources.",
    completed: false,
    icon: Globe,
  },
  {
    title: "Graph Investigation",
    description: "Building transaction graph.",
    completed: false,
    icon: Network,
  },
  {
    title: "Risk Assessment",
    description: "Calculating forensic risk.",
    completed: false,
    icon: ShieldCheck,
  },
  {
    title: "Forensic Report",
    description: "Preparing investigation report.",
    completed: false,
    icon: FileText,
  },
];
export default function EvidenceTimeline({
  timeline = defaultTimeline,
}: Props) {
  const completedCount = timeline.filter((item) => item.completed).length;
  const progressPercentage = Math.round(
    (completedCount / timeline.length) * 100,
  );
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      {/* HEADER */}
      <div className="border-b border-white/[0.06] px-5 py-4 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </span>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
                INVESTIGATION PIPELINE
              </span>
            </div>
            <h2 className="mt-1 text-sm font-semibold tracking-tight text-white">
              Evidence Timeline
            </h2>
          </div>
          <span className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-1 font-mono text-[9px] text-cyan-300">
            {progressPercentage}% COMPLETE
          </span>
        </div>
        {/* PROGRESS BAR */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      {/* TIMELINE LIST */}
      <div className="p-5 lg:p-6">
        <div className="relative space-y-1">
          {timeline.map((item, index) => {
            const Icon = item.icon;
            const last = index === timeline.length - 1;
            return (
              <div key={index} className="relative flex min-w-0 gap-3.5">
                {!last && (
                  <span
                    className={`absolute left-[15px] top-8 h-[calc(100%+4px)] w-px transition-colors duration-300 ${
                      item.completed ? "bg-emerald-400/40" : "bg-white/[0.06]"
                    }`}
                  />
                )}
                <div
                  className={`
                    relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border backdrop-blur-xl
                    transition-all duration-300
                    ${
                      item.completed
                        ? "border-emerald-400/30 bg-emerald-400/[0.08] shadow-[0_0_12px_rgba(52,211,153,0.15)]"
                        : "border-white/[0.07] bg-white/[0.025]"
                    }
                  `}
                >
                  <Icon
                    size={14}
                    strokeWidth={1.6}
                    className={
                      item.completed ? "text-emerald-400" : "text-slate-600"
                    }
                  />
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span
                      className={`truncate text-xs font-medium tracking-tight ${
                        item.completed ? "text-slate-200" : "text-slate-500"
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.completed ? (
                      <span className="flex items-center gap-1 rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] px-1.5 py-0.5 font-mono text-[8px] text-emerald-400 uppercase tracking-wider">
                        <CheckCircle2 size={10} className="text-emerald-400" />
                        Done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/[0.06] px-1.5 py-0.5 font-mono text-[8px] text-amber-400 uppercase tracking-wider">
                        <Clock3 size={10} className="text-amber-400" />
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-500">
                    {item.description}
                  </p>
                  {item.timestamp && (
                    <p className="mt-1 font-mono text-[8px] text-slate-600">
                      {item.timestamp}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
