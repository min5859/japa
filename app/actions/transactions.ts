"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transactionFormSchema } from "@/lib/transactions/schema";

export type TransactionActionState = { error: string | null };

function parseFormData(formData: FormData) {
  return {
    holdingId: formData.get("holdingId"),
    type: formData.get("type"),
    tradeDate: formData.get("tradeDate"),
    quantity: formData.get("quantity") || "0",
    pricePerShare: formData.get("pricePerShare") || "0",
    fee: formData.get("fee") || "0",
    currency: formData.get("currency"),
    fxRate: formData.get("fxRate") || "1",
    cashAdjusted: formData.get("cashAdjusted") || "false",
    notes: formData.get("notes") || undefined,
  };
}

const D = (n: number | string) => new Prisma.Decimal(n);

export async function createTransaction(
  prevState: TransactionActionState,
  formData: FormData
): Promise<TransactionActionState> {
  const parsed = transactionFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const input = parsed.data;
  let redirectAccountId: string | null = null;

  try {
    redirectAccountId = await prisma.$transaction(async (tx) => {
      const holding = await tx.holding.findUnique({
        where: { id: input.holdingId },
        select: {
          id: true,
          accountId: true,
          currency: true,
          quantity: true,
          averageCost: true,
        },
      });
      if (!holding) throw new Error("보유 종목을 찾을 수 없습니다.");
      if (holding.currency !== input.currency) {
        throw new Error(
          `거래 통화(${input.currency})가 종목 통화(${holding.currency})와 달라 처리할 수 없습니다.`
        );
      }

      const oldQty = new Prisma.Decimal(holding.quantity);
      const oldAvg = new Prisma.Decimal(holding.averageCost);
      const qty = D(input.quantity);
      const price = D(input.pricePerShare);
      const fee = D(input.fee);

      let newQty: Prisma.Decimal;
      let newAvg: Prisma.Decimal;
      let realizedGain: Prisma.Decimal | null = null;
      let cashDelta: Prisma.Decimal;

      if (input.type === "BUY") {
        // 한국 양도세 표준: 매수 수수료를 취득원가에 포함
        // newAvg = (oldAvg·oldQty + price·qty + fee) / newQty
        newQty = oldQty.plus(qty);
        const oldCost = oldAvg.mul(oldQty);
        const buyCost = price.mul(qty).plus(fee);
        newAvg = newQty.gt(0) ? oldCost.plus(buyCost).div(newQty) : D(0);
        cashDelta = buyCost.neg(); // 차감
      } else {
        // SELL
        if (qty.gt(oldQty)) {
          throw new Error(
            `보유 수량(${oldQty.toString()})보다 많이 매도할 수 없습니다.`
          );
        }
        newQty = oldQty.minus(qty);
        newAvg = oldAvg; // 평균단가 유지
        // 실현 손익 = (매도가 - 평균단가) × 수량 - 수수료
        realizedGain = price.minus(oldAvg).mul(qty).minus(fee);
        cashDelta = price.mul(qty).minus(fee); // 입금 (수수료 차감 후)
      }

      // currency가 holding과 동일하므로 account.currency가 같을 때만 자동 갱신.
      // 사용자가 cashAdjusted=ON이어도 계좌 통화가 다르면 무시한다 (단순화).
      let cashApplied = false;
      if (input.cashAdjusted) {
        const account = await tx.account.findUnique({
          where: { id: holding.accountId },
          select: { currency: true, cashBalance: true },
        });
        if (account && account.currency === input.currency) {
          await tx.account.update({
            where: { id: holding.accountId },
            data: {
              cashBalance: new Prisma.Decimal(account.cashBalance).plus(cashDelta),
            },
          });
          cashApplied = true;
        }
      }

      await tx.holding.update({
        where: { id: holding.id },
        data: { quantity: newQty, averageCost: newAvg },
      });

      await tx.transaction.create({
        data: {
          accountId: holding.accountId,
          holdingId: holding.id,
          type: input.type,
          tradeDate: new Date(input.tradeDate),
          quantity: qty,
          pricePerShare: price,
          fee,
          currency: input.currency,
          fxRate: D(input.fxRate),
          realizedGain,
          cashAdjusted: cashApplied,
          notes: input.notes || null,
        },
      });

      return holding.accountId;
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "거래 처리 중 오류가 발생했습니다." };
  }

  revalidatePath("/");
  revalidatePath("/holdings");
  revalidatePath(`/holdings/${input.holdingId}`);
  if (redirectAccountId) revalidatePath(`/accounts/${redirectAccountId}`);
  redirect(`/holdings/${input.holdingId}`);
}

export async function deleteTransaction(id: string) {
  let redirectHoldingId: string | null = null;
  let redirectAccountId: string | null = null;

  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        accountId: true,
        holdingId: true,
        type: true,
        quantity: true,
        pricePerShare: true,
        fee: true,
        currency: true,
        cashAdjusted: true,
      },
    });
    if (!transaction) return;

    const holding = await tx.holding.findUnique({
      where: { id: transaction.holdingId },
      select: { id: true, quantity: true, averageCost: true },
    });
    if (!holding) {
      // holding이 사라졌으면 transaction만 삭제
      await tx.transaction.delete({ where: { id } });
      redirectAccountId = transaction.accountId;
      return;
    }

    const oldQty = new Prisma.Decimal(holding.quantity);
    const oldAvg = new Prisma.Decimal(holding.averageCost);
    const qty = new Prisma.Decimal(transaction.quantity);
    const price = new Prisma.Decimal(transaction.pricePerShare);
    const fee = new Prisma.Decimal(transaction.fee);

    let newQty: Prisma.Decimal;
    let newAvg: Prisma.Decimal;
    let cashDelta: Prisma.Decimal;

    if (transaction.type === "BUY") {
      // 매수 역연산: oldAvg·oldQty - (price·qty + fee) 를 (oldQty - qty)로 나눔
      newQty = oldQty.minus(qty);
      const oldCost = oldAvg.mul(oldQty);
      const buyCost = price.mul(qty).plus(fee);
      newAvg = newQty.gt(0) ? oldCost.minus(buyCost).div(newQty) : D(0);
      // 수치 오차로 음수가 되면 0으로 보정
      if (newAvg.lt(0)) newAvg = D(0);
      cashDelta = buyCost; // 매수 취소 → 현금 복원 (입금)
    } else {
      // 매도 역연산: 수량 복원, 평단가는 그대로 유지된 상태였으므로 유지
      newQty = oldQty.plus(qty);
      newAvg = oldAvg;
      cashDelta = price.mul(qty).minus(fee).neg(); // 매도 취소 → 현금 차감
    }

    if (transaction.cashAdjusted) {
      const account = await tx.account.findUnique({
        where: { id: transaction.accountId },
        select: { cashBalance: true },
      });
      if (account) {
        await tx.account.update({
          where: { id: transaction.accountId },
          data: {
            cashBalance: new Prisma.Decimal(account.cashBalance).plus(cashDelta),
          },
        });
      }
    }

    await tx.holding.update({
      where: { id: holding.id },
      data: { quantity: newQty, averageCost: newAvg },
    });

    await tx.transaction.delete({ where: { id } });

    redirectHoldingId = transaction.holdingId;
    redirectAccountId = transaction.accountId;
  });

  revalidatePath("/");
  revalidatePath("/holdings");
  if (redirectHoldingId) revalidatePath(`/holdings/${redirectHoldingId}`);
  if (redirectAccountId) revalidatePath(`/accounts/${redirectAccountId}`);
  if (redirectHoldingId) redirect(`/holdings/${redirectHoldingId}`);
  if (redirectAccountId) redirect(`/accounts/${redirectAccountId}`);
  redirect("/holdings");
}
