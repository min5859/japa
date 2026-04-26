import { prisma } from "@/lib/prisma";
import { summarizePortfolio } from "@/lib/portfolio";

export async function getPortfolio() {
  const accounts = await prisma.account.findMany({
    orderBy: [{ isTaxAdvantaged: "desc" }, { name: "asc" }],
    include: {
      holdings: {
        orderBy: [{ assetClass: "asc" }, { name: "asc" }]
      }
    }
  });

  return summarizePortfolio(accounts);
}

export async function getAccountsForSelect() {
  return prisma.account.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      institution: true,
      type: true
    }
  });
}
