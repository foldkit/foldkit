---
'@foldkit/oxlint-plugin': minor
'foldkit': minor
---

Add five Foldkit convention rules, including three from @artile's #624 that were curated against real code with real Oxlint and reimplemented from their behavior specifications in Foldkit's current rule infrastructure. The remaining rules from that proposal were cut because they overlap accessibility linters, match CSS strings, depend on filenames or cross-file helper tracing, or enforce a debatable opinion.

- Dispatch: `no-switch-on-message-tag` steers `switch (value._tag)` to the union's exhaustive `match` helper or Effect `Match`.
- Effect resources: `acquire-release-constructs-in-acquire-body` requires the acquire Effect to build its resource lazily instead of returning an eagerly created or captured handle that can leak on interruption.
- State modeling: `prefer-option-over-nullable-in-model` keeps direct `Model` fields on `Schema.Option` instead of nullable or optional Schema fields.
- Routing: `no-route-query-constructor-default` rejects constructor defaults that do not run while `Route.query` decodes, pointing to `Schema.withDecodingDefaultKey` or `Schema.OptionFromOptional` instead.
- Command composition: `prefer-command-mapmessage` rejects lifting a result Message by mapping the Effect, which dispatches correctly but leaves Story and Scene unable to recover the lift. Use `Command.mapMessage` or `Command.mapMessages` instead.

Each rule ships with a colocated unit test, a real-Oxlint integration fixture, and website documentation. The rules are enabled in the recommended preset.

`Command.mapEffect` now preserves the Command's result Message type while still allowing transformations of its error and requirement channels. This makes its execution-only role explicit in the API.

BREAKING CHANGE: A `Command.mapEffect` transform can no longer change the result Message type. Replace result transforms with `Command.mapMessage` or `Command.mapMessages`. Transforms that provide services, add retry or delay behavior, or otherwise preserve the result Message continue to work unchanged.
