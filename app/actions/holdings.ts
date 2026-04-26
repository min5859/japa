"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { refreshSymbols, fxSymbol } from "@/lib/market";

async function fetchLivePrice(symbol: string | null, currency: Currency) {
  if (!symbol) return;
  const symbols = [symbol];
  const fx = fxSymbol(currency);
  if (fx) symbols.push(fx);
  await refreshSymbols(symbols).catch(() => {});
}

const HoldingSchema = z.object({
  accountId: z.string().min(1, "계좌를 선택해 주세요"),
  name: z.string().min(1, "자산명은 필수입니다"),
  symbol: z.string().optional(),
  assetClass: z.enum(["CASH", "DOMESTIC_STOCK", "INTERNATIONAL_STOCK", "ETF", "BOND", "FUND", "CRYPTO", "REAL_ESTATE", "LIABILITY", "OTHER"]),
  currency: z.enum(["KRW", "USD", "EUR", "JPY", "CNY", "GBP", "HKD", "SGD"]),
  quantity: z.coerce.number().default(0),
  averageCost: z.coerce.number().default(0),
  manualPrice: z.coerce.number().default(0),
  manualFxRate: z.coerce.number().default(1),
  dividendYield: z.coerce.number().nullable().optional(),
  notes: z.string().optional()
});

export type HoldingActionState = { error: string | null };

function parseFormData(formData: FormData) {
  const dividendYield = formData.get("dividendYield");
  return {
    accountId: formData.get("accountId"),
    name: formData.get("name"),
    symbol: formData.get("symbol") || undefined,
    assetClass: formData.get("assetClass"),
    currency: formData.get("currency"),
    quantity: formData.get("quantity") || "0",
    averageCost: formData.get("averageCost") || "0",
    manualPrice: formData.get("manualPrice") || "0",
    manualFxRate: formData.get("manualFxRate") || "1",
    dividendYield: dividendYield ? dividendYield : null,
    notes: formData.get("notes") || undefined
  };
}

export async function createHolding(
  prevState: HoldingActionState,
  formData: FormData
): Promise<HoldingActionState> {
  const parsed = HoldingSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { accountId, ...data } = parsed.data;
  const created = await prisma.holding.create({
    data: { ...data, account: { connect: { id: accountId } } }
  });
  await fetchLivePrice(created.symbol, created.currency);
  revalidatePath("/");
  revalidatePath("/holdings");
  revalidatePath(`/accounts/${accountId}`);
  redirect("/holdings");
}

export async function updateHolding(
  id: string,
  prevState: HoldingActionState,
  formData: FormData
): Promise<HoldingActionState> {
  const parsed = HoldingSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { accountId, ...data } = parsed.data;
  const holding = await prisma.holding.update({
    where: { id },
    data: { ...data, account: { connect: { id: accountId } } }
  });
  await fetchLivePrice(holding.symbol, holding.currency);
  revalidatePath("/");
  revalidatePath("/holdings");
  revalidatePath(`/accounts/${holding.accountId}`);
  redirect(`/accounts/${holding.accountId}`);
}

export async function deleteHolding(id: string, accountId: string) {
  await prisma.holding.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/holdings");
  revalidatePath(`/accounts/${accountId}`);
  redirect(`/accounts/${accountId}`);
}
