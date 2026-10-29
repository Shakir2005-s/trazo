// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import { execSync } from "node:child_process";

export default function setup(): void {
  execSync("npm run build", { stdio: "pipe" });
}
