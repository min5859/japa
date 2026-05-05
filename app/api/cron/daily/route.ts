import { NextResponse, type NextRequest } from "next/server";
import { prismaDirect } from "@/lib/prisma";
import { refreshAllPrices, refreshMarketHistory, refreshMarketIndices } from "@/lib/market";
import { createSnapshot } from "@/lib/snapshot";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Date whose UTC fields read as the current KST clock fields. */
function nowKST(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const kst = nowKST();
  const isJanFirst = kst.getUTCMonth() === 0 && kst.getUTCDate() === 1;
  const isFirstOfMonth = kst.getUTCDate() === 1;

  const ran: string[] = [];

  // Use prismaDirect (bypasses PgBouncer) so per-query connection acquire
  // doesn't pile up under the lambda's 60s budget. yahoo fetches stay parallel;
  // prisma writes are still queued through withPrismaLock inside lib/market.
  const [portfolio, indicesUpdated] = await Promise.all([
    refreshAllPrices(prismaDirect),
    refreshMarketIndices(prismaDirect),
    refreshMarketHistory(prismaDirect)
  ]);
  ran.push(
    `portfolioPrices(${portfolio.updated}/${portfolio.attempted})`,
    `indices(${indicesUpdated})`,
    "marketHistory"
  );

  if (isFirstOfMonth) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prismaDirect.portfolioSnapshot.count({
      where: { takenAt: { gte: dayAgo } }
    });
    if (recent === 0) {
      await createSnapshot();
      ran.push("monthlySnapshot");
    } else {
      ran.push("monthlySnapshotSkipped");
    }
  }

  if (isJanFirst) {
    const reset = await prismaDirect.account.updateMany({
      where: { isTaxAdvantaged: true },
      data: { contributionYTD: 0 }
    });
    ran.push(`contributionYTDReset(${reset.count})`);
  }

  return NextResponse.json({ ok: true, ran });
}
