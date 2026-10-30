// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

export function estimateTokens(text: string): number;
export function median(numbers: number[]): number;
export interface SynthArchitecture {
  type: "architecture";
  title: string;
  theme: "light" | "dark";
  nodes: { id: string; label: string; kind: string }[];
  groups: { id: string; label: string; children: string[] }[];
  edges: string[];
}
export function synthArchitecture(n?: number): SynthArchitecture;
export interface AgentRun {
  task: string;
  condition: string;
  run: number;
  inputTokens: number;
  outputTokens: number;
  failedCommands: number;
  repairs: number;
  firstTryOk: boolean;
  finalOk: boolean;
  seconds: number;
  notes?: string;
}
export interface ConditionSummary {
  runs: number;
  firstTryRate: number;
  medianRepairs: number;
  medianInputTokens: number;
  medianOutputTokens: number;
  medianSeconds: number;
}
export function summarize(runs: AgentRun[]): Record<string, ConditionSummary>;
