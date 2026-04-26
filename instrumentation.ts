export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { prisma } = await import("@/lib/prisma");
  const { refreshMarketIndices, refreshMarketHistory } = await import("@/lib/market");

  const [indexCount, historyCount] = await Promise.all([
    prisma.marketIndex.count(),
    prisma.marketIndexHistory.count()
  ]);

  const tasks: Promise<unknown>[] = [];
  if (indexCount === 0) {
    console.log("[instrumentation] MarketIndex 초기 데이터 fetch 중...");
    tasks.push(refreshMarketIndices());
  }
  if (historyCount === 0) {
    console.log("[instrumentation] MarketIndexHistory 1년치 fetch 중...");
    tasks.push(refreshMarketHistory());
  }
  if (tasks.length > 0) {
    await Promise.all(tasks);
    console.log("[instrumentation] 완료");
  }
}
