import { formatCompactDate, formatDuration } from "../../lib/date";
import type { EntryListItem } from "../journal/types";
import {
  buildInsightSnapshot,
  filterEntriesForTimeframe,
  type InsightTimeframe,
  type InsightSnapshot,
} from "./analysis";
import { buildInsightAnswerChain } from "./chain";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_INSIGHTS_MODEL = "gpt-5-mini";
const MAX_CONTEXT_ENTRIES = 8;
const reflectionCache = new Map<string, string>();
const reflectionInFlight = new Map<string, Promise<string>>();

type InsightChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type OpenAIResponsesResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

export async function generateReflection(
  entries: EntryListItem[],
  timeframe: InsightTimeframe,
) {
  const { apiKey, model } = getInsightsConfig();
  const { cacheKey, contextEntries, snapshot } = getReflectionRequestContext(
    entries,
    timeframe,
    model,
  );

  const cachedReflection = reflectionCache.get(cacheKey);

  if (cachedReflection) {
    return cachedReflection;
  }

  const inFlightReflection = reflectionInFlight.get(cacheKey);

  if (inFlightReflection) {
    return inFlightReflection;
  }

  const prompt = [
    "Write a concise reflection blurb for the user's journal app.",
    "Ground every statement in the provided entries.",
    "Keep it to 3 short paragraphs max.",
    "Focus on recurring themes, energy, tension, and what seems to matter most right now.",
    `The requested time window is ${formatTimeframeLabel(timeframe)}.`,
    "Do not mention missing data, prompt design, or that you are an AI.",
    "",
    buildSnapshotContext(snapshot),
    "",
    "Recent entries:",
    buildEntryContext(contextEntries),
  ].join("\n");

  const reflectionPromise = createInsightsResponse({
    apiKey,
    model,
    instructions:
      "You are the reflection layer for a personal journaling app. Be specific, observant, and emotionally intelligent. Never invent events. If evidence is weak, use cautious language.",
    input: prompt,
  })
    .then((reflection) => {
      reflectionCache.set(cacheKey, reflection);
      reflectionInFlight.delete(cacheKey);
      return reflection;
    })
    .catch((error) => {
      reflectionInFlight.delete(cacheKey);
      throw error;
    });

  reflectionInFlight.set(cacheKey, reflectionPromise);

  return reflectionPromise;
}

export function peekCachedReflection(
  entries: EntryListItem[],
  timeframe: InsightTimeframe,
) {
  if (!hasInsightsConfig()) {
    return null;
  }

  const { model } = getInsightsConfig();
  const { cacheKey } = getReflectionRequestContext(entries, timeframe, model);
  return reflectionCache.get(cacheKey) ?? null;
}

export async function answerInsightQuestion(
  entries: EntryListItem[],
  messages: InsightChatMessage[],
  question: string,
  timeframe: InsightTimeframe,
) {
  const { apiKey, model } = getInsightsConfig();
  const answerChain = buildInsightAnswerChain(entries, messages, question, timeframe);

  return createInsightsResponse({
    apiKey,
    model,
    instructions: answerChain.instructions,
    input: answerChain.prompt,
  });
}

export function hasInsightsConfig() {
  return Boolean(process.env.EXPO_PUBLIC_OPENAI_API_KEY);
}

function getInsightsConfig() {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_OPENAI_API_KEY for Insights.");
  }

  return {
    apiKey,
    model: process.env.EXPO_PUBLIC_OPENAI_INSIGHTS_MODEL ?? DEFAULT_INSIGHTS_MODEL,
  };
}

async function createInsightsResponse({
  apiKey,
  model,
  instructions,
  input,
}: {
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
}) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning: {
        effort: "low",
      },
      instructions,
      input,
    }),
  });

  const payload = (await response.json()) as OpenAIResponsesResponse;

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    const requestSuffix = requestId ? ` [request ${requestId}]` : "";
    const message = payload.error?.message ?? "OpenAI request failed.";
    throw new Error(`${message}${requestSuffix}`);
  }

  const text = payload.output_text ?? flattenOutputText(payload.output);

  if (!text.trim()) {
    throw new Error("OpenAI returned an empty response.");
  }

  return text.trim();
}

function flattenOutputText(output: OpenAIResponsesResponse["output"]) {
  return (
    output
      ?.flatMap((item) =>
        item.content
          ?.filter((contentPart) => contentPart.type === "output_text")
          .map((contentPart) => contentPart.text ?? "") ?? [],
      )
      .join("\n") ?? ""
  );
}

function buildSnapshotContext(snapshot: InsightSnapshot) {
  return [
    `Recent entries: ${snapshot.activeEntryCount}`,
    `Total entries: ${snapshot.totalEntryCount}`,
    `Walk entries: ${snapshot.walkCount}`,
    `Recent words: ${snapshot.totalWords}`,
    `Recent steps: ${snapshot.totalSteps}`,
    `Average words per entry: ${snapshot.averageWords}`,
    `Most active day: ${snapshot.strongestDay ?? "unknown"}`,
    `Topics: ${snapshot.topTopics.join(", ") || "none"}`,
    `Lenses: ${snapshot.focusAreas.join(", ") || "none"}`,
  ].join("\n");
}

function buildEntryContext(entries: EntryListItem[]) {
  if (entries.length === 0) {
    return "No journal entries available.";
  }

  return entries
    .map((entry, index) => {
      const parts = [
        `${index + 1}. ${formatCompactDate(entry.createdAt)} | ${entry.source}`,
      ];

      if (typeof entry.durationSec === "number") {
        parts.push(`duration ${formatDuration(entry.durationSec)}`);
      }

      if (typeof entry.stepCount === "number") {
        parts.push(`steps ${entry.stepCount}`);
      }

      const header = parts.join(" | ");
      const body = entry.body.trim() || "Empty entry.";

      return `${header}\n${body}`;
    })
    .join("\n\n");
}

function formatTimeframeLabel(timeframe: InsightTimeframe) {
  if (timeframe === "30d") {
    return "the last 30 days";
  }

  if (timeframe === "90d") {
    return "the last 90 days";
  }

  if (timeframe === "all") {
    return "all available entries";
  }

  return "the last 7 days";
}

function getReflectionRequestContext(
  entries: EntryListItem[],
  timeframe: InsightTimeframe,
  model: string,
) {
  const filteredEntries = filterEntriesForTimeframe(entries, timeframe);
  const snapshot = buildInsightSnapshot(entries, timeframe);
  const contextEntries = filteredEntries.slice(0, MAX_CONTEXT_ENTRIES);
  const cacheKey = buildReflectionCacheKey(model, timeframe, contextEntries);

  return {
    cacheKey,
    contextEntries,
    snapshot,
  };
}

function buildReflectionCacheKey(
  model: string,
  timeframe: InsightTimeframe,
  entries: EntryListItem[],
) {
  const entrySignature = entries
    .map((entry) =>
      [
        entry.id,
        entry.createdAt.toISOString(),
        entry.body,
        entry.stepCount ?? "",
        entry.durationSec ?? "",
      ].join("|"),
    )
    .join("||");

  return `${model}::${timeframe}::${entrySignature}`;
}
