import { formatCompactDate, formatDuration } from "../../lib/date";
import type { EntryListItem } from "../journal/types";
import type { InsightTimeframe } from "./analysis";
import { filterEntriesForTimeframe } from "./analysis";

type InsightChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function buildInsightAnswerChain(
  entries: EntryListItem[],
  messages: InsightChatMessage[],
  question: string,
  timeframe: InsightTimeframe,
) {
  const scopedEntries = filterEntriesForTimeframe(entries, timeframe);
  const conversation = [...messages, { role: "user" as const, content: question }]
    .slice(-8)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  const prompt = [
    "Answer the user's question about their own journal entries.",
    "You have the user's full journal below. Read all of it before answering.",
    "Keep it conversational, natural, and inward, like a thoughtful person reflecting something back.",
    "Default to 2 to 4 sentences unless the user asks for more.",
    "Do not use bracket citations, ranking language, retrieval language, or analytical framing.",
    "If it helps, mention the day or time naturally in the sentence, not as a citation.",
    "If the evidence is thin or ambiguous, say that gently and ask one short follow-up question.",
    "Do not sound forensic, report-like, or overly certain.",
    "",
    `Time window: ${formatTimeframeLabel(timeframe)} (${scopedEntries.length} entries)`,
    "",
    "Journal entries:",
    buildFullEntryContext(scopedEntries),
    "",
    "Conversation:",
    conversation,
  ].join("\n");

  return {
    instructions:
      "You are a warm, grounded journal companion. Speak naturally and conversationally, not like an analyst. Stay faithful to the journal entries you were given, but make the answer feel human and easy to talk to. If the user asks for a narrow factual lookup, answer narrowly. If they ask a reflective question, respond with warmth and inwardness. Never mention tools, retrieval, filters, ranking, or citations.",
    prompt,
  };
}

function buildFullEntryContext(entries: EntryListItem[]) {
  if (entries.length === 0) {
    return "No journal entries available.";
  }

  return entries
    .map((entry, index) => {
      const parts = [
        `${index + 1}. ${formatCompactDate(entry.createdAt)} | ${entry.source}`,
      ];

      if (entry.title) {
        parts.push(entry.title);
      }

      if (typeof entry.durationSec === "number") {
        parts.push(`duration ${formatDuration(entry.durationSec)}`);
      }

      if (typeof entry.stepCount === "number") {
        parts.push(`${entry.stepCount} steps`);
      }

      const header = parts.join(" | ");
      const rawBody = entry.body.trim() || "Empty entry.";
      const body =
        rawBody.length > 300 ? rawBody.slice(0, 300) + "..." : rawBody;

      return `${header}\n${body}`;
    })
    .join("\n\n");
}

function formatTimeframeLabel(timeframe: InsightTimeframe) {
  if (timeframe === "30d") return "last 30 days";
  if (timeframe === "90d") return "last 90 days";
  if (timeframe === "all") return "all entries";
  return "last 7 days";
}
