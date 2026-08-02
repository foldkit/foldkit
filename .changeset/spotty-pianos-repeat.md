---
'@foldkit/markdown': minor
---

Add opt-in Schema-validated frontmatter support to the Vite plugin. Pass a `frontmatter` Schema struct in the plugin options to enable flat `key: value` frontmatter blocks: fields are validated at build time the same way island attributes are, and the validated fields are emitted as a `frontmatter` named export on the compiled module. `parseMarkdownWithFrontmatter` exposes the same parsing for scripts. Documents with frontmatter still fail the build when no schema is configured.
