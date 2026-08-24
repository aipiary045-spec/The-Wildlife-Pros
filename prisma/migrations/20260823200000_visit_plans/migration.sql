-- CreateEnum
CREATE TYPE "VisitPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "VisitPlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "jobType" "JobType" NOT NULL DEFAULT 'INSPECTION',
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "totalVisits" INTEGER NOT NULL,
    "preferredTechId" TEXT,
    "status" "VisitPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitPlan_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "visitPlanId" TEXT,
ADD COLUMN "visitNumber" INTEGER;

-- CreateIndex
CREATE INDEX "VisitPlan_clientId_status_idx" ON "VisitPlan"("clientId", "status");

-- CreateIndex
CREATE INDEX "VisitPlan_status_idx" ON "VisitPlan"("status");

-- CreateIndex
CREATE INDEX "Job_visitPlanId_idx" ON "Job"("visitPlanId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_visitPlanId_fkey" FOREIGN KEY ("visitPlanId") REFERENCES "VisitPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitPlan" ADD CONSTRAINT "VisitPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitPlan" ADD CONSTRAINT "VisitPlan_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitPlan" ADD CONSTRAINT "VisitPlan_preferredTechId_fkey" FOREIGN KEY ("preferredTechId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
