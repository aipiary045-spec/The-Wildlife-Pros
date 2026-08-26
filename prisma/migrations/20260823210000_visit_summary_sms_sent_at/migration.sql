-- Track when a visit summary was texted to the customer after checkout
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "summarySmsSentAt" TIMESTAMP(3);
