---
'@foldkit/oxlint-plugin': minor
---

Add 3 convention rules from @artile's #624, curated against real code with real oxlint and reimplemented here from behavior specs in house style. Most of the fourteen proposed rules were cut in curation (accessibility-linter overlap, CSS-string matching, filename gating, helper-definition tracing, or debatable opinion).

- Dispatch: `no-switch-on-message-tag` steers `switch (x._tag)` to `M.tagsExhaustive`, whose exhaustiveness check turns a forgotten variant into a type error.
- Effect resources: `acquire-release-constructs-in-acquire-body` requires the acquire Effect to build its resource in place instead of returning a handle captured from an outer binding, which leaks on interruption.
- State modeling: `prefer-option-over-nullable-in-model` keeps the `Model` struct on `Schema.Option`, not `Schema.NullOr` / `Schema.Null` / `Schema.optional`.

Each ships with a colocated unit test and a real-oxlint integration fixture and runs across the examples, website, and typing-game client. Adopting them stays opt-in per app, so existing projects see no change.
