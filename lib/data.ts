import { notFound } from "next/navigation";
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
