# @foldkit/markdown

## 0.1.1

### Patch Changes

- c94b028: Reword the package tagline: write markdown files, get Foldkit views with live islands.

## 0.1.0

### Minor Changes

- e818ee9: New package: markdown compiled at build time into typed Foldkit views. The Vite plugin (`@foldkit/markdown/vite`) parses imported `.md` files with remark, validates them against an Effect Schema vocabulary (CommonMark minus raw HTML, plus GFM tables, strikethrough, and directives), and emits typed document modules, so no parser ships to the browser. The runtime entry ships the AST schemas, `decodeDocument`, and a `view` fold with unstyled semantic defaults, per-node view overrides, and island directives that place live application views, including stateful Submodels, between paragraphs. Islands declare their attributes as Schema structs: the plugin's `islands` option validates every directive against them at build time (unknown names, unknown attributes, and malformed values all fail with file and line), and `islandsFor` pairs the same definitions with typed views whose attributes arrive already decoded.
