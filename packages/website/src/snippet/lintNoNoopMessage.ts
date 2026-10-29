import { defineMessageUnion } from 'foldkit/message'

// ❌ Bad
const BadMessage = defineMessageUnion({
  NoOp: {},
})
type BadMessage = typeof BadMessage.Type
// ✅ Good
const Message = defineMessageUnion({
  ClickedSave: {},
})
type Message = typeof Message.Type
