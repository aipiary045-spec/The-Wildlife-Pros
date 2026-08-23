"use client";

import { NewQuoteButton } from "@/components/quotes/QuoteForm";
import type { ScheduleClient } from "@/components/schedule/NewJobDialog";
import type { ServiceOption } from "@/components/billing/LineItemsEditor";

export function QuoteClientLauncher({
  clientId,
  clients,
  services,
  techView = false,
}: {
  clientId?: string;
  clients: ScheduleClient[];
  services: ServiceOption[];
  techView?: boolean;
}) {
  if (!clientId) return null;
  return <NewQuoteButton clients={clients} services={services} initialClientId={clientId} techView={techView} />;
}
