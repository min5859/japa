export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { prisma } = await import("@/lib/prisma");
  const { refreshMarketIndices } = await import("@/lib/market");

  const count = await prisma.marketIndex.count();
  if (count === 0) {
    console.log("[instrumentation] MarketIndex 초기 데이터 fetch 중...");
    await refreshMarketIndices();
    console.log("[instrumentation] 완료");
  }
}
