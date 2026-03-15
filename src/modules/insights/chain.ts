import type { EntryListItem } from "../journal/types";
import type { InsightTimeframe } from "./analysis";
import { buildRetrievedEntryContext, searchEntriesForQuestion } from "./tools";

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
  const retrieval = searchEntriesForQuestion(entries, question, timeframe, 4);
  const conversation = [...messages, { role: "user" as const, content: question }]
    .slice(-8)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  const prompt = [
    "Answer the user's question about their own journal entries.",
    "Use the retrieved notes first. Only use the conversation for context, not for new facts.",
    "Keep it conversational, natural, and inward, like a thoughtful person reflecting something back.",
    "Default to 2 to 4 sentences unless the user asks for more.",
    "Do not use bracket citations, ranking language, retrieval language, or analytical framing.",
    "If it helps, mention the day or time naturally in the sentence, not as a citation.",
    "If the evidence is thin or ambiguous, say that gently and ask one short follow-up question.",
    "Do not sound forensic, report-like, or overly certain.",
    "",
    `Question focus: ${retrieval.appliedFilters.join(" | ")}`,
    "",
    "Retrieved notes:",
    buildRetrievedEntryContext(retrieval.matches),
    "",
    "Conversation:",
    conversation,
  ].join("\n");

  return {
    instructions:
      "You are a warm, grounded journal companion. Speak naturally and conversationally, not like an analyst. Stay faithful to the notes you were given, but make the answer feel human and easy to talk to. If the user asks for a narrow factual lookup, answer narrowly. If they ask a reflective question, respond with warmth and inwardness. Never mention tools, retrieval, filters, ranking, or citations.",
    prompt,
    retrieval,
  };
}
