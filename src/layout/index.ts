// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import type { Diagram } from "../model/index.js";
import type { Scene } from "../scene.js";
import { layoutArchitecture } from "./architecture.js";
import { layoutErd } from "./erd.js";
import { layoutSequence } from "./sequence.js";
import { layoutWorkflow } from "./workflow.js";

export function layoutDiagram(diagram: Diagram): Promise<Scene> {
  if (diagram.type === "sequence") return Promise.resolve(layoutSequence(diagram));
  if (diagram.type === "erd") return layoutErd(diagram);
  return diagram.type === "workflow" ? layoutWorkflow(diagram) : layoutArchitecture(diagram);
}
