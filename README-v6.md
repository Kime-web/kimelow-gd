# Kimelow.gd v6 — Tracker UI & Start Pos

- `tracker.html` now displays full-width polished level cards in a responsive grid with records, attempts, death summaries and Start Pos.
- Start Pos intervals can be entered as `67-100` or `67–100`; multiple entries are kept in `startPosRuns` per level, separate from zero-start percent records and deaths.
- Start Pos is available on the main page and on tracker.html.
- The existing browser storage key and Supabase snapshot schema are preserved. No migration is needed. Existing v5 records remain unchanged.
- In `tracker.html` use “Start Pos” to add runs and “Record %” for records from zero.
- Online accounts still require Supabase configuration per README-v5.md.
