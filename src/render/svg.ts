// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import type { Box, Scene, SceneEdge, SceneGroup, SceneNode, TextBlock } from "../scene.js";
import { lineHeight } from "../text/measure.js";
import { ICONS } from "./generated/icons.js";
import { SVG_CSS } from "./theme.js";

const ICON_SIZE = 20;
const ICON_PAD = 12;
const CORNER = 8;

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const num = (n: number) => String(Math.round(n * 100) / 100);

function text(block: TextBlock, cls: string): string {
  const step = lineHeight(block.size);
  const spans = block.lines
    .map((line, i) => `<tspan x="${num(block.x)}" dy="${i === 0 ? 0 : num(step)}">${escapeXml(line)}</tspan>`)
    .join("");
  const anchor = block.anchor === "middle" ? ' text-anchor="middle"' : "";
  return `<text class="t-text ${cls}" x="${num(block.x)}" y="${num(block.y)}" font-size="${block.size}" font-weight="${block.weight}"${anchor}>${spans}</text>`;
}

const rect = (b: Box, cls: string, rx = CORNER) =>
  `<rect class="${cls}" x="${num(b.x)}" y="${num(b.y)}" width="${num(b.w)}" height="${num(b.h)}" rx="${rx}"/>`;

function group(g: SceneGroup): string {
  return `<g class="t-group" data-id="${escapeXml(g.id)}">${rect(g, "t-group-box")}${text(g.label, "t-group-title")}</g>`;
}

function edge(e: SceneEdge): string {
  const d = e.points.map((p, i) => `${i === 0 ? "M" : "L"}${num(p.x)} ${num(p.y)}`).join(" ");
  return `<path class="t-edge t-edge-${e.style}" data-from="${escapeXml(e.from)}" data-to="${escapeXml(e.to)}" d="${d}" marker-end="url(#t-arrowhead)"/>`;
}

function edgeLabel(e: SceneEdge): string {
  if (!e.label) return "";
  return `<g class="t-edge-label" data-edge="${escapeXml(e.id)}">${rect(e.label.box, "t-label-bg", 3)}${text(e.label.text, "t-label")}</g>`;
}

function icon(node: SceneNode): string {
  const markup = ICONS[node.icon];
  if (markup === undefined) return "";
  const y = node.y + (node.h - ICON_SIZE) / 2;
  return `<svg class="t-icon t-icon-${escapeXml(node.kind)}" x="${num(node.x + ICON_PAD)}" y="${num(y)}" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${markup}</svg>`;
}

function node(n: SceneNode): string {
  const tip = [n.note, n.source].filter((s): s is string => s !== undefined && s !== "").join("\n");
  const title = tip ? `<title>${escapeXml(tip)}</title>` : "";
  return `<g class="t-node" data-id="${escapeXml(n.id)}" data-kind="${escapeXml(n.kind)}" tabindex="0">${title}${rect(n, "t-node-box")}${icon(n)}${text(n.label, "t-node-label")}</g>`;
}

export function renderSvg(scene: Scene): string {
  const desc = scene.description ? `<desc id="t-desc">${escapeXml(scene.description)}</desc>` : "";
  const labelled = scene.description ? "t-title t-desc" : "t-title";
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" class="diagram" viewBox="0 0 ${num(scene.width)} ${num(scene.height)}" role="img" aria-labelledby="${labelled}">`,
    `<title id="t-title">${escapeXml(scene.title)}</title>`,
    desc,
    `<defs><marker id="t-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path class="t-arrow" d="M0 1L10 5L0 9z"/></marker></defs>`,
    `<style>${SVG_CSS}</style>`,
    ...scene.groups.map(group),
    ...scene.edges.map(edge),
    ...scene.edges.map(edgeLabel),
    ...scene.nodes.map(node),
    "</svg>",
  ];
  return parts.filter(Boolean).join("\n");
}

