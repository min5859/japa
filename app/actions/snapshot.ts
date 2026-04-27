"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getPortfolio } from "@/lib/data";

export async function saveSnapshot(): Promise<{ ok: boolean }> {
  const { accounts, summary } = await getPortfolio();

  // 자산 배분 집계
  const allHoldings = accounts.flatMap((a) => a.holdings);
  const byClass: Record<string, number> = {};
  for (const h of allHoldings) {
    byClass[h.assetClass] = (byClass[h.assetClass] ?? 0) + h.marketValueBase;
  }
  const allocation = Object.entries(byClass).map(([assetClass, value]) => ({ assetClass, value }));

  await prisma.portfolioSnapshot.create({
    data: {
      netWorth: summary.netWorth,
      totalAssets: summary.totalAssets,
      cash: summary.cash,
      investments: summary.investments,
      liabilities: summary.liabilities,
      allocation
    }
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
