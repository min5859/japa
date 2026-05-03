// Single source of truth for Dividend: form Zod schema.
// Currency 공유 enum은 lib/labels.ts의 CURRENCIES 옵션 배열을 폼에서 사용.

import { z } from "zod";
import { Currency } from "@prisma/client";

export const dividendFormSchema = z.object({
  accountId: z.string().min(1, "계좌를 선택해 주세요"),
  holdingId: z.string().optional(),
  symbol: z.string().optional(),
  dividendDate: z.string().min(1, "지급일은 필수입니다"),
  exDividendDate: z.string().optional(),
  amountPerShare: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().positive("수량은 0보다 커야 합니다"),
  totalAmount: z.coerce.number().optional(),
  taxAmount: z.coerce.number().optional(),
  isTaxOverridden: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.string()])
    .optional()
    .transform((v) => v === "on" || v === "true"),
  currency: z.nativeEnum(Currency),
  fxRate: z.coerce.number().positive().default(1),
  notes: z.string().optional(),
});

export type DividendFormInput = z.infer<typeof dividendFormSchema>;
