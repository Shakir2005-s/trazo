---
name: trazo
description: Use when the user asks for an architecture, workflow, ERD or sequence diagram, or an interactive HTML diagram. trazo turns semantic JSON into a laid-out, self-contained HTML file.
license: Apache-2.0
---

1. Pick the type from the request: architecture (components and links), workflow (steps and decisions), erd (tables and foreign keys), sequence (messages between actors).
2. Run `trazo example <type>` and edit that JSON. Run `trazo schema <type>` only when you need a field the example does not show.
3. Never write positions, sizes or colors. Describe the content with `label`, `kind`, `note` and `source`; layout is automatic.
4. Run `trazo check <file>`. Then run `trazo make <file> -o <path>.html` and tell the user the path.
5. If `check` reports errors, each line gives a path and a hint. Fix every listed problem, apply any "did you mean" suggestion, and run `check` again. Edit the file in place; do not rewrite it.
6. Geometry warnings go to stderr and do not fail the run. For `text-overflow` and `label-overlap`, shorten the label. For `edge-through-node` and `node-overlap`, change `direction`, group related nodes or split the diagram. `outside-canvas` and `outside-group` are defects in the tool: do not chase them.
7. Over about 40 nodes, split into several diagrams.
