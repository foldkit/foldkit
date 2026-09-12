// ✅ Good: IgnoredMouseClick records the event even when the Model stays unchanged.

const Message = defineMessageUnion({
  IgnoredMouseClick: {},
})

const handleMouseClick = () => Message.IgnoredMouseClick()

const handlers = {
  IgnoredMouseClick: () => ({ model }),
}
