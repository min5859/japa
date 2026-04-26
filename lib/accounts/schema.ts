// Design Ref: §4 — types + zod schema for accounts CRUD

import { z } from "zod";

export const ACCOUNT_TYPES = [
  "general",
  "isa",
  "pension",
  "irp",
  "retirement",
  "foreign",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  general: "일반",
  isa: "ISA",
  pension: "연금저축",
  irp: "IRP",
  retirement: "퇴직연금",
  foreign: "해외주식",
};

export const ACCOUNT_TYPE_DESCRIPTIONS: Record<AccountType, string> = {
  general: "일반 위탁 계좌 (분리과세 15.4% 또는 종합과세 대상)",
  isa: "ISA — 비과세 한도 200만원/400만원, 초과분 9.9% 분리과세",
  pension: "연금저축 — 세액공제 (연 900만원 한도)",
  irp: "IRP — 세액공제, 수령 시 연금소득세",
  retirement: "퇴직연금 (DC/DB) — 수령 시 퇴직소득세 또는 연금소득세",
  foreign: "해외주식 전용 — 양도차익 250만원 공제 후 22%",
};

export const CURRENCIES = ["KRW", "USD", "JPY", "EUR", "CNY", "HKD"] as const;
export type Currency = (typeof CURRENCIES)[number];

// Form input schema (used for both create and update)
export const accountFormSchema = z.object({
  broker: z.string().trim().min(1, "증권사·은행명을 입력해주세요").max(100),
  account_type: z.enum(ACCOUNT_TYPES),
  currency: z.enum(CURRENCIES),
  name: z.string().trim().max(100).optional().or(z.literal("")),
});

export type AccountFormInput = z.infer<typeof accountFormSchema>;

// Row shape from Supabase
export type Account = {
  id: string;
  user_id: string;
  broker: string;
  account_type: AccountType;
  currency: string;
  name: string | null;
  created_at: string;
  updated_at: string;
};
