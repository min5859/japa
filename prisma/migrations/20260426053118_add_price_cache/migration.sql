-- CreateTable
CREATE TABLE "PriceCache" (
    "symbol" TEXT NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceCache_pkey" PRIMARY KEY ("symbol")
);
