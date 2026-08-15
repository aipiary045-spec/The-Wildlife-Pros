export type ScheduleJobCard = {
  id: string;
  number?: string;
  title: string;
  type?: string;
  status: string;
  scheduledStart: string | Date | null;
  durationMin: number;
  instructions?: string | null;
  technicianId: string | null;
  sourceJobId?: string | null;
  client: { firstName: string; lastName: string; companyName?: string | null };
  property: { address1: string };
};

export type ScheduleTech = { id: string; firstName: string; lastName: string; color: string };
