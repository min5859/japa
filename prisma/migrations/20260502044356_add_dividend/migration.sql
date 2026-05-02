-- CreateTable
CREATE TABLE "Dividend" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "holdingId" TEXT,
    "symbol" TEXT,
    "dividendDate" DATE NOT NULL,
    "exDividendDate" DATE,
    "amountPerShare" DECIMAL(18,6) NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,4) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'KRW',
    "fxRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "isTaxOverridden" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dividend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dividend_accountId_idx" ON "Dividend"("accountId");

-- CreateIndex
CREATE INDEX "Dividend_holdingId_idx" ON "Dividend"("holdingId");

-- CreateIndex
CREATE INDEX "Dividend_dividendDate_idx" ON "Dividend"("dividendDate");

-- CreateIndex
CREATE INDEX "Dividend_symbol_idx" ON "Dividend"("symbol");

-- AddForeignKey
ALTER TABLE "Dividend" ADD CONSTRAINT "Dividend_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dividend" ADD CONSTRAINT "Dividend_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "Holding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
