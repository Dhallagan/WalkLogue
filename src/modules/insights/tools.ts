import { formatCompactDate, formatEntryTime } from "../../lib/date";
import type { EntryListItem } from "../journal/types";
import type { InsightTimeframe } from "./analysis";
import { filterEntriesForTimeframe } from "./analysis";

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const STOP_WORDS = new Set([
  "about",
  "after",
  "around",
  "been",
  "being",
  "could",
  "from",
  "have",
  "into",
  "just",
  "last",
  "like",
  "more",
  "much",
  "near",
  "that",
  "their",
  "them",
  "then",
  "there",
  "they",
  "this",
  "those",
  "through",
  "today",
  "very",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your",
]);

type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type EntrySearchPlan = {
  normalizedQuestion: string;
  queryTokens: string[];
  explicitDate: Date | null;
  relativeDayOffset: number | null;
  weekday: number | null;
  timeOfDay: TimeOfDay | null;
  clockMinutes: number | null;
};

export type RetrievedEntry = {
  entry: EntryListItem;
  score: number;
  reasons: string[];
  excerpt: string;
};

export type SearchEntriesResult = {
  plan: EntrySearchPlan;
  appliedFilters: string[];
  matches: RetrievedEntry[];
};

export function searchEntriesForQuestion(
  entries: EntryListItem[],
  question: string,
  timeframe: InsightTimeframe,
  limit = 4,
): SearchEntriesResult {
  const scopedEntries = filterEntriesForTimeframe(entries, timeframe);
  const plan = buildSearchPlan(question);
  const appliedFilters = describeAppliedFilters(plan, timeframe);
  const ranked = scopedEntries
    .map((entry) => rankEntry(entry, plan))
    .filter((candidate) => candidate.score > 0.35)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.entry.createdAt.getTime() - left.entry.createdAt.getTime();
    });

  const matches =
    ranked.length > 0
      ? ranked.slice(0, limit)
      : scopedEntries
          .slice(0, limit)
          .map((entry) => rankEntry(entry, plan, true));

  return {
    plan,
    appliedFilters,
    matches,
  };
}

function buildSearchPlan(question: string): EntrySearchPlan {
  const normalizedQuestion = question.toLowerCase();

  return {
    normalizedQuestion,
    queryTokens: tokenize(question).filter((token) => !STOP_WORDS.has(token)),
    explicitDate: parseExplicitDate(normalizedQuestion),
    relativeDayOffset: parseRelativeDayOffset(normalizedQuestion),
    weekday: parseWeekday(normalizedQuestion),
    timeOfDay: parseTimeOfDay(normalizedQuestion),
    clockMinutes: parseClockMinutes(normalizedQuestion),
  };
}

function describeAppliedFilters(plan: EntrySearchPlan, timeframe: InsightTimeframe) {
  const filters = [formatTimeframeFilter(timeframe)];

  if (plan.explicitDate) {
    filters.push(`specific date ${formatCompactDate(plan.explicitDate)}`);
  } else if (typeof plan.relativeDayOffset === "number") {
    filters.push(plan.relativeDayOffset === 0 ? "today" : "yesterday");
  } else if (typeof plan.weekday === "number") {
    filters.push(`weekday ${WEEKDAYS[plan.weekday]}`);
  }

  if (plan.timeOfDay) {
    filters.push(plan.timeOfDay);
  }

  if (typeof plan.clockMinutes === "number") {
    filters.push(`around ${formatMinutes(plan.clockMinutes)}`);
  }

  if (plan.queryTokens.length > 0) {
    filters.push(`keywords ${plan.queryTokens.slice(0, 4).join(", ")}`);
  }

  return filters;
}

function formatTimeframeFilter(timeframe: InsightTimeframe) {
  if (timeframe === "all") {
    return "all entries";
  }

  if (timeframe === "30d") {
    return "last 30 days";
  }

  if (timeframe === "90d") {
    return "last 90 days";
  }

  return "last 7 days";
}

function rankEntry(
  entry: EntryListItem,
  plan: EntrySearchPlan,
  isFallback = false,
): RetrievedEntry {
  const reasons: string[] = [];
  let score = isFallback ? 0.5 : 0;
  const entryMoment = entry.startedAt ?? entry.createdAt;
  const entryEndMoment = entry.endedAt ?? entry.createdAt;
  const entryBody = entry.body.trim();
  const entryText = `${entry.title} ${entryBody}`.toLowerCase();

  if (plan.queryTokens.length > 0) {
    const keywordHits = plan.queryTokens.filter((token) => entryText.includes(token)).length;

    if (keywordHits > 0) {
      score += keywordHits * 2.8;
      reasons.push(
        keywordHits === 1 ? "matched one keyword" : `matched ${keywordHits} keywords`,
      );
    }
  } else {
    score += 0.4;
  }

  const targetDate = plan.explicitDate ?? getRelativeTargetDate(plan.relativeDayOffset);

  if (targetDate) {
    const distance = Math.abs(daysBetween(startOfDay(entryMoment), startOfDay(targetDate)));

    if (distance === 0) {
      score += 3;
      reasons.push("same day");
    } else if (distance <= 1) {
      score += 1;
      reasons.push("near requested day");
    }
  } else if (typeof plan.weekday === "number") {
    if (entryMoment.getDay() === plan.weekday) {
      score += 2.3;
      reasons.push(`weekday ${WEEKDAYS[plan.weekday]}`);
    }
  }

  if (plan.timeOfDay) {
    if (getTimeOfDay(entryMoment) === plan.timeOfDay) {
      score += 1.6;
      reasons.push(plan.timeOfDay);
    }
  }

  if (typeof plan.clockMinutes === "number") {
    const startMinutes = entryMoment.getHours() * 60 + entryMoment.getMinutes();
    const endMinutes = entryEndMoment.getHours() * 60 + entryEndMoment.getMinutes();
    const distance = Math.min(
      clockDistance(startMinutes, plan.clockMinutes),
      clockDistance(endMinutes, plan.clockMinutes),
    );

    if (distance <= 20) {
      score += 2.5;
      reasons.push(`near ${formatMinutes(plan.clockMinutes)}`);
    } else if (distance <= 60) {
      score += 1;
      reasons.push("same part of the day");
    }
  }

  score += Math.max(0, 21 - daysSince(entry.createdAt)) * 0.04;
  score += Math.min(1.2, tokenize(entryBody).length / 160);

  return {
    entry,
    score,
    reasons: reasons.length > 0 ? reasons : ["recent entry"],
    excerpt: buildExcerpt(entry, plan.queryTokens),
  };
}

function buildExcerpt(entry: EntryListItem, queryTokens: string[]) {
  const body = entry.body.replace(/\s+/g, " ").trim();

  if (!body) {
    return "Empty entry.";
  }

  if (queryTokens.length === 0) {
    return truncate(body, 220);
  }

  const lowerBody = body.toLowerCase();

  for (const token of queryTokens) {
    const matchIndex = lowerBody.indexOf(token);

    if (matchIndex === -1) {
      continue;
    }

    const start = Math.max(0, matchIndex - 80);
    const end = Math.min(body.length, matchIndex + 140);
    return trimSnippet(body.slice(start, end), start > 0, end < body.length);
  }

  return truncate(body, 220);
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function trimSnippet(value: string, hasPrefix: boolean, hasSuffix: boolean) {
  const trimmed = value.trim();
  const prefix = hasPrefix ? "…" : "";
  const suffix = hasSuffix ? "…" : "";
  return `${prefix}${trimmed}${suffix}`;
}

function parseRelativeDayOffset(question: string) {
  if (question.includes("yesterday")) {
    return 1;
  }

  if (question.includes("today") || question.includes("tonight")) {
    return 0;
  }

  return null;
}

function parseWeekday(question: string) {
  for (const [index, weekday] of WEEKDAYS.entries()) {
    if (question.includes(weekday)) {
      return index;
    }
  }

  return null;
}

function parseTimeOfDay(question: string): TimeOfDay | null {
  if (question.includes("morning")) {
    return "morning";
  }

  if (question.includes("afternoon")) {
    return "afternoon";
  }

  if (question.includes("evening")) {
    return "evening";
  }

  if (question.includes("night") || question.includes("tonight")) {
    return "night";
  }

  return null;
}

function parseClockMinutes(question: string) {
  const twelveHourMatch = question.match(/\b(\d{1,2})(?::(\d{2}))?\s?(am|pm)\b/);

  if (twelveHourMatch) {
    const hour = Number(twelveHourMatch[1]);
    const minute = Number(twelveHourMatch[2] ?? "0");
    const meridiem = twelveHourMatch[3];
    const normalizedHour =
      meridiem === "pm" ? (hour % 12) + 12 : hour % 12;
    return normalizedHour * 60 + minute;
  }

  const twentyFourHourMatch = question.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);

  if (twentyFourHourMatch) {
    const hour = Number(twentyFourHourMatch[1]);
    const minute = Number(twentyFourHourMatch[2]);
    return hour * 60 + minute;
  }

  return null;
}

function parseExplicitDate(question: string) {
  const monthPattern = new RegExp(
    `\\b(${MONTHS.join("|")})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?\\b`,
  );
  const monthMatch = question.match(monthPattern);

  if (monthMatch) {
    const monthIndex = MONTHS.indexOf(monthMatch[1] as (typeof MONTHS)[number]);
    const day = Number(monthMatch[2]);
    const year = Number(monthMatch[3] ?? new Date().getFullYear());
    return new Date(year, monthIndex, day);
  }

  const numericMatch = question.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);

  if (numericMatch) {
    const month = Number(numericMatch[1]) - 1;
    const day = Number(numericMatch[2]);
    const rawYear = numericMatch[3];
    const year = rawYear
      ? rawYear.length === 2
        ? 2000 + Number(rawYear)
        : Number(rawYear)
      : new Date().getFullYear();
    return new Date(year, month, day);
  }

  return null;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getRelativeTargetDate(relativeDayOffset: number | null) {
  if (relativeDayOffset === null) {
    return null;
  }

  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() - relativeDayOffset);
  return target;
}

function daysBetween(left: Date, right: Date) {
  return Math.round((left.getTime() - right.getTime()) / 86_400_000);
}

function daysSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();

  if (hour < 12) {
    return "morning";
  }

  if (hour < 17) {
    return "afternoon";
  }

  if (hour < 22) {
    return "evening";
  }

  return "night";
}

function clockDistance(left: number, right: number) {
  return Math.abs(left - right);
}

function formatMinutes(totalMinutes: number) {
  const normalizedHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = normalizedHours >= 12 ? "PM" : "AM";
  const displayHour = normalizedHours % 12 === 0 ? 12 : normalizedHours % 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${displayHour}:${displayMinutes} ${period}`;
}

export function buildRetrievedEntryContext(matches: RetrievedEntry[]) {
  if (matches.length === 0) {
    return "No matching entries were retrieved.";
  }

  return matches
    .map(({ entry, excerpt }, index) => {
      const parts = [
        `[${index + 1}] ${formatCompactDate(entry.createdAt)}`,
        formatEntryTime(entry.startedAt ?? entry.createdAt),
        entry.source,
      ];

      if (typeof entry.stepCount === "number") {
        parts.push(`${entry.stepCount} steps`);
      }

      return `${parts.join(" | ")}\n${excerpt}`;
    })
    .join("\n\n");
}
