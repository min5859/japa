"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fxSymbol, refreshSymbols } from "@/lib/market";

async function maybeFetchFx(currency: Currency) {
  if (currency === "KRW") return;
  const fx = fxSymbol(currency);
  if (fx) await refreshSymbols([fx]).catch(() => {});
}

const AccountSchema = z.object({
  name: z.string().min(1, "계좌명은 필수입니다"),
  institution: z.string().optional(),
  type: z.enum(["CHECKING", "SAVINGS", "BROKERAGE", "RETIREMENT", "TAX_ADVANTAGED", "CREDIT", "LOAN", "OTHER"]),
  currency: z.enum(["KRW", "USD", "EUR", "JPY", "CNY", "GBP", "HKD", "SGD"]),
  cashBalance: z.coerce.number().default(0),
  isTaxAdvantaged: z.boolean().default(false),
  annualContributionLimit: z.coerce.number().nullable().optional(),
  notes: z.string().optional()
});

export type AccountActionState = { error: string | null };

function parseFormData(formData: FormData) {
  const isTaxAdvantaged = formData.get("isTaxAdvantaged") === "true";
  const annualLimit = formData.get("annualContributionLimit");
  return {
    name: formData.get("name"),
    institution: formData.get("institution") || undefined,
    type: formData.get("type"),
    currency: formData.get("currency"),
    cashBalance: formData.get("cashBalance") || "0",
    isTaxAdvantaged,
    annualContributionLimit: isTaxAdvantaged && annualLimit ? annualLimit : null,
    notes: formData.get("notes") || undefined
  };
}

export async function createAccount(
  prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const parsed = AccountSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.account.create({ data: parsed.data });
  await maybeFetchFx(parsed.data.currency);
  revalidatePath("/");
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function updateAccount(
  id: string,
  prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const parsed = AccountSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.account.update({ where: { id }, data: parsed.data });
  await maybeFetchFx(parsed.data.currency);
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}`);
  redirect(`/accounts/${id}`);
}

export async function deleteAccount(id: string) {
  await prisma.account.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/accounts");
  redirect("/accounts");
}
