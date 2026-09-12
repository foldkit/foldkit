// ❌ Bad: NoOp does not identify the event.

const Message = defineMessageUnion({
  NoOp: {},
})

const handleMouseClick = () => Message.NoOp()
