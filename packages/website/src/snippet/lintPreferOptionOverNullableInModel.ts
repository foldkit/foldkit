import { Schema } from 'effect'

// ❌ Bad
// NullOr / Null / optional model absence as a null the update layer must guard.
const BadModel = Schema.Struct({
  currentUser: Schema.NullOr(User),
})

// ✅ Good
// Option makes presence explicit and threads through update without null checks.
const Model = Schema.Struct({
  currentUser: Schema.Option(User),
})
