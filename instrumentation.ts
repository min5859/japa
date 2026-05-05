export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // First-time backfill helper. Must NEVER block lambda startup: any DB call
  // here happens before request handlers run, and on PgBouncer the cold
  // connection acquire can stall long enough to push the whole invocation
  // past the 60s budget. Fire-and-forget + best-effort.
  void (async () => {
    try {
      const { prisma } = await import("@/lib/prisma");
      const { refreshMarketIndices, refreshMarketHistory } = await import("@/lib/market");

      const indexCount = await prisma.marketIndex.count();
      if (indexCount === 0) {
        console.log("[instrumentation] MarketIndex 초기 데이터 fetch 중...");
        await refreshMarketIndices();
      }

      const historyCount = await prisma.marketIndexHistory.count();
      if (historyCount === 0) {
        console.log("[instrumentation] MarketIndexHistory 백필 중...");
        await refreshMarketHistory();
      }
    } catch (e) {
      console.warn("[instrumentation] backfill skipped:", e);
    }
  })();
}
