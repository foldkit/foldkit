import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

// defineMessageUnion() declares the union and its callable constructors together

const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
  ClickedReset: {},
})
type Message = typeof Message.Type
