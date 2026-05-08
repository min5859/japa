-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "holdingId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "tradeDate" DATE NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "pricePerShare" DECIMAL(18,6) NOT NULL,
    "fee" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'KRW',
    "fxRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "realizedGain" DECIMAL(18,4),
    "cashAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_accountId_tradeDate_idx" ON "Transaction"("accountId", "tradeDate");

-- CreateIndex
CREATE INDEX "Transaction_holdingId_tradeDate_idx" ON "Transaction"("holdingId", "tradeDate");

-- CreateIndex
CREATE INDEX "Transaction_tradeDate_idx" ON "Transaction"("tradeDate");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "Holding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
