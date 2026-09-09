import { Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  lastKey: Schema.String,
})

export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  PressedSelfKey: { key: Schema.String },
})

export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  lastKey: '',
}

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    PressedSelfKey: ({ key }) => ({
      model: evo(model, { lastKey: () => key }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [
      h.Id('key-app'),
      h.Role('application'),
      h.AriaLabel('Self key press area'),
      h.OnKeyDownSelf(key => Message.PressedSelfKey({ key })),
    ],
    [h.span([h.AriaLabel('Last key')], [model.lastKey])],
  )
}
