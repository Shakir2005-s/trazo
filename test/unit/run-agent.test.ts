// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  agentEnv,
  buildAgentArgs,
  buildPrompt,
  parseArgs,
  parseStream,
  planRuns,
  runName,
  shimFiles,
} from "../../bench/run-agent-lib.mjs";

const root = resolve(__dirname, "../..");
const tasks = ["arch-shop", "wf-expenses"];
const line = (o: unknown) => JSON.stringify(o);
const bash = (id: string, command: string) =>
  line({ type: "assistant", message: { content: [{ type: "tool_use", id, name: "Bash", input: { command } }] } });
const write = (id: string, file: string) =>
  line({ type: "assistant", message: { content: [{ type: "tool_use", id, name: "Write", input: { file_path: file, content: "{}" } }] } });
const edit = (id: string, file: string) =>
  line({ type: "assistant", message: { content: [{ type: "tool_use", id, name: "Edit", input: { file_path: file } }] } });
const res = (id: string, content: string, isError = false) =>
  line({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id, content, is_error: isError }] } });
const result = (extra: object = {}) =>
  line({
    type: "result",
    subtype: "success",
    is_error: false,
    usage: { input_tokens: 120, output_tokens: 45, cache_creation_input_tokens: 300, cache_read_input_tokens: 700 },
    ...extra,
  });

describe("parseStream", () => {
  it("reads check and make chained in one Bash call", () => {
    const text = [
      write("a", "/s/shop.json"),
      res("a", "ok"),
      bash("b", "trazo check shop.json && trazo make shop.json -o diagram.html"),
      res("b", "ok\nC:/s/diagram.html"),
      result(),
    ].join("\n");
    const stats = parseStream(text);
    expect(stats.firstTryOk).toBe(true);
    expect(stats.failedCommands).toBe(0);
    expect(stats.lastMakeInput).toBe("shop.json");
  });

  it("counts a failed chained call once and not as a first-try make", () => {
    const text = [
      bash("b", "trazo check shop.json && trazo make shop.json -o diagram.html"),
      res("b", "Exit code 1\nerror  nodes[0]: ...", true),
      edit("c", "/s/shop.json"),
      bash("d", "trazo check shop.json && trazo make shop.json -o diagram.html"),
      res("d", "ok"),
      result(),
    ].join("\n");
    const stats = parseStream(text);
    expect(stats.failedCommands).toBe(1);
    expect(stats.repairs).toBe(1);
    expect(stats.firstTryOk).toBe(false);
  });

  it("ignores a denied call that mixes other commands with trazo", () => {
    const text = [
      bash("a", "cat > shop.json <<'EOF'\n{}\nEOF\ntrazo make shop.json -o diagram.html"),
      res("a", "Contains brace with quote character (expansion obfuscation)", true),
      write("b", "/s/shop.json"),
      bash("c", "trazo make shop.json -o diagram.html"),
      res("c", "C:/s/diagram.html"),
      result(),
    ].join("\n");
    const stats = parseStream(text);
    expect(stats.failedCommands).toBe(0);
    expect(stats.repairs).toBe(0);
    expect(stats.firstTryOk).toBe(true);
  });

  it("counts a clean first-try run", () => {
    const text = [
      line({ type: "system", subtype: "init" }),
      write("a", "/s/diagram.json"),
      res("a", "ok"),
      bash("b", "trazo check diagram.json"),
      res("b", "ok"),
      bash("c", "trazo make diagram.json -o diagram.html"),
      res("c", "wrote diagram.html"),
      result(),
    ].join("\n");
    expect(parseStream(text)).toEqual({
      inputTokens: 120,
      outputTokens: 45,
      cacheCreationTokens: 300,
      cacheReadTokens: 700,
      failedCommands: 0,
      repairs: 0,
      firstTryOk: true,
      hasResult: true,
      resultIsError: false,
      lastMakeInput: "diagram.json",
    });
  });

  it("counts one failed check, one repair, then success", () => {
    const text = [
      bash("a", "trazo check diagram.json"),
      res("a", "Exit code 1\nnodes.0.kind: unknown", true),
      edit("b", "/s/diagram.json"),
      res("b", "ok"),
      write("w", "/s/notes.md"),
      bash("c", "trazo check diagram.json"),
      res("c", "ok"),
      bash("d", "trazo make diagram.json -o diagram.html"),
      res("d", "wrote"),
      result(),
    ].join("\n");
    const stats = parseStream(text);
    expect(stats.failedCommands).toBe(1);
    expect(stats.repairs).toBe(1);
    expect(stats.firstTryOk).toBe(true);
  });

  it("treats a make that fails first as not first try, and detects failure by exit text", () => {
    const text = [
      bash("a", "trazo make d.json -o d.html"),
      res("a", "Exit code 1\nerror", false),
      write("b", "d.json"),
      bash("c", "trazo make d.json -o d.html"),
      res("c", "wrote"),
      bash("e", "ls"),
      res("e", "Exit code 2", true),
      result(),
    ].join("\n");
    const stats = parseStream(text);
    expect(stats.firstTryOk).toBe(false);
    expect(stats.failedCommands).toBe(1);
    expect(stats.repairs).toBe(1);
  });

  it("does not count json edits before the first failure", () => {
    const text = [write("a", "d.json"), edit("b", "d.json"), bash("c", "trazo make d.json"), res("c", "ok"), result()].join("\n");
    expect(parseStream(text).repairs).toBe(0);
  });

  it("returns zeros when there is no result message (timeout) and ignores bad lines", () => {
    const text = ["not json", bash("a", "trazo check d.json"), "{broken"].join("\n");
    expect(parseStream(text)).toEqual({
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
    });
    expect(parseStream("").hasResult).toBe(false);
  });
});

describe("parseArgs", () => {
  it("applies the defaults", () => {
    const o = parseArgs(["--model", "m1"], tasks, "2026-11-01");
    expect(o).toMatchObject({
      model: "m1",
      tasks,
      conditions: ["skill", "no-skill"],
      runs: 3,
      agentCmd: "claude",
      timeout: 600,
      dryRun: false,
      resume: false,
    });
    expect(o.out.replace(/\\/g, "/")).toMatch(/bench\/results\/2026-11-01-agent-claude-code\.json$/);
  });

  it("reads every option", () => {
    const o = parseArgs(
      ["--model", "m", "--task", "wf-expenses", "--task", "arch-shop", "--condition", "skill", "--runs", "1", "--out", "x.json", "--agent-cmd", "fake", "--timeout", "5", "--dry-run", "--resume"],
      tasks,
      "2026-11-01",
    );
    expect(o).toMatchObject({ tasks: ["wf-expenses", "arch-shop"], conditions: ["skill"], runs: 1, out: "x.json", agentCmd: "fake", timeout: 5, dryRun: true, resume: true });
  });

  it("rejects bad input with a clear message", () => {
    expect(() => parseArgs([], tasks, "d")).toThrow("--model is required");
    expect(() => parseArgs(["--model", "m", "--task", "nope"], tasks, "d")).toThrow("unknown task: nope");
    expect(() => parseArgs(["--model", "m", "--condition", "x"], tasks, "d")).toThrow("--condition must be skill, no-skill or both");
    expect(() => parseArgs(["--model", "m", "--runs", "0"], tasks, "d")).toThrow("--runs needs a positive integer");
    expect(() => parseArgs(["--model", "m", "--bogus"], tasks, "d")).toThrow("unknown option: --bogus");
    expect(() => parseArgs(["--model"], tasks, "d")).toThrow("--model needs a value");
  });
});

describe("plan and command", () => {
  it("plans task x condition x run in a stable order and names sandboxes", () => {
    const plan = planRuns(["a", "b"], ["skill", "no-skill"], 2);
    expect(plan).toHaveLength(8);
    expect(plan[0]).toEqual({ task: "a", condition: "skill", run: 1 });
    expect(runName(plan[3] as never)).toBe("a-no-skill-2");
  });

  it("builds the prompt and the fixed claude arguments", () => {
    const prompt = buildPrompt("Draw a thing.");
    expect(prompt.startsWith("Draw a thing.")).toBe(true);
    expect(prompt).toContain("diagram.html");
    expect(prompt).toContain("`trazo`");
    expect(prompt.toLowerCase()).not.toContain("skill");
    expect(buildAgentArgs("P", "m1")).toEqual([
      "-p", "P", "--model", "m1", "--setting-sources", "project", "--strict-mcp-config",
      "--allowedTools", "Read", "Write", "Edit", "Bash(trazo:*)",
      "--output-format", "stream-json", "--verbose",
    ]);
  });

  it("isolates the agent from user CLAUDE.md and auto memory and puts the shim first on PATH", () => {
    const base = { Path: "C:\\bin", HOME: "/h" };
    const env = agentEnv(base, "C:\\shim", "win32");
    expect(env).toEqual({
      Path: "C:\\shim;C:\\bin",
      HOME: "/h",
      CLAUDE_CODE_DISABLE_CLAUDE_MDS: "1",
      CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
    });
    expect(base).toEqual({ Path: "C:\\bin", HOME: "/h" });
    expect(agentEnv({}, "/shim", "linux").PATH).toBe("/shim:");
  });

  it("makes shims per platform", () => {
    const win = shimFiles("C:\\node.exe", "C:\\r\\dist\\cli\\main.js", "win32").map((f) => f.name);
    expect(win).toEqual(["trazo.cmd", "trazo"]);
    const nix = shimFiles("/usr/bin/node", "/r/dist/cli/main.js", "linux");
    expect(nix.map((f) => f.name)).toEqual(["trazo"]);
    expect(nix[0]?.content).toContain('exec "/usr/bin/node" "/r/dist/cli/main.js" "$@"');
  });
});

const script = join(root, "bench", "run-agent.mjs");
const work = mkdtempSync(join(tmpdir(), "trazo-run-agent-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));
const run = (args: string[]) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8", timeout: 120000 });

describe("run-agent.mjs", () => {
  it("dry-run prints the plan and the command lines and runs nothing", () => {
    const out = join(work, "dry.json");
    const r = run(["--model", "m1", "--task", "arch-shop", "--condition", "skill", "--runs", "1", "--dry-run", "--out", out, "--sandbox-root", join(work, "sb-dry")]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("arch-shop-skill-1");
    expect(r.stdout).toContain("claude -p");
    expect(r.stdout).toContain("--model m1");
    expect(r.stdout).toContain("--allowedTools Read Write Edit Bash(trazo:*)");
    expect(r.stdout).toContain("1 run(s) planned");
    expect(existsSync(out)).toBe(false);
    expect(existsSync(join(work, "sb-dry"))).toBe(false);
  });

  it("fails on a missing model with exit 2", () => {
    const r = run(["--dry-run"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("error: --model is required");
  });

  const hasDist = existsSync(join(root, "dist", "cli", "main.js"));
  it.skipIf(!hasDist)(
    "runs a fake agent end to end: sandbox, shim, skill copy, record, resume",
    () => {
      const fake = join(work, "fake-agent.mjs");
      writeFileSync(
        fake,
        [
          'import { execSync } from "node:child_process";',
          'import { existsSync, writeFileSync } from "node:fs";',
          'const sh = (c) => execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });',
          'writeFileSync("diagram.json", sh("trazo example architecture"));',
          'sh("trazo check diagram.json");',
          'sh("trazo make diagram.json -o diagram.html");',
          'const skill = existsSync(".claude/skills/trazo/SKILL.md");',
          "const out = (o) => console.log(JSON.stringify(o));",
          'out({ type: "assistant", message: { content: [{ type: "tool_use", id: "1", name: "Bash", input: { command: "trazo make diagram.json -o diagram.html" } }] } });',
          'out({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "1", content: "ok", is_error: false }] } });',
          'out({ type: "result", subtype: "success", is_error: false, result: "skill=" + skill + " args=" + process.argv.slice(2).join("|"), usage: { input_tokens: 10, output_tokens: 5 } });',
          "",
        ].join("\n"),
      );
      const out = join(work, "e2e.json");
      const sb = join(work, "sb");
      const args = ["--model", "m1", "--task", "arch-shop", "--runs", "1", "--agent-cmd", fake, "--out", out, "--sandbox-root", sb];
      const r = run(args);
      expect(r.status, r.stderr).toBe(0);

      const data = JSON.parse(readFileSync(out, "utf8"));
      expect(data).toMatchObject({ kind: "agent", agent: "claude-code", model: "m1", runsPerTask: 1 });
      expect(data.runs).toHaveLength(2);
      const by = Object.fromEntries(data.runs.map((x: { condition: string }) => [x.condition, x]));
      expect(by.skill).toMatchObject({ task: "arch-shop", run: 1, inputTokens: 10, outputTokens: 5, failedCommands: 0, repairs: 0, firstTryOk: true, finalOk: true });
      expect(by["no-skill"]).toMatchObject({ firstTryOk: true, finalOk: true });
      expect(typeof by.skill.seconds).toBe("number");

      expect(existsSync(join(sb, "arch-shop-skill-1", ".claude", "skills", "trazo", "SKILL.md"))).toBe(true);
      expect(existsSync(join(sb, "arch-shop-no-skill-1", ".claude"))).toBe(false);
      expect(existsSync(join(sb, "arch-shop-skill-1", "diagram.html"))).toBe(true);
      const stream = readFileSync(join(sb, "arch-shop-skill-1", "stream.jsonl"), "utf8");
      expect(stream).toContain("skill=true");
      expect(stream).toContain("--setting-sources|project");
      expect(readFileSync(join(sb, "arch-shop-no-skill-1", "stream.jsonl"), "utf8")).toContain("skill=false");
      expect(r.stdout).toContain("firstTryRate");

      const again = run([...args, "--resume"]);
      expect(again.status).toBe(0);
      expect(JSON.parse(readFileSync(out, "utf8")).runs).toHaveLength(2);
      expect(again.stdout).toContain("skipped");
    },
    120000,
  );

  it("records a failed run when the agent produces nothing", () => {
    const fake = join(work, "silent.mjs");
    writeFileSync(fake, "process.exit(0);\n");
    const out = join(work, "silent.json");
    const r = run(["--model", "m1", "--task", "arch-shop", "--condition", "no-skill", "--runs", "1", "--agent-cmd", fake, "--out", out, "--sandbox-root", join(work, "sb2")]);
    expect(r.status).toBe(0);
    const rec = JSON.parse(readFileSync(out, "utf8")).runs[0];
    expect(rec).toMatchObject({ finalOk: false, firstTryOk: false, inputTokens: 0 });
    expect(rec.notes).toContain("no result message");
  });
});
