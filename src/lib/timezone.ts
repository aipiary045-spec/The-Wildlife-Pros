export const APP_TIMEZONE = process.env.APP_TIMEZONE?.trim() || "America/New_York";

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function zonedFormatter(timeZone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function zonedParts(value: Date, timeZone = APP_TIMEZONE): ZonedParts {
  const parts = Object.fromEntries(
    zonedFormatter(timeZone)
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function dateKeyInZone(value: Date, timeZone = APP_TIMEZONE) {
  const parts = zonedParts(value, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function timeValueInZone(value: Date, timeZone = APP_TIMEZONE) {
  const parts = zonedParts(value, timeZone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function zonedOffsetMs(value: Date, timeZone = APP_TIMEZONE) {
  const parts = zonedParts(value, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
  return asUtc - value.getTime();
}

export function fromZonedDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  timeZone = APP_TIMEZONE,
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const first = new Date(utcGuess - zonedOffsetMs(new Date(utcGuess), timeZone));
  return new Date(utcGuess - zonedOffsetMs(first, timeZone));
}

export function startOfZonedDay(value: Date, timeZone = APP_TIMEZONE) {
  const parts = zonedParts(value, timeZone);
  return fromZonedDateTime(parts.year, parts.month, parts.day, 0, 0, timeZone);
}

export function addZonedDays(value: Date, days: number, timeZone = APP_TIMEZONE) {
  const parts = zonedParts(value, timeZone);
  const noon = fromZonedDateTime(parts.year, parts.month, parts.day, 12, 0, timeZone);
  return startOfZonedDay(new Date(noon.getTime() + days * 86_400_000), timeZone);
}

export function businessAt(daysFromToday: number, hour: number, minute = 0, now = new Date(), timeZone = APP_TIMEZONE) {
  const day = addZonedDays(now, daysFromToday, timeZone);
  const parts = zonedParts(day, timeZone);
  return fromZonedDateTime(parts.year, parts.month, parts.day, hour, minute, timeZone);
}
