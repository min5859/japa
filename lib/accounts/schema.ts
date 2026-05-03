// Single source of truth for Account: form Zod schema, enum option list, label map.
// Prisma enum이 SSOT — Option<AccountType>로 잘못된 값을 적으면 TS 에러.
// server action과 client form이 동일 모듈에서 import → 검증·드롭다운·라벨 일관.

import { z } from "zod";
import { AccountType, Currency } from "@prisma/client";

type Option<T extends string> = { value: T; label: string };

export const ACCOUNT_TYPES: Option<AccountType>[] = [
  { value: "CHECKING", label: "입출금" },
  { value: "SAVINGS", label: "예금/적금" },
  { value: "BROKERAGE", label: "증권" },
  { value: "RETIREMENT", label: "퇴직연금" },
  { value: "TAX_ADVANTAGED", label: "세테크" },
  { value: "CREDIT", label: "신용카드" },
  { value: "LOAN", label: "대출" },
  { value: "OTHER", label: "기타" },
];

// Lookup-friendly: `?? value` fallback 패턴을 위해 Record<string, string>로 노출.
// SSOT 강제는 ACCOUNT_TYPES (Option<AccountType>[]) 타입이 책임진다.
export const ACCOUNT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ACCOUNT_TYPES.map((o) => [o.value, o.label])
);

export const accountFormSchema = z.object({
  name: z.string().min(1, "계좌명은 필수입니다"),
  institution: z.string().optional(),
  type: z.nativeEnum(AccountType),
  currency: z.nativeEnum(Currency),
  cashBalance: z.coerce.number().default(0),
  isTaxAdvantaged: z.boolean().default(false),
  annualContributionLimit: z.coerce.number().nullable().optional(),
  contributionYTD: z.coerce.number().default(0),
  notes: z.string().optional(),
});

export type AccountFormInput = z.infer<typeof accountFormSchema>;
