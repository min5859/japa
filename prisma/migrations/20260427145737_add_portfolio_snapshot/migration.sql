-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "netWorth" DECIMAL(18,4) NOT NULL,
    "totalAssets" DECIMAL(18,4) NOT NULL,
    "cash" DECIMAL(18,4) NOT NULL,
    "investments" DECIMAL(18,4) NOT NULL,
    "liabilities" DECIMAL(18,4) NOT NULL,
    "allocation" JSONB NOT NULL,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_takenAt_idx" ON "PortfolioSnapshot"("takenAt");
