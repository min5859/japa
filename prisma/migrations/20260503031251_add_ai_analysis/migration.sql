-- CreateTable
CREATE TABLE "AiAnalysis" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "allocations" TEXT NOT NULL,
    "taxAdvice" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "risks" TEXT NOT NULL,
    "netWorthAtTime" DECIMAL(18,4),

    CONSTRAINT "AiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAnalysis_createdAt_idx" ON "AiAnalysis"("createdAt");
