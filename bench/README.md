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

The first four are deterministic and run from this repository. The last row needs an agent and is recorded by hand.

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

For every run:

1. Start a new session so nothing carries over.
2. Give the agent the task `prompt` from `tasks.json`, unchanged.
3. Note the input and output tokens and the wall-clock seconds reported by the agent harness.
4. Count failed commands, repairs and whether the first `make` worked.

Save the runs as `bench/results/<YYYY-MM-DD>-agent-<agent>.json`:

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
- `firstTryOk`: the first `make` exited with 0.
- `finalOk`: an HTML file was produced.

Run `node scripts/bench.mjs --summary <file>` to get, per condition, the number of runs, the first-try rate and the medians of repairs, input tokens, output tokens and seconds.

## Results

No agent numbers exist yet. This table is filled only with measured runs, each row naming the agent, the model and the date.

| Agent | Model | Date | Condition | Runs | First-try rate | Median repairs | Median input tokens | Median output tokens | Median seconds |
|---|---|---|---|---|---|---|---|---|---|
| none yet | | | | | | | | | |

Deterministic results are in `bench/results/*-deterministic.json`.

## Limits

- Agents are not deterministic. Three runs per task and condition show a trend, not a guarantee.
- Timings depend on the machine, the Node version and background load. Compare numbers from the same machine only.
- Token counts in the deterministic part are estimates (characters / 4), not a real tokenizer.
