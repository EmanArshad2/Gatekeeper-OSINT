"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldAlert, Bug } from "lucide-react";
const API = "http://127.0.0.1:8000/api";
interface Notification {
  type: "high_risk_wallet" | "system_error";
  severity: "critical" | "high" | "warning";
  title: string;
  subtitle: string;
  created_at: string | null;
  route: string;
}
interface NotificationsResponse {
  status: string;
  count: number;
  unread_count: number;
  notifications: Notification[];
}
const SEVERITY_ICON: Record<Notification["severity"], typeof AlertTriangle> = {
  critical: ShieldAlert,
  high: AlertTriangle,
  warning: Bug,
};
const SEVERITY_COLOR: Record<Notification["severity"], string> = {
  critical: "text-red-400",
  high: "text-amber-400",
  warning: "text-slate-400",
};
export default function NotificationsPanel({
  open,
  onClose,
  onUnreadCount,
}: {
  open: boolean;
  onClose: () => void;
  onUnreadCount: (count: number) => void;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    try {
      setLoading(true);
      const response = await fetch(`${API}/notifications`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data: NotificationsResponse = await response.json();
      setNotifications(data.notifications ?? []);
      onUnreadCount(data.unread_count ?? 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]" onClick={onClose}>
      <div
        className="absolute right-4 top-14 w-80 overflow-hidden rounded-xl border border-[#1B2E31] bg-[#0B1416] shadow-2xl sm:right-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#152225] px-4 py-3">
          <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-cyan-400/70">
            NOTIFICATIONS
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="px-4 py-8 text-center font-mono text-[10px] text-slate-600">
              Loading...
            </div>
          )}
          {!loading && notifications.length === 0 && (
            <div className="px-4 py-8 text-center font-mono text-[10px] text-slate-600">
              No notable events yet.
            </div>
          )}
          {!loading &&
            notifications.map((n, idx) => {
              const Icon = SEVERITY_ICON[n.severity];
              return (
                <button
                  key={idx}
                  onClick={() => {
                    onClose();
                    router.push(n.route);
                  }}
                  className="flex w-full items-start gap-3 border-b border-[#0f1a1c] px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <Icon
                    size={13}
                    className={`mt-0.5 shrink-0 ${SEVERITY_COLOR[n.severity]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] text-slate-200">
                      {n.title}
                    </div>
                    <div className="truncate font-mono text-[9px] text-slate-500">
                      {n.subtitle}
                    </div>
                  </div>
                  {n.created_at && (
                    <span className="shrink-0 font-mono text-[8px] text-slate-600">
                      {new Date(n.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
