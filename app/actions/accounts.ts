"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fxSymbol, refreshSymbols } from "@/lib/market";
import { accountFormSchema } from "@/lib/accounts/schema";

async function maybeFetchFx(currency: Currency) {
  if (currency === "KRW") return;
  const fx = fxSymbol(currency);
  if (fx) await refreshSymbols([fx]).catch(() => {});
}

export type AccountActionState = { error: string | null };

function parseFormData(formData: FormData) {
  const isTaxAdvantaged = formData.get("isTaxAdvantaged") === "true";
  const annualLimit = formData.get("annualContributionLimit");
  const ytd = formData.get("contributionYTD");
  return {
    name: formData.get("name"),
    institution: formData.get("institution") || undefined,
    type: formData.get("type"),
    currency: formData.get("currency"),
    cashBalance: formData.get("cashBalance") || "0",
    isTaxAdvantaged,
    annualContributionLimit: isTaxAdvantaged && annualLimit ? annualLimit : null,
    contributionYTD: isTaxAdvantaged && ytd ? ytd : 0,
    notes: formData.get("notes") || undefined
  };
}

export async function createAccount(
  prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const parsed = accountFormSchema.safeParse(parseFormData(formData));
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
  const parsed = accountFormSchema.safeParse(parseFormData(formData));
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
