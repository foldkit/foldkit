---
'foldkit': minor
'@foldkit/ui': patch
'@foldkit/oxlint-plugin': patch
'create-foldkit-app': patch
---

Make `Composition.makeUpdate` accept only an exhaustive Model-first handler record. The callback overload is removed without an alias. Use `makeUpdate({})` for message-free and routed-only Compositions, and `makeUpdate.withContext(context => handlers)` when handlers need dispatch context.

Each handler receives `(model, message)` with its exact Message variant. Pass compatible extracted handlers and existing Steps directly; name a handler dedicated to one Message `handle<MessageTag>`. Keep adapting callbacks where they derive inputs or need contextual inference, and retain operation names for shared Steps. Ordinary handlers can return results directly.

Preserve exact selected operation outputs, aggregate update utilities, context call shapes, direct and curried dispatch, handler completeness, registration evidence, and the checks against losing connected Command or OutMessage channels. Composition continues routing child delivery before local handlers, and construction stays passive.

Migrate framework and UI consumers, examples, Typing Game, Website, scaffolds, lint fixtures, and active migration guidance to the record-only surface.
