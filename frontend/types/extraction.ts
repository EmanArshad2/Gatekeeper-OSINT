export interface Wallet {
  address: string;
  chain: string;
  valid: boolean;
  confidence: number;
  risk_score?: number;
  page_number?: number;
  ocr_corrected?: boolean;
  raw_ocr_text?: string;
}
export interface Correlation {
  telegram_users: string[];
  emails: string[];
  websites: string[];
  phones: string[];
}
export interface ExtractionResponse {
  status: string;
  filename: string;
  ocr_text: string;
  qr_codes: string[];
  wallets: Wallet[];
  wallet_count: number;
  telegram_users: string[];
  emails: string[];
  websites: string[];
  phones: string[];
  page_count?: number;
}
