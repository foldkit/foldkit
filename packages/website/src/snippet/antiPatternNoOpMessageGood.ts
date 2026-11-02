// ✅ Good: IgnoredMouseClick records the event even when the Model stays unchanged.

import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  IgnoredMouseClick: {},
})

export class Canvas extends Block<Canvas>()('Canvas', { Message }) {}

export const CanvasLive = Canvas.toLayer(() => ({
  update: {
    IgnoredMouseClick: model => ({ model }),
  },

  view: (_model, h) =>
    h.div([h.OnClick(Message.IgnoredMouseClick())], ['Drawing area']),
}))
