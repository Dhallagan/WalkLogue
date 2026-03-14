export type JournalEntry = {
  id: string;
  createdAt: Date;
  source: "walk" | "manual";
  title: string;
  body: string;
  sessionId?: string;
};

export type WalkSession = {
  id: string;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  stepCount: number;
  entryId: string;
};

export type DailySteps = {
  date: string;
  totalSteps: number;
};

export type EntryListItem = JournalEntry & {
  durationSec?: number;
  stepCount?: number;
};

export type EntryDetail = EntryListItem & {
  startedAt?: Date;
  endedAt?: Date;
};
