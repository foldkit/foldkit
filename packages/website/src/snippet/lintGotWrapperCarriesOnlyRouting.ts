import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

// ❌ Bad
// A Got wrapper carries the child Message plus routing context only. Extra
// payload like timestamp belongs on the child Message or a parent Message.
const GotSettingsMessage = m('GotSettingsMessage', {
  message: Settings.Message,
  timestamp: S.Number,
})

// ✅ Good
// message plus routing keys (id, or keys ending in Id) only.
const GotCounterMessage = m('GotCounterMessage', {
  id: S.String,
  message: Counter.Message,
})
