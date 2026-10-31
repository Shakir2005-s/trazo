// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

// Pure helpers for bench/run-agent.mjs: no I/O, no clock, no randomness.

export const PROMPT_SUFFIX =
  "\n\nThe `trazo` command is installed and turns a semantic JSON description into an HTML diagram; `trazo --help` explains it. Use the `trazo` command to build the diagram and save it as diagram.html in the current directory.";

const CONDITIONS = ["skill", "no-skill"];

/** Parses the runner arguments. Throws Error with a plain message on bad input. */
export function parseArgs(argv, knownTasks, today) {
  const opts = {
    model: "",
    tasks: [],
    conditions: [...CONDITIONS],
    runs: 3,
    out: `bench/results/${today}-agent-claude-code.json`,
    agentCmd: "claude",
    timeout: 600,
    dryRun: false,
    resume: false,
    sandboxRoot: "",
  };
  const valueOf = (i) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new Error(`${argv[i]} needs a value`);
    return v;
  };
  const positive = (name, v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) throw new Error(`${name} needs a positive integer`);
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--model": opts.model = valueOf(i++); break;
      case "--task": {
        const id = valueOf(i++);
        if (!knownTasks.includes(id)) throw new Error(`unknown task: ${id}`);
        opts.tasks.push(id);
        break;
      }
      case "--condition": {
        const c = valueOf(i++);
        if (c !== "both" && !CONDITIONS.includes(c)) throw new Error("--condition must be skill, no-skill or both");
        opts.conditions = c === "both" ? [...CONDITIONS] : [c];
        break;
      }
      case "--runs": opts.runs = positive("--runs", valueOf(i++)); break;
      case "--timeout": opts.timeout = positive("--timeout", valueOf(i++)); break;
      case "--out": opts.out = valueOf(i++); break;
      case "--agent-cmd": opts.agentCmd = valueOf(i++); break;
      case "--sandbox-root": opts.sandboxRoot = valueOf(i++); break;
      case "--dry-run": opts.dryRun = true; break;
      case "--resume": opts.resume = true; break;
      default: throw new Error(`unknown option: ${a}`);
    }
  }
  if (!opts.model) throw new Error("--model is required");
  if (opts.tasks.length === 0) opts.tasks = [...knownTasks];
  return opts;
}

export function buildPrompt(taskPrompt) {
  return taskPrompt + PROMPT_SUFFIX;
}

export function buildAgentArgs(prompt, model) {
  return [
    "-p", prompt, "--model", model, "--setting-sources", "project", "--strict-mcp-config",
    "--allowedTools", "Read", "Write", "Edit", "Bash(trazo:*)",
    "--output-format", "stream-json", "--verbose",
  ];
}

export function planRuns(taskIds, conditions, runs) {
  const plan = [];
  for (const task of taskIds) for (const condition of conditions) for (let run = 1; run <= runs; run++) plan.push({ task, condition, run });
  return plan;
}

export function runName(plan) {
  return `${plan.task}-${plan.condition}-${plan.run}`;
}

export function formatCommandLine(cmd, args) {
  const quote = (s) => (/^[\w@%+=:,./\\()*-]+$/.test(s) ? s : `"${s.replace(/(["\\])/g, "\\$1")}"`);
  return [cmd, ...args].map(quote).join(" ");
}

export function shimFiles(nodePath, distCli, platform) {
  const files = [];
  if (platform === "win32") files.push({ name: "trazo.cmd", content: `@echo off\r\n"${nodePath}" "${distCli}" %*\r\n`, executable: false });
  files.push({ name: "trazo", content: `#!/bin/sh\nexec "${nodePath}" "${distCli}" "$@"\n`, executable: true });
  return files;
}

/**
 * Environment for one agent run. The user's own CLAUDE.md and auto memory would otherwise
 * load into every run (`--setting-sources` does not cover them) and skew both conditions.
 */
export function agentEnv(baseEnv, binDir, platform) {
  const env = { ...baseEnv };
  const pathKey = Object.keys(env).find((k) => k.toLowerCase() === "path") ?? "PATH";
  env[pathKey] = `${binDir}${platform === "win32" ? ";" : ":"}${env[pathKey] ?? ""}`;
  env.CLAUDE_CODE_DISABLE_CLAUDE_MDS = "1";
  env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = "1";
  return env;
}

// Agents often chain `trazo check x && trazo make x`; each segment is read on its own.
const segments = (cmd) => cmd.split(/&&|\|\||;|\n/).map((s) => s.trim());
const trazoVerbs = (cmd) => segments(cmd).map((s) => /^trazo\s+(check|make)\b/.exec(s)?.[1]).filter(Boolean);
// A command that ran and failed reports "Exit code N". An error without it is the sandbox
// refusing the whole call (a heredoc or an `rm` next to trazo), so trazo never ran.
const denied = (block) => block.is_error === true && !/^Exit code \d/.test(resultText(block.content));

function resultText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === "string" ? c : (c?.text ?? ""))).join("\n");
  return "";
}

/**
 * Reads Claude Code `--output-format stream-json` output (one JSON object per line).
 * Assumed shapes: assistant messages carry tool_use blocks {id, name, input}; user messages
 * carry tool_result blocks {tool_use_id, is_error, content}; the last line is
 * {type:"result", is_error, usage:{input_tokens, output_tokens, cache_*}}.
 */
export function parseStream(text) {
  const stats = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    failedCommands: 0,
    repairs: 0,
    firstTryOk: false,
    hasResult: false,
    resultIsError: false,
    lastMakeInput: null,
  };
  const uses = new Map();
  let failedSeen = false;
  let firstMakeSeen = false;
  for (const raw of text.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    let ev;
    try {
      ev = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!ev || typeof ev !== "object") continue;
    if (ev.type === "result") {
      stats.hasResult = true;
      stats.resultIsError = ev.is_error === true;
      const u = ev.usage ?? {};
      stats.inputTokens = u.input_tokens ?? 0;
      stats.outputTokens = u.output_tokens ?? 0;
      stats.cacheCreationTokens = u.cache_creation_input_tokens ?? 0;
      stats.cacheReadTokens = u.cache_read_input_tokens ?? 0;
      continue;
    }
    const blocks = ev.message?.content;
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (b?.type === "tool_use") {
        uses.set(b.id, b);
        const file = b.input?.file_path;
        if ((b.name === "Write" || b.name === "Edit") && typeof file === "string" && file.endsWith(".json") && failedSeen) stats.repairs++;
        const cmd = b.input?.command;
        if (b.name === "Bash" && typeof cmd === "string") {
          for (const seg of segments(cmd)) {
            const m = /^trazo\s+make\s+(\S+)/.exec(seg);
            if (m) stats.lastMakeInput = m[1];
          }
        }
      } else if (b?.type === "tool_result") {
        const use = uses.get(b.tool_use_id);
        const cmd = use?.input?.command;
        if (use?.name !== "Bash" || typeof cmd !== "string") continue;
        const verbs = trazoVerbs(cmd);
        if (verbs.length === 0 || denied(b)) continue;
        const failed = b.is_error === true || /^Exit code [1-9]/.test(resultText(b.content));
        if (failed) {
          stats.failedCommands++;
          failedSeen = true;
        }
        if (verbs.includes("make") && !firstMakeSeen) {
          firstMakeSeen = true;
          stats.firstTryOk = !failed;
        }
      }
    }
  }
  return stats;
}
