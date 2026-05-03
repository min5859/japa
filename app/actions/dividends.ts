"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { defaultDividendTaxRate } from "@/lib/dividends";
import { dividendFormSchema, type DividendFormInput } from "@/lib/dividends/schema";

export type DividendActionState = { error: string | null };

function parseFormData(formData: FormData) {
  return {
    accountId: formData.get("accountId"),
    holdingId: formData.get("holdingId") || undefined,
    symbol: formData.get("symbol") || undefined,
    dividendDate: formData.get("dividendDate"),
    exDividendDate: formData.get("exDividendDate") || undefined,
    amountPerShare: formData.get("amountPerShare") || "0",
    quantity: formData.get("quantity") || "0",
    totalAmount: formData.get("totalAmount") || undefined,
    taxAmount: formData.get("taxAmount") || undefined,
    isTaxOverridden: formData.get("isTaxOverridden") || "false",
    currency: formData.get("currency"),
    fxRate: formData.get("fxRate") || "1",
    notes: formData.get("notes") || undefined
  };
}

async function deriveAmounts(input: DividendFormInput) {
  const account = await prisma.account.findUnique({
    where: { id: input.accountId },
    select: { type: true, isTaxAdvantaged: true }
  });
  if (!account) throw new Error("계좌를 찾을 수 없습니다.");

  const total =
    input.totalAmount && input.totalAmount > 0
      ? input.totalAmount
      : input.amountPerShare * input.quantity;

  let tax: number;
  if (input.isTaxOverridden) {
    tax = input.taxAmount ?? 0;
  } else {
    const rate = defaultDividendTaxRate(account.type, account.isTaxAdvantaged, input.currency);
    tax = total * rate;
  }
  const net = Math.max(0, total - tax);
  return { totalAmount: total, taxAmount: tax, netAmount: net };
}

export async function createDividend(
  prevState: DividendActionState,
  formData: FormData
): Promise<DividendActionState> {
  const parsed = dividendFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const input = parsed.data;
  const { totalAmount, taxAmount, netAmount } = await deriveAmounts(input);

  await prisma.dividend.create({
    data: {
      accountId: input.accountId,
      holdingId: input.holdingId || null,
      symbol: input.symbol || null,
      dividendDate: new Date(input.dividendDate),
      exDividendDate: input.exDividendDate ? new Date(input.exDividendDate) : null,
      amountPerShare: input.amountPerShare,
      quantity: input.quantity,
      totalAmount,
      taxAmount,
      netAmount,
      currency: input.currency,
      fxRate: input.fxRate,
      isTaxOverridden: input.isTaxOverridden,
      notes: input.notes || null
    }
  });

  revalidatePath("/dividends");
  revalidatePath("/tax");
  redirect("/dividends");
}

export async function updateDividend(
  id: string,
  prevState: DividendActionState,
  formData: FormData
): Promise<DividendActionState> {
  const parsed = dividendFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const input = parsed.data;
  const { totalAmount, taxAmount, netAmount } = await deriveAmounts(input);

  await prisma.dividend.update({
    where: { id },
    data: {
      accountId: input.accountId,
      holdingId: input.holdingId || null,
      symbol: input.symbol || null,
      dividendDate: new Date(input.dividendDate),
      exDividendDate: input.exDividendDate ? new Date(input.exDividendDate) : null,
      amountPerShare: input.amountPerShare,
      quantity: input.quantity,
      totalAmount,
      taxAmount,
      netAmount,
      currency: input.currency,
      fxRate: input.fxRate,
      isTaxOverridden: input.isTaxOverridden,
      notes: input.notes || null
    }
  });

  revalidatePath("/dividends");
  revalidatePath("/tax");
  redirect("/dividends");
}

export async function deleteDividend(id: string) {
  await prisma.dividend.delete({ where: { id } });
  revalidatePath("/dividends");
  revalidatePath("/tax");
  redirect("/dividends");
}
