import { m } from 'foldkit/message'

import * as Child from './child'

// ❌ Bad
const ChildChanged = m('ChildChanged', {
  message: Child.Message,
})

// ✅ Good
const GotChildMessage = m('GotChildMessage', {
  message: Child.Message,
})
