// Plan Ref: §3 (zod 검증) — transactions

import { z } from "zod";

export const TRANSACTION_TYPES = [
  "buy",
  "sell",
  "dividend",
  "interest",
  "fee",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  buy: "매수",
  sell: "매도",
  dividend: "배당",
  interest: "이자",
  fee: "수수료",
};

export const MARKETS = ["KR", "US", "JP", "OTHER"] as const;
export type Market = (typeof MARKETS)[number];

export const MARKET_LABELS: Record<Market, string> = {
  KR: "한국",
  US: "미국",
  JP: "일본",
  OTHER: "기타",
};

export const CURRENCIES = ["KRW", "USD", "JPY", "EUR", "CNY", "HKD"] as const;
export type Currency = (typeof CURRENCIES)[number];

// ----------------------------------------------------------------------------
// Form schema — 입력은 type별로 필드 의미가 다르므로 superRefine으로 분기 검증
// ----------------------------------------------------------------------------

const baseSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  ticker: z.string().trim().max(30).optional().or(z.literal("")),
  market: z.enum(MARKETS).optional(),
  name: z.string().trim().max(100).optional().or(z.literal("")),
  quantity: z
    .union([z.string(), z.number()])
    .transform((v) => (v === "" ? null : Number(v)))
    .nullable()
    .optional(),
  price: z
    .union([z.string(), z.number()])
    .transform((v) => (v === "" ? null : Number(v)))
    .nullable()
    .optional(),
  amount: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .pipe(z.number().nonnegative("금액은 0 이상이어야 합니다")),
  fee: z
    .union([z.string(), z.number()])
    .transform((v) => (v === "" ? 0 : Number(v)))
    .pipe(z.number().nonnegative("수수료는 0 이상이어야 합니다")),
  tax_withheld: z
    .union([z.string(), z.number()])
    .transform((v) => (v === "" ? 0 : Number(v)))
    .pipe(z.number().nonnegative("원천징수세는 0 이상이어야 합니다")),
  currency: z.enum(CURRENCIES),
  trade_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "거래일을 YYYY-MM-DD 형식으로 입력해주세요"),
  memo: z.string().trim().max(500).optional().or(z.literal("")),
});

export const transactionFormSchema = baseSchema.superRefine((data, ctx) => {
  const isTrade = data.type === "buy" || data.type === "sell";

  if (isTrade) {
    if (!data.ticker || data.ticker.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "매수·매도는 티커가 필수입니다",
        path: ["ticker"],
      });
    }
    if (!data.market) {
      ctx.addIssue({
        code: "custom",
        message: "시장(KR/US/...)을 선택해주세요",
        path: ["market"],
      });
    }
    if (data.quantity == null || !Number.isFinite(data.quantity) || data.quantity <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "수량은 0보다 커야 합니다",
        path: ["quantity"],
      });
    }
    if (data.price == null || !Number.isFinite(data.price) || data.price <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "가격은 0보다 커야 합니다",
        path: ["price"],
      });
    }
  }

  // 거래일 미래 차단
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const tradeDate = new Date(`${data.trade_date}T00:00:00`);
  if (tradeDate > today) {
    ctx.addIssue({
      code: "custom",
      message: "거래일은 오늘 이전이어야 합니다",
      path: ["trade_date"],
    });
  }
});

export type TransactionFormInput = z.input<typeof transactionFormSchema>;
export type TransactionFormParsed = z.output<typeof transactionFormSchema>;

// ----------------------------------------------------------------------------
// Row shapes from Supabase
// ----------------------------------------------------------------------------

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  holding_id: string | null;
  type: TransactionType;
  quantity: number | null;
  price: number | null;
  amount: number;
  fee: number;
  tax_withheld: number;
  currency: string;
  trade_date: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
  // 조인 시 사용
  ticker?: string | null;
  name?: string | null;
};

export type Holding = {
  id: string;
  user_id: string;
  account_id: string;
  ticker: string;
  market: Market;
  name: string | null;
  quantity: number;
  avg_cost_price: number;
  cost_currency: string;
  created_at: string;
  updated_at: string;
};
