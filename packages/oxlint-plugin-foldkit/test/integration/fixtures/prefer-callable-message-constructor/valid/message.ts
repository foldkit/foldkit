import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'


const Message = defineMessageUnion({
  ClickedSave: {},
})
type Message = typeof Message.Type

const initialMessage: Message = Message.ClickedSave()
