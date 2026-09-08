import { Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  lastKey: Schema.String,
  isShifted: Schema.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  PressedKey: { key: Schema.String },
  PressedShiftKey: { key: Schema.String },
})

export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  lastKey: '',
  isShifted: false,
}

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    PressedKey: ({ key }) => ({
      model: evo(model, {
        lastKey: () => key,
        isShifted: () => false,
      }),
    }),
    PressedShiftKey: ({ key }) => ({
      model: evo(model, {
        lastKey: () => key,
        isShifted: () => true,
      }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [
      h.Id('key-app'),
      h.Role('application'),
      h.AriaLabel('Key press area'),
      h.OnKeyDown((key, modifiers) =>
        modifiers.shiftKey
          ? Message.PressedShiftKey({ key })
          : Message.PressedKey({ key }),
      ),
    ],
    [
      h.span([h.Class('last-key'), h.AriaLabel('Last key')], [model.lastKey]),
      h.span(
        [h.Class('shifted'), h.AriaLabel('Shift pressed')],
        [model.isShifted ? 'true' : 'false'],
      ),
    ],
  )
}
