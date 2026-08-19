import { api } from "./api";
export interface DashboardMetrics {
  investigations: number;
  wallets: number;
  high_risk: number;
  osint_matches: number;
}
export interface DashboardSystem {
  backend: string;
  database: string;
  ocr: string;
  graph: string;
}
export interface Investigation {
  id: string | number;
  title: string;
  status: string;
  created_at: string | null;
}
export interface WalletAlert {
  address: string;
  chain: string;
  risk?: number;
  risk_score?: number;
}
export interface OSINTItem {
  source: string;
  type?: string;
  message: string;
  risk?: string;
  risk_score?: number;
  address?: string;
  chain?: string;
  keywords?: string[];
  time?: string;
}
export interface DashboardData {
  updated_at: string;
  metrics: DashboardMetrics;
  investigations: Investigation[];
  wallet_alerts: WalletAlert[];
  osint: OSINTItem[];
  system: DashboardSystem;
}
export async function getDashboardData(): Promise<DashboardData> {
  const response = await api.get<DashboardData>("/dashboard");
  return response.data;
}
