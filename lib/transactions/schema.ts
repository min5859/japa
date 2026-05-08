// Single source of truth for Transaction: form Zod schema, type label map.
// 매수/매도 거래 입력 — server action이 평단가/수량/현금잔액을 자동 갱신.

import { z } from "zod";
import { Currency, TransactionType } from "@prisma/client";

type Option<T extends string> = { value: T; label: string };

export const TRANSACTION_TYPES: Option<TransactionType>[] = [
  { value: "BUY", label: "매수" },
  { value: "SELL", label: "매도" },
];

export const TRANSACTION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TRANSACTION_TYPES.map((o) => [o.value, o.label])
);

export const transactionFormSchema = z.object({
  holdingId: z.string().min(1, "보유 종목이 필요합니다"),
  type: z.nativeEnum(TransactionType),
  tradeDate: z.string().min(1, "거래일은 필수입니다"),
  quantity: z.coerce.number().positive("수량은 0보다 커야 합니다"),
  pricePerShare: z.coerce.number().nonnegative("가격은 음수일 수 없습니다"),
  fee: z.coerce.number().nonnegative().default(0),
  currency: z.nativeEnum(Currency),
  fxRate: z.coerce.number().positive().default(1),
  cashAdjusted: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.string()])
    .optional()
    .transform((v) => v === "on" || v === "true"),
  notes: z.string().optional(),
});

export type TransactionFormInput = z.infer<typeof transactionFormSchema>;
