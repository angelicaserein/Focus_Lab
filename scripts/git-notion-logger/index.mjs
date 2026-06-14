#!/usr/bin/env node
// Background worker: every N minutes, snapshot the git working tree, diff it
// against the last snapshot, ask Claude to summarize what changed, and write
// the summary into a Notion database.
//
// Run:  node scripts/git-notion-logger/index.mjs
// Config comes from environment variables (a sibling .env file is auto-loaded).

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync, watch } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ----------------------------------------------------------------------------
// Minimal .env loader (no dependency). Looks for a .env next to this script.
// ----------------------------------------------------------------------------
function loadDotEnv() {
  const envPath = join(__dirname, ".env");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadDotEnv();

// ----------------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------------
const CONFIG = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  notionToken: process.env.NOTION_TOKEN,
  notionDatabaseId: process.env.NOTION_DATABASE_ID,

  // Trigger mode: "watch" (run when files change) or "interval" (every N min).
  triggerMode: (process.env.TRIGGER_MODE || "interval").toLowerCase(),

  // How often to check for changes (interval mode only).
  intervalMinutes: Number(process.env.CHECK_INTERVAL_MINUTES || 30),

  // Watch mode: wait this long after the last save before summarizing, so a
  // single save (which can fire several FS events) becomes one entry.
  watchDebounceMs: Number(process.env.WATCH_DEBOUNCE_MS || 2000),

  // Which repo to watch. Defaults to two levels up (the project root).
  repoPath: process.env.GIT_REPO_PATH || join(__dirname, "..", ".."),

  // Model (you asked for sonnet-4-6 specifically).
  model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",

  // Paths to exclude from the diff (noisy / generated). Comma-separated.
  excludePaths: (process.env.EXCLUDE_PATHS || "node_modules,dist")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // Max diff characters sent to Claude (keeps token cost bounded).
  maxDiffChars: Number(process.env.MAX_DIFF_CHARS || 60000),

  // Notion property names — change these to match YOUR database's columns.
  props: {
    name: process.env.NOTION_PROP_NAME || "Name", // title property
    chinese: process.env.NOTION_PROP_CHINESE || "中文", // rich_text
    description: process.env.NOTION_PROP_DESCRIPTION || "description", // rich_text
    done: process.env.NOTION_PROP_DONE || "Tickbox", // checkbox (auto-checked)
  },
};

function assertConfig() {
  const missing = [];
  if (!CONFIG.anthropicApiKey) missing.push("ANTHROPIC_API_KEY");
  if (!CONFIG.notionToken) missing.push("NOTION_TOKEN");
  if (!CONFIG.notionDatabaseId) missing.push("NOTION_DATABASE_ID");
  if (missing.length) {
    console.error(
      `Missing required config: ${missing.join(", ")}.\n` +
        `Set them as environment variables or in scripts/git-notion-logger/.env`,
    );
    process.exit(1);
  }
}

const anthropic = new Anthropic({ apiKey: CONFIG.anthropicApiKey });

// State file lives inside .git so it is never committed.
const STATE_FILE = join(CONFIG.repoPath, ".git", "focus-notion-state.json");
// A throwaway git index so we never disturb the user's real staging area.
const TMP_INDEX = join(tmpdir(), "focus-notion-index");

// ----------------------------------------------------------------------------
// Git helpers
// ----------------------------------------------------------------------------
async function git(args, extraEnv = {}) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: CONFIG.repoPath,
    env: { ...process.env, ...extraEnv },
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

// Build a tree object representing the FULL current working directory
// (tracked changes + new untracked files, respecting .gitignore), using a
// temporary index so the real index/working tree are untouched.
async function snapshotWorkingTree() {
  const env = { GIT_INDEX_FILE: TMP_INDEX };
  await git(["read-tree", "HEAD"], env); // seed temp index from HEAD
  await git(["add", "-A"], env); // stage everything into temp index
  return (await git(["write-tree"], env)).trim();
}

async function headTree() {
  return (await git(["rev-parse", "HEAD^{tree}"])).trim();
}

async function diffTrees(baseTree, newTree) {
  const args = ["diff", baseTree, newTree, "--"];
  args.push("."); // start from repo root
  for (const p of CONFIG.excludePaths) args.push(`:(exclude)${p}`);
  return await git(args);
}

function readState() {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

// ----------------------------------------------------------------------------
// Claude: summarize a diff into { Name, 中文, description }
// ----------------------------------------------------------------------------
async function summarizeDiff(diffText) {
  let diff = diffText;
  let truncatedNote = "";
  if (diff.length > CONFIG.maxDiffChars) {
    diff = diff.slice(0, CONFIG.maxDiffChars);
    truncatedNote = "\n\n[diff truncated — only the first part is shown]";
  }

  const entrySchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      Name: {
        type: "string",
        description:
          "A short English title. For FEATURE work, keep it coarse/high-level, " +
          "e.g. 'Improve todo list UX'. For BUG FIXES, name the specific bug " +
          "fixed, e.g. 'Fix todo list not rendering'.",
      },
      中文: {
        type: "string",
        description:
          "一句话概括这次做了什么。功能类写大主题（如「优化待办列表的用户体验」）；" +
          "bug 类写清修了什么 bug（如「修复待办列表无法渲染的问题」）。",
      },
      description: {
        type: "string",
        description:
          "功能类：一句简短的中文概括，只点出大致加了/改了什么，例如" +
          "「加了行内编辑、可撤销删除，统一了动画过渡」，不要逐条罗列细节行为。" +
          "bug 类：可以具体一点，说明问题是什么、怎么修的（产品/行为层面）。" +
          "两类都不要提文件名、函数名、代码或实现方式。",
      },
    },
    required: ["Name", "中文", "description"],
  };

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      entries: {
        type: "array",
        description:
          "Prefer a SINGLE element covering the whole session under one " +
          "umbrella theme. Only return multiple elements if the work spans " +
          "clearly UNRELATED areas (e.g. a feature in one place plus an " +
          "unrelated bug fix elsewhere). Never split sub-features of the same " +
          "area into separate elements.",
        items: entrySchema,
      },
    },
    required: ["entries"],
  };

  const response = await anthropic.messages.create({
    model: CONFIG.model,
    max_tokens: 1024,
    system:
      "You are a work journal assistant. You receive a git diff spanning a " +
      "session of work and turn it into a COARSE, high-level journal entry — " +
      "the headline of what the developer accomplished, not a detailed spec.\n" +
      "Rules:\n" +
      "- Strongly prefer ONE entry that sums up the whole session under a " +
      "single umbrella theme (e.g. 'Improve todo list UX'). Only produce more " +
      "than one entry when the diff covers clearly unrelated areas. NEVER split " +
      "the sub-features of one area into separate entries.\n" +
      "- FEATURE work: keep `description` to ONE short sentence naming roughly " +
      "what was added/changed; do NOT enumerate detailed behaviors or edge " +
      "cases. BUG FIXES: the title must name the specific bug, and the " +
      "`description` may be more specific about what was wrong and how it was " +
      "fixed (still product/behavior level, no code).\n" +
      "- NEVER mention file names, function names, variables, code, or " +
      "implementation details. User-facing / high-level only.\n" +
      "- Be accurate; do not invent changes that aren't in the diff.",
    output_config: { format: { type: "json_schema", schema } },
    messages: [
      {
        role: "user",
        content:
          "Summarize the following git diff of my work:\n\n```diff\n" +
          diff +
          "\n```" +
          truncatedNote,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Claude returned no text block");
  const parsed = JSON.parse(textBlock.text);
  return Array.isArray(parsed.entries) ? parsed.entries : [];
}

// ----------------------------------------------------------------------------
// Notion: create a page in the database
// ----------------------------------------------------------------------------
function richText(content) {
  const chunks = [];
  const text = content || "";
  for (let i = 0; i < text.length; i += 2000) {
    chunks.push({ type: "text", text: { content: text.slice(i, i + 2000) } });
  }
  if (chunks.length === 0) chunks.push({ type: "text", text: { content: "" } });
  return chunks;
}

async function createNotionPage({ Name, 中文, description }) {
  const properties = {
    [CONFIG.props.name]: { title: richText(Name) },
    [CONFIG.props.chinese]: { rich_text: richText(中文) },
    [CONFIG.props.description]: { rich_text: richText(description) },
    [CONFIG.props.done]: { checkbox: true }, // mark as done
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CONFIG.notionToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: CONFIG.notionDatabaseId },
      properties,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion API ${res.status}: ${body}`);
  }
  return res.json();
}

// ----------------------------------------------------------------------------
// Main tick
// ----------------------------------------------------------------------------
let running = false;
let pending = false; // a change arrived while a run was in flight
let debounceTimer = null;

// Run at most once at a time. If changes arrive during a run, re-run after.
async function triggerRun() {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  try {
    await processChanges();
  } finally {
    running = false;
    if (pending) {
      pending = false;
      scheduleRun(0);
    }
  }
}

function scheduleRun(delayMs) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(triggerRun, delayMs);
}

async function processChanges() {
  const ts = new Date().toISOString();
  try {
    let state = readState();
    if (!state) {
      // First run: baseline against HEAD so the first report covers any work
      // already in progress.
      state = { baseTree: await headTree() };
      writeState(state);
    }

    const newTree = await snapshotWorkingTree();
    if (newTree === state.baseTree) {
      console.log(`[${ts}] no changes since last check — skipping.`);
      return;
    }

    const diff = await diffTrees(state.baseTree, newTree);
    if (!diff.trim()) {
      // Tree hash changed but nothing in the watched paths changed
      // (e.g. only excluded dirs). Advance the baseline and skip.
      writeState({ baseTree: newTree });
      console.log(`[${ts}] only excluded paths changed — skipping.`);
      return;
    }

    console.log(`[${ts}] changes detected — asking Claude...`);
    const entries = await summarizeDiff(diff);
    if (entries.length === 0) {
      console.log(`[${ts}] Claude returned no entries — skipping.`);
      writeState({ baseTree: newTree });
      return;
    }
    console.log(`[${ts}] ${entries.length} entry/entries — writing to Notion...`);
    for (const entry of entries) {
      await createNotionPage(entry);
      console.log(`[${ts}] → ${entry.Name}`);
    }
    console.log(`[${ts}] done ✓`);

    // Only advance the baseline after a fully successful write, so a failed
    // run is retried next tick rather than silently dropped.
    writeState({ baseTree: newTree });
  } catch (err) {
    console.error(`[${ts}] error:`, err.message || err);
  }
}

// Watch the repo and trigger a (debounced) run whenever a file changes.
function startWatching() {
  watch(CONFIG.repoPath, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    const top = filename.replace(/\\/g, "/").split("/")[0];
    if (top === ".git") return; // our own state writes + git internals
    if (CONFIG.excludePaths.includes(top)) return; // node_modules, dist, ...
    scheduleRun(CONFIG.watchDebounceMs);
  });
}

// ----------------------------------------------------------------------------
// Startup
// ----------------------------------------------------------------------------
assertConfig();
const trigger =
  CONFIG.triggerMode === "watch"
    ? `on file change (debounced ${CONFIG.watchDebounceMs} ms)`
    : `every ${CONFIG.intervalMinutes} min`;
console.log(
  `git-notion-logger started.\n` +
    `  repo:     ${CONFIG.repoPath}\n` +
    `  model:    ${CONFIG.model}\n` +
    `  trigger:  ${trigger}\n` +
    `  exclude:  ${CONFIG.excludePaths.join(", ") || "(none)"}`,
);

if (CONFIG.triggerMode === "watch") {
  startWatching(); // change-driven: only runs when you save a file
} else {
  triggerRun(); // run once immediately
  setInterval(triggerRun, CONFIG.intervalMinutes * 60 * 1000);
}
