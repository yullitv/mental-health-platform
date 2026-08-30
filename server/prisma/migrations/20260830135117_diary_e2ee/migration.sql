/*
  Warnings:

  - You are about to drop the column `mood` on the `DiaryEntry` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `DiaryEntry` table. All the data in the column will be lost.
  - You are about to drop the column `physicalState` on the `DiaryEntry` table. All the data in the column will be lost.
  - You are about to drop the column `sleepHours` on the `DiaryEntry` table. All the data in the column will be lost.
  - Added the required column `cipherText` to the `DiaryEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DiaryEntry" DROP COLUMN "mood",
DROP COLUMN "note",
DROP COLUMN "physicalState",
DROP COLUMN "sleepHours",
ADD COLUMN     "cipherText" TEXT NOT NULL;
