// ✅ Good: IgnoredMouseClick records the event even when the Model stays unchanged.

import { Effect } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  IgnoredMouseClick: {},
})

export class Canvas extends Block<Canvas>()('Canvas', { Message }) {}

export const CanvasLive = Canvas.make(
  Effect.fn(function* () {
    return {
      update: {
        IgnoredMouseClick: model => ({ model }),
      },

      view: (_model, h) =>
        h.div([h.OnClick(Message.IgnoredMouseClick())], ['Drawing area']),
    }
  }),
)
