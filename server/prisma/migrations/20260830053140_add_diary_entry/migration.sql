/*
  Warnings:

  - You are about to drop the column `moodScore` on the `DiaryEntry` table. All the data in the column will be lost.
  - You are about to drop the column `moodTags` on the `DiaryEntry` table. All the data in the column will be lost.
  - You are about to drop the column `textContent` on the `DiaryEntry` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `DiaryEntry` table. All the data in the column will be lost.
  - You are about to drop the column `workoutDone` on the `DiaryEntry` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,date]` on the table `DiaryEntry` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `date` to the `DiaryEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mood` to the `DiaryEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `physicalState` to the `DiaryEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DiaryEntry" DROP COLUMN "moodScore",
DROP COLUMN "moodTags",
DROP COLUMN "textContent",
DROP COLUMN "updatedAt",
DROP COLUMN "workoutDone",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "mood" INTEGER NOT NULL,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "physicalState" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DiaryEntry_userId_date_key" ON "DiaryEntry"("userId", "date");
