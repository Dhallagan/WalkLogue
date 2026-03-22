# TODOs

## Optimize listEntriesForDay() with server-side date filter
**What:** Replace the full-table-scan-then-filter pattern in `listEntriesForDay()` (repository.ts:361-367) with a proper `WHERE` clause that filters by date at the SQL level.
**Why:** Currently loads ALL entries from the database and filters client-side in JavaScript. Works fine with <100 entries but will degrade as the life ledger grows to 365+ entries over a year of daily use.
**Pros:** O(1) query per day instead of O(n) full scan. Improves day detail screen load time.
**Cons:** Need to handle timezone correctly in SQL (`date(created_at, 'localtime')`), which is a new pattern in the codebase — all other date filtering uses `isSameCalendarDay()` in JS.
**Context:** Pre-existing debt, not introduced by the Homework for Life feature. The same pattern exists in `listDailySummaries()` which iterates all entries to build daily aggregates. Both should be optimized together when the ledger reaches ~200+ entries.
**Depends on:** Nothing. Can be done at any time.
