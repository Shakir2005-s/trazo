// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import { didYouMean, type Issue } from "./issues.js";

export interface RefKind {
  /** Word used in messages: `unknown <noun> "x"`. */
  noun: string;
  /** Issue code for unresolved references, e.g. "ref/unknown-node". */
  code: string;
}

/** Tracks claimed ids and reports duplicates and dangling references. */
export class IdRegistry {
  private readonly firstUse = new Map<string, string>();

  constructor(
    private readonly issues: Issue[],
    private readonly kind: RefKind,
  ) {}

  claim(id: string, path: string): void {
    const previous = this.firstUse.get(id);
    if (previous === undefined) {
      this.firstUse.set(id, path);
      return;
    }
    this.issues.push({
      severity: "error",
      code: "ref/duplicate-id",
      path,
      message: `duplicate id "${id}"`,
      hint: `first used at ${previous}`,
    });
  }

  has(id: string): boolean {
    return this.firstUse.has(id);
  }

  /**
   * Reports an unknown reference; returns true when it was unknown. `accept`
   * narrows what may be referenced (e.g. steps but not lanes).
   */
  unknown(id: string, path: string, accept?: ReadonlySet<string>): boolean {
    if (accept ? accept.has(id) : this.firstUse.has(id)) return false;
    const issue: Issue = {
      severity: "error",
      code: this.kind.code,
      path,
      message: `unknown ${this.kind.noun} "${id}"`,
    };
    const hint = didYouMean(id, accept ?? this.firstUse.keys());
    if (hint !== undefined) issue.hint = hint;
    this.issues.push(issue);
    return true;
  }
}
