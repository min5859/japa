-- CreateTable
CREATE TABLE "AccountGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AccountToAccountGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AccountToAccountGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "AccountGroup_displayOrder_idx" ON "AccountGroup"("displayOrder");

-- CreateIndex
CREATE INDEX "_AccountToAccountGroup_B_index" ON "_AccountToAccountGroup"("B");

-- AddForeignKey
ALTER TABLE "_AccountToAccountGroup" ADD CONSTRAINT "_AccountToAccountGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccountToAccountGroup" ADD CONSTRAINT "_AccountToAccountGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "AccountGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
