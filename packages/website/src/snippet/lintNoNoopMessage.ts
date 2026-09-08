import { defineMessageUnion } from 'foldkit/message'

// ❌ Bad
const BadMessage = defineMessageUnion({
  NoOp: {},
})

// ✅ Good
const Message = defineMessageUnion({
  ClickedSave: {},
})
