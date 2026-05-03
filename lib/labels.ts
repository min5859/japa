// Form option lists for shared/cross-entity enums.
// Entity-specific enums (AccountType, AssetClass) live in `lib/<entity>/schema.ts`.
// Currency는 Account/Holding/Dividend 폼이 모두 사용하므로 여기 보관.

type Option = { value: string; label: string };

export const CURRENCIES: Option[] = [
  { value: "KRW", label: "KRW - 원화" },
  { value: "USD", label: "USD - 달러" },
  { value: "EUR", label: "EUR - 유로" },
  { value: "JPY", label: "JPY - 엔화" },
  { value: "CNY", label: "CNY - 위안" },
  { value: "GBP", label: "GBP - 파운드" },
  { value: "HKD", label: "HKD - 홍콩달러" },
  { value: "SGD", label: "SGD - 싱가포르달러" }
];

// Yahoo Finance quoteType → 한국어 표기. Used by /quote search candidates.
export const QUOTE_TYPE_LABELS: Record<string, string> = {
  EQUITY: "주식",
  ETF: "ETF",
  MUTUALFUND: "펀드",
  CRYPTOCURRENCY: "암호화폐",
  CURRENCY: "통화"
};
