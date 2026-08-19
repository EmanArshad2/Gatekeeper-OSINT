import { api } from "./api";
export interface SearchResult {
  type: "wallet" | "evidence" | "extraction";
  id: number;
  title: string;
  subtitle?: string;
  risk_level?: string | null;
  route: string;
}
interface SearchResponse {
  status: string;
  query: string;
  count: number;
  results: SearchResult[];
}
export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const response = await api.get<SearchResponse>("/search", {
    params: { q: query, limit: 8 },
  });
  return response.data.results;
}
