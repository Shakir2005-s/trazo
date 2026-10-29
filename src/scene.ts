// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextBlock {
  lines: string[];
  x: number;
  /** Baseline of the first line. */
  y: number;
  size: number;
  weight: 400 | 600;
  anchor: "start" | "middle";
}

export type NodeShape = "box" | "pill" | "end" | "diamond" | "subprocess";

export interface SceneNode extends Box {
  id: string;
  kind: string;
  /** Lucide icon name. */
  icon?: string;
  shape: NodeShape;
  label: TextBlock;
  note?: string;
  source?: string;
}

export interface SceneGroup extends Box {
  id: string;
  label: TextBlock;
  depth: number;
  variant: "group" | "lane";
  /** Width of the label column at the left of a lane band. */
  header?: number;
}

export interface SceneEdge {
  id: string;
  from: string;
  to: string;
  points: Point[];
  style: "sync" | "async" | "data";
  label?: { box: Box; text: TextBlock };
}

export interface Scene {
  type: string;
  title: string;
  description?: string;
  theme: "light" | "dark";
  width: number;
  height: number;
  /** Outer groups come before the groups they contain. */
  groups: SceneGroup[];
  nodes: SceneNode[];
  edges: SceneEdge[];
}
