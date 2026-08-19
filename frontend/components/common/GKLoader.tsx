"use client";
interface GKLoaderProps {
  title?: string;
  currentStep?: number;
  steps?: string[];
  progress?: number;
  fullScreen?: boolean;
}
export default function GKLoader({
  title = "Analyzing Evidence",
  currentStep = 0,
  progress = 0,
  fullScreen = false,
  steps = [
    "Initializing",
    "OCR Processing",
    "QR Detection",
    "Wallet Detection",
    "Wallet Validation",
    "Context Correlation",
    "Risk Scoring",
    "Building Investigation Graph",
  ],
}: GKLoaderProps) {
  return (
    <div
      className={`
                flex
                items-center
                justify-center
                ${
                  fullScreen
                    ? "fixed inset-0 z-50 bg-[#08111c]/90 backdrop-blur-md"
                    : "w-full"
                }
            `}
    >
      <div
        className="
                    w-full
                    max-w-xl
                    rounded-2xl
                    border
                    border-slate-800
                    bg-slate-900
                    p-8
                    shadow-2xl
                "
      >
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-slate-400">
          Please wait while Gatekeeper analyzes the evidence.
        </p>
        <div className="mt-8 h-3 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-cyan-500 transition-all duration-700"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
        <div className="mt-8 space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-4">
              {index < currentStep ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-sm font-bold">
                  ✓
                </div>
              ) : index === currentStep ? (
                <div className="h-7 w-7 animate-pulse rounded-full bg-cyan-500" />
              ) : (
                <div className="h-7 w-7 rounded-full border border-slate-700" />
              )}
              <span
                className={
                  index <= currentStep ? "text-white" : "text-slate-500"
                }
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
