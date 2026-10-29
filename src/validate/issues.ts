// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

export type Severity = "error" | "warning";

export interface Issue {
  severity: Severity;
  /** Stable identifier, e.g. "schema/enum" or "ref/unknown-node". */
  code: string;
  path: string;
  message: string;
  hint?: string;
}

export const MAX_REPORTED = 20;

export function hasErrors(issues: readonly Issue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}

export function formatPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return "$";
  let out = "";
  for (const key of path) {
    if (typeof key === "number") out += `[${key}]`;
    else out += out === "" ? String(key) : `.${String(key)}`;
  }
  return out;
}

export function formatIssue(issue: Issue): string {
  const label = issue.severity === "error" ? "error " : "warn  ";
  const hint = issue.hint ? ` → ${issue.hint}` : "";
  return `${label} ${issue.path}: ${issue.message}${hint}`;
}

export function formatIssues(issues: readonly Issue[], max = MAX_REPORTED): string {
  const lines = issues.slice(0, max).map(formatIssue);
  if (issues.length > max) lines.push(`… and ${issues.length - max} more`);
  return lines.join("\n");
}

/**
 * Closest candidate by edit distance, or undefined when nothing is plausibly
 * what the author meant. The budget grows with the word so short ids do not
 * produce wild guesses.
 */
export function suggest(value: string, candidates: Iterable<string>): string | undefined {
  const needle = value.toLowerCase();
  const budget = Math.max(1, Math.floor(needle.length / 3));
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = editDistance(needle, candidate.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return bestDistance <= budget ? best : undefined;
}

export function didYouMean(value: string, candidates: Iterable<string>): string | undefined {
  const match = suggest(value, candidates);
  return match === undefined ? undefined : `did you mean "${match}"?`;
}

/** Levenshtein plus adjacent swaps, the most common typo ("lable"). */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        row[j] = j;
        continue;
      }
      const above = rows[i - 1]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(above[j]! + 1, row[j - 1]! + 1, above[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, rows[i - 2]![j - 2]! + 1);
      }
      row[j] = best;
    }
    rows.push(row);
  }
  return rows[a.length]![b.length]!;
}
