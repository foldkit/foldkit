// ❌ Bad: NoOp does not identify the event.

import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  NoOp: {},
})

export class Canvas extends Block<Canvas>()('Canvas', { Message }) {}

export const CanvasLive = Canvas.toLayer(() => ({
  update: {
    NoOp: model => ({ model }),
  },

  view: (_model, h) => h.div([h.OnClick(Message.NoOp())], ['Drawing area']),
}))
