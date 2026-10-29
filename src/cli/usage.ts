// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

export class UsageError extends Error {}

export const USAGE = `trazo: semantic JSON in, laid-out interactive HTML out

Usage:
  trazo make <input> [-o, --out <file>] [--theme light|dark] [--json]
  trazo check <input> [--json]

Commands:
  make     validate, lay out and write a self-contained HTML file
  check    validate only; writes nothing

Options:
  -o, --out <file>   output path (default: <input> with .html; "-" for stdout)
      --theme <t>    light or dark; overrides the diagram's theme
      --json         print one JSON line instead of plain text
  -h, --help         show this help
  -v, --version      print the version

<input> is a JSON file, or "-" to read stdin.
Exit codes: 0 ok, 1 invalid input, 2 usage error, 3 internal error.
`;
