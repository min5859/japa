import { prisma } from "@/lib/prisma";
import { getPortfolio } from "@/lib/data";
import { groupHoldingsByAssetClass } from "@/lib/portfolio";

export async function createSnapshot(): Promise<void> {
  const { accounts, summary } = await getPortfolio();

  const allocation = Object.entries(groupHoldingsByAssetClass(accounts)).map(
    ([assetClass, value]) => ({ assetClass, value })
  );

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
