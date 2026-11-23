---
'@foldkit/markdown': patch
---

Parse markdown with `marked` instead of the unified and remark stack. `@foldkit/markdown` now installs three packages (`marked`, `decode-named-character-reference` and `character-entities`) where it installed about sixty, and the parser a browser loads through `@foldkit/markdown/vite` is roughly a third of its previous size, about 16 KB gzipped instead of 52 KB.

The vocabulary and every error stay the same. `parseMarkdown`, `parseMarkdownWithFrontmatter` and the `markdown` Vite plugin produce the same documents as before, including islands and their attributes (with `#id` and `.class` shorthands), frontmatter, and GFM tables, strikethrough and autolink literals. They reject the same constructs with the same messages and line numbers: raw HTML, reference links, footnotes, task list items, inline directives (a colon before a name, including `14:20` in prose), leaf directive labels and executable URL schemes.

A few edge cases now follow the GFM specification rather than remark. A table row with more cells than the header drops the extra cells, and a shorter row gains empty ones. Container islands nested with the same fence length (`:::Outer` around `:::Inner`) close at the matching fences; give the outer island a longer fence (`::::Outer`), as before, to nest them unambiguously. Tabs inside a fenced code block nested in a list item become spaces. A footnote is reported at its definition rather than its reference.
