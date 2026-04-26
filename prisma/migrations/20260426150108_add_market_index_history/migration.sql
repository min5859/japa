-- CreateTable
CREATE TABLE "MarketIndexHistory" (
    "symbol" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "open" DECIMAL(18,6) NOT NULL,
    "high" DECIMAL(18,6) NOT NULL,
    "low" DECIMAL(18,6) NOT NULL,
    "close" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "MarketIndexHistory_pkey" PRIMARY KEY ("symbol","date")
);

-- CreateIndex
CREATE INDEX "MarketIndexHistory_symbol_idx" ON "MarketIndexHistory"("symbol");
