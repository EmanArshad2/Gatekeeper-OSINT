import { api } from "./api";
export interface HistoryItem {
  id: number;
  filename: string;
  uploaded_at: string;
  wallet_count: number;
  risk_score: number;
}
export async function getHistory() {
  const response = await api.get("/history");
  return response.data.history;
}
