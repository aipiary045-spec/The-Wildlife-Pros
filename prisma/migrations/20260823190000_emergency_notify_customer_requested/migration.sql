-- Remember whether office asked to text the customer after a tech claims the emergency
ALTER TABLE "EmergencyDispatch" ADD COLUMN IF NOT EXISTS "notifyCustomerRequested" BOOLEAN NOT NULL DEFAULT false;
