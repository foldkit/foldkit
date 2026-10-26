// ✅ Good: IgnoredMouseClick records the event even when the Model stays unchanged.

import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  IgnoredMouseClick: {},
})

const handleMouseClick = () => Message.IgnoredMouseClick()

const update = ApplicationComposition.makeUpdate({
  IgnoredMouseClick: model => ({ model }),
})
