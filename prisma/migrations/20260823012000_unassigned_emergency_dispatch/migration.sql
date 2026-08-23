-- Allow emergency dispatches without a pre-assigned technician
ALTER TABLE "EmergencyDispatch" ALTER COLUMN "assignedTechnicianId" DROP NOT NULL;
