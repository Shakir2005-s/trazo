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

/**
 * A failed write of `shown`: a file system error (it carries an OS code such as
 * EACCES) becomes a usage error naming the path and the cause; anything else is
 * a defect and passes through unchanged, so it stays an internal error.
 */
export function writeError(err: unknown, shown: string): Error {
  const code = (err as { code?: unknown } | null)?.code;
  if (err instanceof Error && typeof code === "string") return new UsageError(`cannot write "${shown}" (${code})`);
  return err instanceof Error ? err : new Error(String(err));
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
