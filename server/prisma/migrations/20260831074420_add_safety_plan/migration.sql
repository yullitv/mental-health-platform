-- CreateTable
CREATE TABLE "SafetyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cipherText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SafetyPlan_userId_key" ON "SafetyPlan"("userId");

-- AddForeignKey
ALTER TABLE "SafetyPlan" ADD CONSTRAINT "SafetyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
