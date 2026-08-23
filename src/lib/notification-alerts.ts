import type { NotificationItem } from "@/lib/notifications";

export type NotificationAlertTone = "none" | "regular" | "emergency";

function isActiveEmergency(item: NotificationItem) {
  return item.kind === "emergency_dispatch" && !item.title.toLowerCase().includes("acknowledged");
}

export function notificationAlertTone(
  previousIds: ReadonlySet<string>,
  items: NotificationItem[],
  isBootstrap: boolean,
): NotificationAlertTone {
  if (isBootstrap) return "none";
  const fresh = items.filter((item) => !previousIds.has(item.id));
  if (!fresh.length) return "none";
  if (fresh.some(isActiveEmergency)) return "emergency";
  const freshAlerts = fresh.filter(
    (item) => item.kind !== "emergency_dispatch" || !item.title.toLowerCase().includes("acknowledged"),
  );
  if (!freshAlerts.length) return "none";
  return "regular";
}

export function notificationIdSet(items: NotificationItem[]) {
  return new Set(items.map((item) => item.id));
}
