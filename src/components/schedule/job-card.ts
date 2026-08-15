export type ScheduleJobCard = {
  id: string;
  number?: string;
  title: string;
  status: string;
  scheduledStart: string | Date | null;
  durationMin: number;
  technicianId: string | null;
  sourceJobId?: string | null;
  client: { firstName: string; lastName: string };
  property: { address1: string };
};

export type ScheduleTech = { id: string; firstName: string; lastName: string; color: string };
