// ❌ Bad: NoOp does not identify the event.

const Message = defineMessageUnion({
  NoOp: {},
})
type Message = typeof Message.Type

const handleMouseClick = () => Message.NoOp()
