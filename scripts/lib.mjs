// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

export function packageDir(name) {
  return dirname(require.resolve(`${name}/package.json`));
}

export function packageInfo(name) {
  return JSON.parse(readFileSync(join(packageDir(name), "package.json"), "utf8"));
}

export function readPackageFile(name, file) {
  return readFileSync(join(packageDir(name), file), "utf8").replace(/\r\n/g, "\n");
}

/**
 * Writes a generated file, or with --check fails when the committed copy is
 * stale. Keeps generated sources reviewable and reproducible.
 */
export function emit(path, content) {
  const check = process.argv.includes("--check");
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (check) {
    if (current !== content) {
      console.error(`${path} is out of date; run npm run gen`);
      process.exitCode = 1;
    }
    return;
  }
  if (current !== content) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  console.log(`${path} ${current === content ? "unchanged" : "written"}`);
}
