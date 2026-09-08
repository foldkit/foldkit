import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

// ❌ Bad
// A Got wrapper carries the child Message plus routing context only. Extra
// payload like timestamp belongs on the child Message or a parent Message.
const BadMessage = defineMessageUnion({
  GotSettingsMessage: {
    message: Settings.Message,
    timestamp: Schema.Number,
  },
})

// ✅ Good
// message plus routing keys (id, or keys ending in Id) only.
const Message = defineMessageUnion({
  GotCounterMessage: {
    id: Schema.String,
    message: Counter.Message,
  },
})
