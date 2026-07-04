import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

// ❌ Bad
// A Got wrapper carries the child Message plus routing context only. Extra
// payload belongs on the child Message or a dedicated parent Message.
const GotChildMessage = m('GotChildMessage', {
  message: Child.Message,
  timestamp: S.Number,
})

// ✅ Good
const GotChildMessageFixed = m('GotChildMessage', {
  id: S.String,
  message: Child.Message,
})
