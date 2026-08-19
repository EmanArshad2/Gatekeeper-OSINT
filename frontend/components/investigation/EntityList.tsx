"use client";
import { useState } from "react";
import {
  Wallet,
  Send,
  Globe,
  Mail,
  Phone,
  Copy,
  ExternalLink,
  Check,
  Cpu,
  Layers,
} from "lucide-react";
interface EntityListProps {
  wallets: string[];
  telegramUsers: string[];
  emails: string[];
  websites: string[];
  phones: string[];
}
export default function EntityList({
  wallets,
  telegramUsers,
  emails,
  websites,
  phones,
}: EntityListProps) {
  const totalCount =
    wallets.length +
    telegramUsers.length +
    emails.length +
    websites.length +
    phones.length;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-xl">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
              OSINT // EXTRACTION
            </span>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
            Extracted Intelligence
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Discovered forensic identifiers and communication nodes
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px] text-slate-400">
          <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1">
            TOTAL: <strong className="text-cyan-300">{totalCount}</strong>
          </span>
        </div>
      </div>
      {/* GRID */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <EntityBox
          title="Wallet Addresses"
          icon={<Wallet size={16} strokeWidth={1.6} />}
          items={wallets}
          type="wallet"
        />
        <EntityBox
          title="Telegram Users"
          icon={<Send size={16} strokeWidth={1.6} />}
          items={telegramUsers}
          type="telegram"
        />
        <EntityBox
          title="Emails"
          icon={<Mail size={16} strokeWidth={1.6} />}
          items={emails}
          type="email"
        />
        <EntityBox
          title="Websites"
          icon={<Globe size={16} strokeWidth={1.6} />}
          items={websites}
          type="website"
        />
        <EntityBox
          title="Phone Numbers"
          icon={<Phone size={16} strokeWidth={1.6} />}
          items={phones}
          type="phone"
        />
      </div>
    </div>
  );
}
function EntityBox({
  title,
  items,
  icon,
  type,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  type: "wallet" | "telegram" | "email" | "website" | "phone";
}) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const handleCopy = (item: string) => {
    navigator.clipboard.writeText(item);
    setCopiedItem(item);
    setTimeout(() => {
      setCopiedItem(null);
    }, 2000);
  };
  const getExternalLink = (item: string) => {
    switch (type) {
      case "wallet":
        return `https://blockchair.com/search?q=${encodeURIComponent(item)}`;
      case "telegram":
        return `https://t.me/${item.replace("@", "")}`;
      case "email":
        return `mailto:${item}`;
      case "website":
        return item.startsWith("http") ? item : `https://${item}`;
      case "phone":
        return `tel:${item}`;
      default:
        return "#";
    }
  };
  return (
    <div className="relative flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 backdrop-blur-xl transition-all duration-200 hover:border-cyan-400/30">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5 text-cyan-300">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06]">
            {icon}
          </div>
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white">
            {title}
          </h3>
        </div>
        <span className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-0.5 font-mono text-[9px] text-cyan-300">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="flex h-[88px] items-center justify-center text-center">
          <p className="font-mono text-[10px] text-slate-600 uppercase tracking-wider">
            No entities detected
          </p>
        </div>
      ) : (
        <div className="mt-3.5 max-h-[220px] space-y-2 overflow-y-auto pr-1">
          {items.map((item, index) => {
            const isCopied = copiedItem === item;
            return (
              <div
                key={index}
                className="group flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.035]"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-mono text-[11px] text-slate-300 transition-colors group-hover:text-cyan-200"
                    title={item}
                  >
                    {item}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleCopy(item)}
                    title="Copy identifier"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] text-slate-400 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.06] hover:text-cyan-300"
                  >
                    {isCopied ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} strokeWidth={1.6} />
                    )}
                  </button>
                  <a
                    href={getExternalLink(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="External lookup"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] text-slate-400 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.06] hover:text-cyan-300"
                  >
                    <ExternalLink size={13} strokeWidth={1.6} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
