/*
  Warnings:

  - A unique constraint covering the columns `[proofHash]` on the table `Donation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "aiScreenedAt" TIMESTAMP(3),
ADD COLUMN     "aiScreeningNotes" TEXT,
ADD COLUMN     "aiScreeningStatus" TEXT,
ADD COLUMN     "extractedAmount" DOUBLE PRECISION,
ADD COLUMN     "extractedReference" TEXT,
ADD COLUMN     "proofHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Donation_proofHash_key" ON "Donation"("proofHash");

-- CreateIndex
CREATE INDEX "Donation_extractedReference_idx" ON "Donation"("extractedReference");
