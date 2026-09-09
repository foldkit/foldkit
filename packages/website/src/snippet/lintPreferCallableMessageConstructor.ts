import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedSave: {},
})
type Message = typeof Message.Type

// ❌ Bad
const badMessage: Message = {
  _tag: 'ClickedSave',
}

// ✅ Good
const goodMessage = Message.ClickedSave()
