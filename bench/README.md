# trazo benchmark

This folder holds the benchmark for trazo: what an agent must read before it can draw a diagram, how long a large diagram takes to build, and how often an agent gets a diagram right.

## What it measures

| Metric | Target | How |
|---|---|---|
| Reading cost per type | under 2,000 tokens | skill body + `trazo schema <type>` + `trazo example <type>`, estimated as characters / 4 |
| `make` time, 50 nodes | under 1,000 ms | synthetic architecture diagram, 5 runs after one warm-up, median; the target applies to the in-process time, the CLI time is reported alongside |
| HTML size | at most 300 KB | the four examples and the 50-node diagram |
| Determinism | byte-identical | two `make` runs on the same JSON |
| First-try success, repairs, tokens, seconds | no fixed target | real agent runs, see below |

The first four are deterministic and run from this repository. The last row needs an agent and is recorded by the agent runner.

## Run the deterministic part

```sh
npm run build
npm run bench
```

The script reads `dist/`, prints a table, and writes `bench/results/<YYYY-MM-DD>-deterministic.json`. Options:

- `--runs N` sets the number of timed runs (default 5).
- `--no-write` prints the table without writing a file.
- `--summary <file>` prints the per-condition summary of an agent result file.

The script exits with 1 if any output differs between two runs or any HTML file is over 300 KB. The time target is reported, not enforced, because timings depend on the machine.

The `make` target measures trazo itself: validation, layout and rendering, called in-process. The CLI time adds starting Node and loading the modules, close to one second on its own (elkjs alone takes about half of it), so a single CLI call stays above one second even for small diagrams. It is recorded so start-up regressions stay visible, but it is not held to the target.

## Agent runs

`tasks.json` lists 8 tasks, two per diagram type. Each task is run 3 times under two conditions, which gives 48 runs per agent and model:

- `skill`: the trazo skill is installed.
- `no-skill`: no skill; the agent only has `trazo --help`.

Runs are driven by `bench/run-agent.mjs`, which uses the Claude Code CLI in headless mode. A real run spends model quota, so it is never part of `npm test` or CI.

Pilot (one task, skill condition, one run):

```sh
npm run build
node bench/run-agent.mjs --model claude-sonnet-5-5 --task arch-shop --condition skill --runs 1
```

Preview the exact command lines without running anything by adding `--dry-run`. Full set (8 tasks x 2 conditions x 3 runs = 48 runs):

```sh
node bench/run-agent.mjs --model claude-sonnet-5-5
```

Options:

- `--model <id>` is required.
- `--task <id>` can be repeated; the default is every task in `tasks.json`.
- `--condition skill|no-skill|both` (default `both`) and `--runs N` (default 3).
- `--out <file>` (default `bench/results/<YYYY-MM-DD>-agent-claude-code.json`).
- `--agent-cmd <path>` replaces the `claude` command; a `.mjs` or `.js` path is run with Node. Tests use it to inject a fake agent.
- `--timeout <seconds>` per run (default 600). A run that times out is recorded with a note.
- `--resume` skips runs already in the output file. Each run is written to the file as soon as it ends, so an interrupted session keeps its results.
- `--sandbox-root <dir>` moves the sandboxes (default `tmp/bench-runs`).

What is isolated, for every run:

- A new sandbox directory `tmp/bench-runs/<task>-<condition>-<n>/` is the working directory. It is deleted and recreated if it already exists.
- The agent is started with `--setting-sources project`, so user and local settings and skills are not loaded, and with `--strict-mcp-config`, so no MCP server is available.
- `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` and `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` are set, because `--setting-sources` does not stop the user's own `~/.claude/CLAUDE.md` or auto memory from loading. `--bare` would also skip them, but it only accepts an API key, not a signed-in account.
- `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` is set, because the sandboxes sit inside this repository: without it the agent sees the trazo repo's git status and history in its system prompt.
- The only tools are `Read`, `Write`, `Edit` and `Bash(trazo:*)`: Bash can run `trazo` and nothing else.
- `trazo` is a small shim on `PATH` that runs `dist/cli/main.js` from this checkout.
- Condition `skill`: `skill/SKILL.md` is copied to `.claude/skills/trazo/SKILL.md` in the sandbox. Condition `no-skill`: nothing is added; the prompt only says that `trazo` exists and that `trazo --help` explains it.
- The prompt is the task text from `tasks.json` plus one fixed sentence asking for `diagram.html` in the current directory. It is the same for both conditions.

Each sandbox keeps `stream.jsonl` (the raw agent output, for audit) and `stderr.log`. The runner fills the record itself: tokens from the final `result` message, failed commands and repairs from the tool calls, `seconds` from the wall clock, and `finalOk` by running `trazo check` on the final JSON after the agent ends.

The runner saves the runs as `bench/results/<YYYY-MM-DD>-agent-<agent>.json`:

```json
{
  "kind": "agent",
  "date": "2026-01-01",
  "trazoVersion": "0.1.0",
  "agent": "name of the agent",
  "model": "name of the model",
  "runsPerTask": 3,
  "runs": [
    {
      "task": "arch-shop",
      "condition": "skill",
      "run": 1,
      "inputTokens": 0,
      "outputTokens": 0,
      "cacheCreationTokens": 0,
      "cacheReadTokens": 0,
      "failedCommands": 0,
      "repairs": 0,
      "firstTryOk": true,
      "finalOk": true,
      "seconds": 0,
      "notes": "optional"
    }
  ]
}
```

- `failedCommands`: number of `check` or `make` calls that exited with a non-zero code.
- `repairs`: number of edits to the JSON after the first failure.
- `firstTryOk`: the first `make` exited with 0. A chained call such as `trazo check x && trazo make x` counts as that `make`. A call the sandbox refused (an error without `Exit code N`) is not counted, because trazo never ran.
- `finalOk`: `diagram.html` exists and `trazo check` passes on the final JSON.
- `cacheCreationTokens` and `cacheReadTokens` are reported separately from `inputTokens` and are 0 if the agent does not report them. With prompt caching `inputTokens` is only the uncached part, a few dozen tokens; the summary also gives the median total input (uncached + cache creation + cache read), which is what a run actually read.

Run `node scripts/bench.mjs --summary <file>` to get, per condition, the number of runs, the first-try and final success rates, and the medians of repairs, uncached and total input tokens, output tokens and seconds.

## Results

This table is filled only with measured runs, each row naming the agent, the model and the date.

| Agent | Model | Date | Condition | Runs | First-try rate | Final success | Median repairs | Median total input tokens | Median output tokens | Median seconds |
|---|---|---|---|---|---|---|---|---|---|---|
| Claude Code 2.1.308 | claude-sonnet-5-5 | 2026-10-31 | skill | 24 | 100% | 100% | 0 | 106,483 | 1,658 | 22.1 |
| Claude Code 2.1.308 | claude-sonnet-5-5 | 2026-10-31 | no-skill | 24 | 100% | 100% | 0 | 105,205 | 1,693 | 22.7 |

| Claude Code 2.1.308 | claude-haiku-4-5 | 2026-10-31 | skill | 24 | 71% | 88% | 0 | 158,490 | 2,461 | 30.3 |
| Claude Code 2.1.308 | claude-haiku-4-5 | 2026-10-31 | no-skill | 24 | 71% | 92% | 0 | 139,241 | 1,988 | 25.8 |

The task prompts were reworded as requests ("Draw a sequence diagram of ...") after the Haiku 4.5 runs, so the four rows above used the earlier wording. The rows below were run after that change and after the CLI and schema hints (milestone H7):

| Agent | Model | Date | Condition | Runs | First-try rate | Final success | Median repairs | Median total input tokens | Median output tokens | Median seconds |
|---|---|---|---|---|---|---|---|---|---|---|
| Claude Code 2.1.308 | claude-sonnet-5-5 | 2026-10-31 | skill | 24 | 100% | 100% | 0 | 114,992 | 1,381 | 20.5 |
| Claude Code 2.1.308 | claude-sonnet-5-5 | 2026-10-31 | no-skill | 24 | 100% | 100% | 0 | 123,700 | 1,669 | 22.3 |
| Claude Code 2.1.308 | claude-haiku-4-5 | 2026-10-31 | skill | 24 | 96% | 100% | 0 | 152,209 | 2,551 | 30.4 |
| Claude Code 2.1.308 | claude-haiku-4-5 | 2026-10-31 | no-skill | 24 | 92% | 100% | 0 | 127,893 | 1,997 | 24.9 |

Raw runs: `bench/results/2026-10-31-agent-claude-code.json` (Sonnet) and `bench/results/2026-10-31-agent-claude-code-haiku-4-5.json` (Haiku) for the first rows; `bench/results/2026-10-31-agent-claude-code-sonnet-5-5-rerun.json` and `bench/results/2026-10-31-agent-claude-code-haiku-4-5-rerun.json` for the rerun.

What this says: with this model, `trazo --help`, `trazo schema` and `trazo example` are enough to get a valid diagram on the first `make`, with or without the skill. No run failed a `trazo` command. The skill did not make runs cheaper or faster; the two conditions are within about 1% on tokens and seconds. Its value is that the agent knows trazo exists and when to reach for it, which these tasks do not measure, because the prompt already names the command.

With Haiku 4.5 the numbers drop below the v1 target of 90% first-try success, again with no gain from the skill. Reading every failed run, the misses fall in four groups:

- The agent never started (4 runs, all `seq-oauth`): it read the task as context and asked what to draw. The task prompts are short descriptions, not requests; Sonnet took them as requests, Haiku did not always.
- `trazo <file>` without `make` (5 runs): the CLI answers `unknown command`, and the agent fixes it on the next call.
- Guessed sequence fields (5 runs): `actors` and `interactions` instead of `participants` and `messages`, and `over` as a string instead of a list (2 runs). The error messages name the allowed fields, and every one of these runs recovered.
- Workflow lanes (4 runs): a step left out of every lane or listed in two. The message says what to do and one edit fixed it.

One skill run wrote its JSON inside the skill's own folder, which the sandbox refused, and ended without a diagram.

After H7 (request-worded prompts, `trazo <file>` and `--output` hints, a hint for a missing top-level field, `over` accepted as a string), Haiku 4.5 reaches 96% first-try success with the skill and 92% without, and every run ends with a valid diagram. Three runs missed the first `make` (`arch-monorepo` skill, `wf-expenses` no-skill, `seq-oauth` no-skill); each failed one command and recovered with one edit. Their `stream.jsonl` files are gone: the Sonnet rerun used the same sandbox directories right after, so the cause of these three misses was not recorded. Sonnet 5.5 stays at 100%. The skill still makes runs neither cheaper nor more successful on these tasks.

On 2026-11-02 the skill gained a step about content (read the code first and draw only what you found, one level of detail, ask when the scope is unclear, `source` as `path:line`). Haiku 4.5 was rerun on the skill condition only, since the no-skill condition did not change:

| Agent | Model | Date | Condition | Runs | First-try rate | Final success | Median repairs | Median total input tokens | Median output tokens | Median seconds |
|---|---|---|---|---|---|---|---|---|---|---|
| Claude Code 2.1.308 | claude-haiku-4-5 | 2026-11-02 | skill | 24 | 92% | 100% | 0 | 132,770 | 2,575 | 28.9 |

Raw runs: `bench/results/2026-11-02-agent-claude-code-haiku-4-5-skill-content.json`. That is 22 of 24 against 23 of 24 before, a difference of one run, within the spread of three runs per task. No run asked a question instead of drawing. Both misses wrote the JSON without running `trazo example`: `arch-monorepo` never loaded the skill and used an edge arrow that does not exist (`<-~>`); `erd-blog` loaded it and guessed `kind`, `name` and `fields` instead of `type`, `id` and `columns`. Each recovered from the error messages. These tasks give the content in the prompt, so they check that the longer skill does not hurt the format; they do not measure whether diagrams of real code get better.

Two no-skill runs were first recorded with `firstTryOk: false`: the agent chained `trazo make` with an `rm` that the sandbox refused, then ran `make` again and it passed. The parser was fixed to skip refused calls only, and every run was recomputed from its `stream.jsonl`; only those two values changed.

Deterministic results are in `bench/results/*-deterministic.json`.

## Limits

- Sandboxes are named by task, condition and run, not by model, so a second model run in the default `--sandbox-root` replaces the first model's `stream.jsonl` files. Pass a separate `--sandbox-root` per model to keep both.
- Agents are not deterministic. Three runs per task and condition show a trend, not a guarantee.
- Timings depend on the machine, the Node version and background load. Compare numbers from the same machine only.
- Token counts in the deterministic part are estimates (characters / 4), not a real tokenizer.
