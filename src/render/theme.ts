// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

import { FONT_FAMILY } from "../text/measure.js";

// Kerning and ligatures are off because the layout measures glyph advances
// one by one; any shaping would make rendered text drift from those widths.
const TEXT_RESET = `font-family: "${FONT_FAMILY}", system-ui, -apple-system, "Segoe UI", sans-serif; font-kerning: none; font-variant-ligatures: none; font-feature-settings: "kern" 0, "liga" 0, "calt" 0;`;

/** Rules for the diagram itself. Fallbacks keep a standalone SVG readable. */
export const SVG_CSS = `
.t-text { ${TEXT_RESET} fill: var(--t-text, #1f2933); }
.t-group-title { fill: var(--t-muted, #52606d); }
.t-group-box { fill: var(--t-group-fill, #f5f7fa); stroke: var(--t-group-stroke, #cbd2d9); stroke-width: 1; }
.t-node-box { fill: var(--t-node-fill, #ffffff); stroke: var(--t-node-stroke, #9aa5b1); stroke-width: 1.25; }
.t-node:focus { outline: none; }
.t-node:focus-visible .t-node-box { stroke: var(--t-accent, #2f6fdb); stroke-width: 2.5; }
.t-icon { color: var(--t-icon, #52606d); }
.t-icon-database, .t-icon-storage, .t-icon-cache { color: var(--t-icon-data, #2f6f6f); }
.t-icon-client, .t-icon-user, .t-icon-external { color: var(--t-icon-edge, #8a5a2b); }
.t-edge { fill: none; stroke: var(--t-edge, #2f6fdb); stroke-width: 1.5; stroke-linejoin: round; }
.t-edge-async { stroke-dasharray: 7 5; }
.t-edge-data { stroke-dasharray: 1.5 4.5; stroke-linecap: round; }
.t-arrow { fill: var(--t-edge, #2f6fdb); }
.t-label-bg { fill: var(--t-bg, #ffffff); stroke: none; }
.t-label { fill: var(--t-muted, #52606d); }
`;

const LIGHT = `--t-bg: #f4f5f7; --t-surface: #ffffff; --t-text: #1f2933; --t-muted: #52606d; --t-border: #d8dde3;
  --t-group-fill: #eceff3; --t-group-stroke: #c3cbd4; --t-node-fill: #ffffff; --t-node-stroke: #9aa5b1;
  --t-edge: #2f6fdb; --t-accent: #2f6fdb; --t-icon: #52606d; --t-icon-data: #2b7a6f; --t-icon-edge: #96602b;`;

const DARK = `--t-bg: #14171c; --t-surface: #1b1f26; --t-text: #e6e9ed; --t-muted: #9aa5b1; --t-border: #2c333d;
  --t-group-fill: #1a1e25; --t-group-stroke: #343c48; --t-node-fill: #20252d; --t-node-stroke: #4a5361;
  --t-edge: #6ea2f5; --t-accent: #6ea2f5; --t-icon: #9aa5b1; --t-icon-data: #5fc2b2; --t-icon-edge: #d49a5f;`;

export function pageCss(font400: string, font600: string): string {
  return `
/* Inter is embedded under the SIL Open Font License 1.1, Copyright 2016 The Inter Project Authors. */
@font-face { font-family: "${FONT_FAMILY}"; font-weight: 400; font-style: normal; font-display: swap; src: url(data:font/woff2;base64,${font400}) format("woff2"); }
@font-face { font-family: "${FONT_FAMILY}"; font-weight: 600; font-style: normal; font-display: swap; src: url(data:font/woff2;base64,${font600}) format("woff2"); }
:root, [data-theme="light"] { ${LIGHT} }
[data-theme="dark"] { ${DARK} }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { ${TEXT_RESET} background: var(--t-bg); color: var(--t-text); min-height: 100vh; display: flex; flex-direction: column; }
header { display: flex; align-items: flex-start; gap: 16px; padding: 16px 24px 12px; border-bottom: 1px solid var(--t-border); background: var(--t-surface); }
.heading { flex: 1; min-width: 0; }
h1 { margin: 0; font-size: 18px; font-weight: 600; line-height: 1.3; }
.desc { margin: 4px 0 0; font-size: 13px; line-height: 1.4; color: var(--t-muted); max-width: 80ch; }
.actions { display: flex; gap: 8px; }
button { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; padding: 0; border: 1px solid var(--t-border); border-radius: 8px; background: var(--t-surface); color: var(--t-muted); cursor: pointer; }
button:hover { color: var(--t-text); border-color: var(--t-muted); }
button:focus-visible { outline: 2px solid var(--t-accent); outline-offset: 2px; }
button svg { width: 18px; height: 18px; }
[data-theme="dark"] .i-moon, :root:not([data-theme="dark"]) .i-sun { display: none; }
.is-fullscreen .i-maximize, :root:not(.is-fullscreen) .i-minimize { display: none; }
main { flex: 1; overflow: auto; padding: 24px; }
.stage { margin: 0 auto; }
.stage svg.diagram { display: block; width: 100%; height: auto; max-height: calc(100vh - 140px); }
.is-fullscreen .stage { max-width: none !important; }
`;
}
