---
'foldkit': minor
'create-foldkit-app': patch
---

Require Foldkit-managed Model and Message serialization to complete synchronously without Effect Services. The check covers each Block's Model and local Message Codecs and the complete Message Codec assembled from generated child delivery envelopes.

Remove the Block `codec` configuration. Delete declarations such as:

```ts
codec: {
  decoding: [MessageMigration],
  encoding: [MessageMigration],
}
```

There are no replacement aliases. Move Service-dependent work into Commands or another effectful boundary. A synchronous `SchemaTransformation.transformEffect` backed by `Effect.succeed` remains valid, as do standard JSON Codecs for values such as `Option` and `Date`.

An Effect requirement of `never` proves that a Codec needs no Services, but does not prove that it is synchronous. Foldkit now rejects Promise-backed and otherwise suspended transformations when a real serialization boundary runs them. Block, Composition, Layer, and Program construction remain passive.

DevTools dispatch decodes the complete Message synchronously and no longer adds decoder Service requirements to a Program. Development Model preservation and the hydratable Flags handoff use the same boundary. An encoding failure invalidates the cached Model without changing the live Model. A snapshot that fails Schema validation falls back to init; a suspended or defective decoder also reports a diagnostic. Server rendering transfers Flags rather than the Model or Messages, and a non-hydratable static render skips the handoff Codec.

Command and other explicitly effectful API Codecs retain their full Effect Schema requirements.
