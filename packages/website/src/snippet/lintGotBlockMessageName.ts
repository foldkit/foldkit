import { defineMessageUnion } from 'foldkit/message'

import * as Child from './child'

// ❌ Bad
const BadMessage = defineMessageUnion({
  ChildChanged: { message: Child.Message },
})

// ✅ Good
const Message = defineMessageUnion({
  GotChildMessage: { message: Child.Message },
})
