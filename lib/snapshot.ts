import { prisma } from "@/lib/prisma";
import { getPortfolio } from "@/lib/data";

export async function createSnapshot(): Promise<void> {
  const { accounts, summary } = await getPortfolio();

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
}
