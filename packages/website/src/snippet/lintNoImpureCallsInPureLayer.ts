import { evo } from 'foldkit/struct'

// ❌ Bad
// Reading the clock in update hides a side effect in the pure layer.
const badUpdate = (model: Model) => evo(model, { lastSeen: () => Date.now() })

// ✅ Good
// Read the clock in a Command and deliver the value back as a Message.
const goodUpdate = (model: Model, now: number) =>
  evo(model, { lastSeen: () => now })
