# git-notion-logger

A background worker that watches this git repo and, on each trigger:

1. Snapshots the working tree and diffs it against the previous snapshot
   (using a throwaway git index — your real staging area is never touched).
2. If something changed, sends the diff to Claude (`claude-sonnet-4-6`) and
   asks for `Name` (English verb phrase), `中文` (one concise line), and
   `description` (detailed Chinese explanation).
3. Writes the result as a new page in your Notion database.

It tracks **incremental** work: each entry describes only what changed since
the last successful write, including new untracked files (respecting
`.gitignore`).

## Setup

```sh
# 1. Install the one dependency (Anthropic SDK) — this also adds it to package.json
npm install @anthropic-ai/sdk@latest

# 2. Configure
cp scripts/git-notion-logger/.env.example scripts/git-notion-logger/.env
#    then edit .env with your keys

# 3. Run
npm run journal
```

Requires Node 18+ (uses the built-in `fetch`).

## Notion database

Create a database with three properties whose **names and types** match:

| Property      | Type | Purpose                         |
| ------------- | ---- | ------------------------------- |
| `Name`        | Title | English verb phrase            |
| `中文`        | Text (rich_text) | One concise Chinese line |
| `description` | Text (rich_text) | Detailed Chinese explanation |

Share the database with your Notion integration (••• → Connections → your
integration), then copy the database ID from its URL into `.env`. Rename the
columns or override `NOTION_PROP_*` in `.env` if yours differ.

## Trigger modes

Set `TRIGGER_MODE` in `.env`:

- `watch` — waits until you **stop editing** for `WATCH_DEBOUNCE_MS` (the idle
  window; default in `.env` is 5 min), then summarizes everything changed in
  that session into **one** entry. Each save resets the timer, so a continuous
  burst of edits collapses into a single row. Lower the value if you want rows
  sooner / more granular. No Claude/Notion call happens unless watched files
  actually changed.
- `interval` — checks every `CHECK_INTERVAL_MINUTES` minutes; only calls Claude
  if something changed since the last check.

Either way, no change in the watched paths means no API call and no tokens.

## Notes

- First run baselines against the latest commit (`HEAD`), so the first entry
  covers any work already in progress.
- The baseline only advances after a successful Notion write, so a transient
  failure is retried on the next tick instead of being lost.
- `node_modules` and `dist` are excluded from the diff by default — adjust
  `EXCLUDE_PATHS` in `.env`.
- State is stored in `.git/focus-notion-state.json` (never committed).
