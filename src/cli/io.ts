// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { UsageError } from "./usage.js";

export function readInput(input: string): string {
  try {
    return readFileSync(input === "-" ? 0 : input, "utf8");
  } catch {
    throw new UsageError(input === "-" ? "cannot read stdin" : `cannot read "${input}"`);
  }
}

/** Temp file in the target directory so the rename never crosses a device. */
export function writeAtomic(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(tmp, content);
    renameSync(tmp, path);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // nothing was written
    }
    throw err;
  }
}
