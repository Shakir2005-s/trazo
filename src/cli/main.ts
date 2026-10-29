#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import { parse, resolve } from "node:path";
import { parseArgs } from "node:util";
import { check, make } from "../index.js";
import { formatIssues, hasErrors, suggest, type Issue } from "../validate/issues.js";
import { VERSION } from "../version.js";
import { readInput, writeAtomic } from "./io.js";
import { USAGE, UsageError } from "./usage.js";

const COMMANDS = ["make", "check"];

interface Options {
  out?: string | undefined;
  theme?: string | undefined;
  json?: boolean | undefined;
  help?: boolean | undefined;
  version?: boolean | undefined;
}

function parseCommandLine(argv: string[]): { options: Options; positionals: string[] } {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        out: { type: "string", short: "o" },
        theme: { type: "string" },
        json: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
    return { options: values, positionals };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const unknown = /Unknown option '([^']+)'/.exec(message);
    throw new UsageError(unknown ? `unknown option "${unknown[1]}"` : message.replace(/\. To specify.*$/, ""));
  }
}

function report(issues: Issue[], json: boolean, extra: Record<string, unknown> = {}): { out: string; err: string } {
  const ok = !hasErrors(issues);
  if (json) return { out: `${JSON.stringify({ ok, ...extra, issues })}\n`, err: "" };
  const text = issues.length > 0 ? `${formatIssues(issues)}\n` : "";
  return { out: ok ? (extra["output"] !== undefined ? `${extra["output"]}\n` : "ok\n") : "", err: text };
}

async function execute(argv: string[]): Promise<{ code: number; out: string; err: string }> {
  const { options, positionals } = parseCommandLine(argv);
  if (options.help) return { code: 0, out: USAGE, err: "" };
  if (options.version) return { code: 0, out: `${VERSION}\n`, err: "" };

  const [command, input, ...rest] = positionals;
  if (command === undefined) throw new UsageError("missing command");
  if (!COMMANDS.includes(command)) {
    const guess = suggest(command, COMMANDS);
    throw new UsageError(`unknown command "${command}"${guess ? ` (did you mean "${guess}"?)` : ""}`);
  }
  if (input === undefined) throw new UsageError("missing <input>");
  if (rest.length > 0) throw new UsageError(`unexpected argument "${rest[0]}"`);
  if (options.theme !== undefined && options.theme !== "light" && options.theme !== "dark") {
    throw new UsageError(`invalid --theme "${options.theme}" (use light or dark)`);
  }
  const json = options.json === true;

  if (command === "check") {
    if (options.out !== undefined) throw new UsageError('option "--out" only applies to make');
    if (options.theme !== undefined) throw new UsageError('option "--theme" only applies to make');
    const result = check(readInput(input));
    const { out, err } = report(result.issues, json);
    return { code: result.ok ? 0 : 1, out, err };
  }

  const toStdout = options.out === "-" || (options.out === undefined && input === "-");
  if (toStdout && json) throw new UsageError("--json cannot be combined with html on stdout");
  let target: string | undefined;
  if (!toStdout) {
    target = resolve(options.out ?? (() => {
      const { dir, name } = parse(resolve(input));
      return resolve(dir, `${name}.html`);
    })());
    if (input !== "-" && target === resolve(input)) throw new UsageError("output would overwrite the input");
  }

  const result = await make(readInput(input), options.theme === undefined ? {} : { theme: options.theme });
  if (!result.ok || result.html === undefined) {
    const { out, err } = report(result.issues, json);
    return { code: 1, out, err };
  }
  if (target === undefined) {
    const warnings = result.issues.length > 0 ? `${formatIssues(result.issues)}\n` : "";
    return { code: 0, out: result.html, err: warnings };
  }
  writeAtomic(target, result.html);
  const { out, err } = report(result.issues, json, { output: target });
  return { code: 0, out, err };
}

async function main(): Promise<void> {
  let result: { code: number; out: string; err: string };
  try {
    result = await execute(process.argv.slice(2));
  } catch (err) {
    if (err instanceof UsageError) {
      result = { code: 2, out: "", err: `error: ${err.message}\nrun "trazo --help" for usage\n` };
    } else {
      const message = err instanceof Error ? err.message : String(err);
      result = { code: 3, out: "", err: `error: internal: ${message}\n` };
    }
  }
  if (result.out) process.stdout.write(result.out);
  if (result.err) process.stderr.write(result.err);
  process.exitCode = result.code;
}

void main();
