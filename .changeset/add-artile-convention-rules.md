---
'@foldkit/oxlint-plugin': minor
---

Add three convention rules from @artile's #624, curated against real code with real Oxlint and reimplemented from their behavior specifications in Foldkit's current rule infrastructure. Most of the fourteen proposed rules were cut during curation because they overlap accessibility linters, match CSS strings, depend on filenames or cross-file helper tracing, or enforce a debatable opinion.

- Dispatch: `no-switch-on-message-tag` steers `switch (value._tag)` to the union's exhaustive `match` helper or Effect `Match`.
- Effect resources: `acquire-release-constructs-in-acquire-body` requires the acquire Effect to build its resource lazily instead of returning an eagerly created or captured handle that can leak on interruption.
- State modeling: `prefer-option-over-nullable-in-model` keeps direct `Model` fields on `Schema.Option` instead of nullable or optional Schema fields.

Each rule ships with a colocated unit test, a real-Oxlint integration fixture, and website documentation.
