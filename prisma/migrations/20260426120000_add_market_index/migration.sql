-- CreateTable
CREATE TABLE "MarketIndex" (
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(18,6) NOT NULL,
    "previousClose" DECIMAL(18,6) NOT NULL,
    "changePercent" DECIMAL(8,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isYield" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketIndex_pkey" PRIMARY KEY ("symbol")
);
