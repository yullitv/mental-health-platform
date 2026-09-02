-- AlterTable
ALTER TABLE "SpecialistProfile" ADD COLUMN     "aiScreenedAt" TIMESTAMP(3),
ADD COLUMN     "aiScreeningNotes" TEXT,
ADD COLUMN     "aiScreeningStatus" TEXT,
ADD COLUMN     "fullLegalName" TEXT,
ADD COLUMN     "graduationYear" INTEGER,
ADD COLUMN     "issuingInstitution" TEXT,
ADD COLUMN     "licenseNumber" TEXT;
