/*
  Warnings:

  - A unique constraint covering the columns `[bankTransactionId]` on the table `Donation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "bankConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bankTransactionId" TEXT,
ADD COLUMN     "extractedRecipient" TEXT;

-- AlterTable
ALTER TABLE "Fundraiser" ADD COLUMN     "monobankJarId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Donation_bankTransactionId_key" ON "Donation"("bankTransactionId");
