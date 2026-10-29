import { Schema } from 'effect'

// ❌ Bad
// Nullable and optional Schemas model absence as values the update layer must
// guard.
const Model = Schema.Struct({
  currentUser: Schema.NullOr(User),
})
type Model = typeof Model.Type
// ✅ Good
// Option makes presence explicit and threads through update without null checks.
const ModelWithOption = Schema.Struct({
  currentUser: Schema.Option(User),
})
type ModelWithOption = typeof ModelWithOption.Type
