/*
  Warnings:

  - Added the required column `provider` to the `AiAnalysis` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AiAnalysis" ADD COLUMN     "provider" TEXT NOT NULL;
