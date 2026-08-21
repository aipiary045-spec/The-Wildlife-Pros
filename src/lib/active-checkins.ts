export type ActiveCheckInSummary = {
  jobId: string;
  jobNumber: string;
  clientName: string;
  technicianId: string;
  minutesOnSite: number;
};

export type ActiveCheckIn = ActiveCheckInSummary & {
  jobTitle: string;
  address: string;
  technicianName: string;
  startedAt: Date;
};

export function checkInsByTechnician(checkIns: ActiveCheckInSummary[]) {
  return Object.fromEntries(checkIns.map((checkIn) => [checkIn.technicianId, checkIn]));
}

export function formatOnSiteDuration(minutes: number) {
  if (minutes < 1) return "Just checked in";
  if (minutes < 60) return `${minutes}m on site`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m on site` : `${hours}h on site`;
}
