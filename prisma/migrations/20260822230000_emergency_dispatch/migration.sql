-- CreateTable
CREATE TABLE "EmergencyDispatch" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "dispatchedById" TEXT NOT NULL,
    "assignedTechnicianId" TEXT NOT NULL,
    "backupTechnicianId" TEXT,
    "message" TEXT NOT NULL,
    "hazardTags" JSONB,
    "techSmsSentAt" TIMESTAMP(3),
    "backupSmsSentAt" TIMESTAMP(3),
    "customerSmsSentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyDispatch_jobId_key" ON "EmergencyDispatch"("jobId");

-- CreateIndex
CREATE INDEX "EmergencyDispatch_assignedTechnicianId_acknowledgedAt_idx" ON "EmergencyDispatch"("assignedTechnicianId", "acknowledgedAt");

-- CreateIndex
CREATE INDEX "EmergencyDispatch_createdAt_idx" ON "EmergencyDispatch"("createdAt");

-- AddForeignKey
ALTER TABLE "EmergencyDispatch" ADD CONSTRAINT "EmergencyDispatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyDispatch" ADD CONSTRAINT "EmergencyDispatch_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyDispatch" ADD CONSTRAINT "EmergencyDispatch_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyDispatch" ADD CONSTRAINT "EmergencyDispatch_backupTechnicianId_fkey" FOREIGN KEY ("backupTechnicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyDispatch" ADD CONSTRAINT "EmergencyDispatch_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
