// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import { describe, expect, it } from "vitest";
import { writeError } from "../../src/cli/io.js";
import { UsageError } from "../../src/cli/usage.js";

describe("writeError", () => {
  it("turns a file system error into a usage error that names the path and the cause", () => {
    const cause = Object.assign(new Error("EACCES: permission denied, open 'out.html.tmp-1'"), { code: "EACCES" });
    const err = writeError(cause, "out.html");
    expect(err).toBeInstanceOf(UsageError);
    expect(err.message).toBe('cannot write "out.html" (EACCES)');
  });

  it("passes any other error through unchanged, so it stays an internal error", () => {
    const bug = new TypeError("cannot read properties of undefined");
    expect(writeError(bug, "out.html")).toBe(bug);
  });
});
