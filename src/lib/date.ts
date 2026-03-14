export function formatEntryTitle(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatEntryMeta(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatLongDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatCompactDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatEntryTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatDuration(durationSec?: number) {
  if (!durationSec) {
    return "0m";
  }

  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const seconds = durationSec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function formatElapsed(durationSec: number) {
  const hours = Math.floor(durationSec / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((durationSec % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(durationSec % 60)
    .toString()
    .padStart(2, "0");

  return hours === "00"
    ? `${minutes}:${seconds}`
    : `${hours}:${minutes}:${seconds}`;
}
