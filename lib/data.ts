import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { summarizePortfolio } from "@/lib/portfolio";
import { getPricesForPortfolio } from "@/lib/market";

export async function getPortfolio() {
  const [accounts, priceCtx] = await Promise.all([
    prisma.account.findMany({
      orderBy: [{ isTaxAdvantaged: "desc" }, { name: "asc" }],
      include: {
        holdings: {
          orderBy: [{ assetClass: "asc" }, { name: "asc" }]
        }
      }
    }),
    getPricesForPortfolio()
  ]);
  return summarizePortfolio(accounts, priceCtx);
}

export async function getAccount(id: string) {
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      holdings: {
        orderBy: [{ assetClass: "asc" }, { name: "asc" }]
      }
    }
  });
  if (!account) notFound();
  return account;
}

export async function getAccountWithPrices(id: string) {
  const [account, priceCtx] = await Promise.all([
    getAccount(id),
    getPricesForPortfolio()
  ]);
  return { account, priceCtx };
}

export async function getAccountsForSelect() {
  return prisma.account.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, institution: true, type: true }
  });
}

export async function getAllHoldings() {
  return prisma.holding.findMany({
    orderBy: [{ assetClass: "asc" }, { name: "asc" }],
    include: {
      account: { select: { id: true, name: true, institution: true } }
    }
  });
}

export async function getHolding(id: string) {
  const holding = await prisma.holding.findUnique({
    where: { id },
    include: {
      account: { select: { id: true, name: true, institution: true } }
    }
  });
  if (!holding) notFound();
  return holding;
}

export async function listAiAnalyses(limit = 20) {
  const rows = await prisma.aiAnalysis.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    provider: r.provider,
    model: r.model,
    summary: r.summary,
    allocations: r.allocations,
    taxAdvice: r.taxAdvice,
    recommendations: r.recommendations,
    risks: r.risks,
    netWorthAtTime: r.netWorthAtTime ? Number(r.netWorthAtTime) : null,
  }));
}

export type AiAnalysisListItem = Awaited<ReturnType<typeof listAiAnalyses>>[number];

export async function getSnapshots() {
  const rows = await prisma.portfolioSnapshot.findMany({
    orderBy: { takenAt: "asc" },
    select: {
      takenAt: true,
      netWorth: true,
      totalAssets: true,
      liabilities: true,
      allocation: true
    }
  });
  return rows.map((r) => ({
    label: r.takenAt.toISOString().slice(0, 7), // "YYYY-MM"
    netWorth: Number(r.netWorth),
    totalAssets: Number(r.totalAssets),
    liabilities: Number(r.liabilities),
    allocation: r.allocation as { assetClass: string; value: number }[]
  }));
}
