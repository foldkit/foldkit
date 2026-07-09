---
'@foldkit/oxlint-plugin': minor
---

Ship `recommended.json` and `all.json` preset files so a JSON `.oxlintrc.json` can extend a preset directly instead of hand-copying rule lists: `{ "extends": ["./node_modules/@foldkit/oxlint-plugin/recommended.json"] }`. The files are generated at build time from the same source as `configs.recommended` / `configs.all`, ship in `files`, and are reachable through the `./recommended.json` and `./all.json` export subpaths. Consumers pick up new rules with a version bump instead of a config diff.

Both presets now scope every foldkit rule off in test files (`**/*.test.ts`, `**/*.test.tsx`) via an `overrides` entry. Foldkit rules police application definitions that tests exercise rather than write, and some invert in tests (a route-parsing test must build the URL the router under test parses; a Command test double is hand-rolled by design). Scoping them off by default keeps the ruleset stable as new rules ship in batches, and a rule that wants test coverage can opt in explicitly.
