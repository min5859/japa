// Single source of truth for enum labels and form option lists.
// Forms read the array form (ACCOUNT_TYPES, etc.); pages read the Record form
// derived from the same array — adding a new value updates both at once.

type Option = { value: string; label: string };

const toLabelMap = (opts: readonly Option[]): Record<string, string> =>
  Object.fromEntries(opts.map((o) => [o.value, o.label]));

export const ACCOUNT_TYPES: Option[] = [
  { value: "CHECKING", label: "입출금" },
  { value: "SAVINGS", label: "예금/적금" },
  { value: "BROKERAGE", label: "증권" },
  { value: "RETIREMENT", label: "퇴직연금" },
  { value: "TAX_ADVANTAGED", label: "세테크" },
  { value: "CREDIT", label: "신용카드" },
  { value: "LOAN", label: "대출" },
  { value: "OTHER", label: "기타" }
];

export const ACCOUNT_TYPE_LABELS = toLabelMap(ACCOUNT_TYPES);

export const ASSET_CLASSES: Option[] = [
  { value: "CASH", label: "현금" },
  { value: "DOMESTIC_STOCK", label: "국내주식" },
  { value: "INTERNATIONAL_STOCK", label: "해외주식" },
  { value: "ETF", label: "ETF" },
  { value: "BOND", label: "채권" },
  { value: "FUND", label: "펀드" },
  { value: "CRYPTO", label: "암호화폐" },
  { value: "REAL_ESTATE", label: "부동산" },
  { value: "LIABILITY", label: "부채" },
  { value: "OTHER", label: "기타" }
];

export const ASSET_CLASS_LABELS = toLabelMap(ASSET_CLASSES);

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
