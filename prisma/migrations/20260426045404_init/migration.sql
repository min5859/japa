-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'BROKERAGE', 'RETIREMENT', 'TAX_ADVANTAGED', 'CREDIT', 'LOAN', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('CASH', 'DOMESTIC_STOCK', 'INTERNATIONAL_STOCK', 'ETF', 'BOND', 'FUND', 'CRYPTO', 'REAL_ESTATE', 'LIABILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'HKD', 'SGD');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "type" "AccountType" NOT NULL DEFAULT 'BROKERAGE',
    "currency" "Currency" NOT NULL DEFAULT 'KRW',
    "cashBalance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "isTaxAdvantaged" BOOLEAN NOT NULL DEFAULT false,
    "annualContributionLimit" DECIMAL(18,4),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "symbol" TEXT,
    "name" TEXT NOT NULL,
    "assetClass" "AssetClass" NOT NULL DEFAULT 'ETF',
    "currency" "Currency" NOT NULL DEFAULT 'KRW',
    "quantity" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "averageCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "manualPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "manualFxRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "dividendYield" DECIMAL(8,4),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE INDEX "Account_isTaxAdvantaged_idx" ON "Account"("isTaxAdvantaged");

-- CreateIndex
CREATE INDEX "Holding_accountId_idx" ON "Holding"("accountId");

-- CreateIndex
CREATE INDEX "Holding_assetClass_idx" ON "Holding"("assetClass");

-- CreateIndex
CREATE INDEX "Holding_symbol_idx" ON "Holding"("symbol");

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
