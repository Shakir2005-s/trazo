// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import { didYouMean, type Issue } from "../validate/issues.js";
import { architectureSchema, buildArchitecture, type Architecture } from "./architecture.js";
import { describe, error_, fromZod } from "./common.js";

export type Diagram = Architecture;

export const DIAGRAM_TYPES = ["architecture"] as const;

export interface ValidationResult {
  diagram?: Diagram;
  issues: Issue[];
}

export function validateDiagram(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { issues: [error_("schema/type", "$", `expected an object, got ${describe(raw)}`)] };
  }
  const type = (raw as { type?: unknown }).type;
  const types: readonly string[] = DIAGRAM_TYPES;
  if (type === undefined) {
    return { issues: [error_("schema/required", "type", "missing", `use one of: ${types.join(", ")}`)] };
  }
  if (typeof type !== "string" || !types.includes(type)) {
    const hint = (typeof type === "string" && didYouMean(type, types)) || `use one of: ${types.join(", ")}`;
    return { issues: [error_("schema/enum", "type", `unknown value ${JSON.stringify(type)}`, hint)] };
  }

  const parsed = architectureSchema.safeParse(raw, { reportInput: true });
  if (!parsed.success) return { issues: fromZod(parsed.error, architectureSchema) };
  return buildArchitecture(parsed.data);
}
