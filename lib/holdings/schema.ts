// Single source of truth for Holding: form Zod schema, asset-class option list, label map.
// Prisma enum이 SSOT — Option<AssetClass>로 잘못된 값을 적으면 TS 에러.

import { z } from "zod";
import { AssetClass, Currency } from "@prisma/client";

type Option<T extends string> = { value: T; label: string };

export const ASSET_CLASSES: Option<AssetClass>[] = [
  { value: "CASH", label: "현금" },
  { value: "DOMESTIC_STOCK", label: "국내주식" },
  { value: "INTERNATIONAL_STOCK", label: "해외주식" },
  { value: "ETF", label: "ETF" },
  { value: "BOND", label: "채권" },
  { value: "FUND", label: "펀드" },
  { value: "CRYPTO", label: "암호화폐" },
  { value: "REAL_ESTATE", label: "부동산" },
  { value: "LIABILITY", label: "부채" },
  { value: "OTHER", label: "기타" },
];

// Lookup-friendly: `?? value` fallback 패턴을 위해 Record<string, string>로 노출.
// SSOT 강제는 ASSET_CLASSES (Option<AssetClass>[]) 타입이 책임진다.
export const ASSET_CLASS_LABELS: Record<string, string> = Object.fromEntries(
  ASSET_CLASSES.map((o) => [o.value, o.label])
);

export const holdingFormSchema = z.object({
  accountId: z.string().min(1, "계좌를 선택해 주세요"),
  name: z.string().min(1, "자산명은 필수입니다"),
  symbol: z.string().optional(),
  assetClass: z.nativeEnum(AssetClass),
  currency: z.nativeEnum(Currency),
  quantity: z.coerce.number().default(0),
  averageCost: z.coerce.number().default(0),
  manualPrice: z.coerce.number().default(0),
  manualFxRate: z.coerce.number().default(1),
  dividendYield: z.coerce.number().nullable().optional(),
  notes: z.string().optional(),
});

export type HoldingFormInput = z.infer<typeof holdingFormSchema>;
