"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defaultDividendTaxRate } from "@/lib/dividends";

const DividendSchema = z.object({
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
  currency: z.enum(["KRW", "USD", "EUR", "JPY", "CNY", "GBP", "HKD", "SGD"]),
  fxRate: z.coerce.number().positive().default(1),
  notes: z.string().optional()
});

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

async function deriveAmounts(input: z.infer<typeof DividendSchema>) {
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
  const parsed = DividendSchema.safeParse(parseFormData(formData));
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
  const parsed = DividendSchema.safeParse(parseFormData(formData));
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
