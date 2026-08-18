export function trapQrPayload(serial: string) {
  return `critterops:trap:${serial.trim().toUpperCase()}`;
}

export function parseTrapScan(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().startsWith("critterops:trap:")) {
    return trimmed.slice("critterops:trap:".length).trim().toUpperCase();
  }
  const direct = trimmed.match(/^T-\d+$/i);
  if (direct) return direct[0].toUpperCase();
  const embedded = trimmed.match(/T-\d+/i);
  return embedded ? embedded[0].toUpperCase() : null;
}

export const STALE_TRAP_DAYS = 7;

export function isStaleTrap(deployedAt: Date | string, now = new Date(), days = STALE_TRAP_DAYS) {
  const deployed = new Date(deployedAt);
  if (Number.isNaN(deployed.getTime())) return false;
  return now.getTime() - deployed.getTime() >= days * 24 * 60 * 60 * 1000;
}
