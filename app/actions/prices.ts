"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { refreshAllPrices, refreshMarketIndices } from "@/lib/market";

const MANUAL_COOLDOWN_SECONDS = 60;

export type RefreshPricesResult = {
  updated: number;
  attempted: number;
  indicesUpdated: number;
  failed: { symbol: string; reason: string }[];
  skippedNoSymbol: { id: string; name: string }[];
  cooldownRemainingSeconds?: number;
};

export async function refreshPrices(): Promise<RefreshPricesResult> {
  const newest = await prisma.priceCache.findFirst({
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true }
  });
  if (newest) {
    const elapsedMs = Date.now() - newest.fetchedAt.getTime();
    const remainingMs = MANUAL_COOLDOWN_SECONDS * 1000 - elapsedMs;
    if (remainingMs > 0) {
      return {
        updated: 0,
        attempted: 0,
        indicesUpdated: 0,
        failed: [],
        skippedNoSymbol: [],
        cooldownRemainingSeconds: Math.ceil(remainingMs / 1000)
      };
    }
  }

  const [portfolio, indices] = await Promise.all([
    refreshAllPrices(),
    refreshMarketIndices()
  ]);
  revalidatePath("/", "layout");
  return {
    updated: portfolio.updated,
    attempted: portfolio.attempted,
    indicesUpdated: indices,
    failed: portfolio.failed,
    skippedNoSymbol: portfolio.skippedNoSymbol
  };
}
