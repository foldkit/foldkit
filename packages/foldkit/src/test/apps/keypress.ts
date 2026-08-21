import { Schema as S } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'

// MODEL

export const Model = S.Struct({
  lastKey: S.String,
  isShifted: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  PressedKey: { key: S.String },
  PressedShiftKey: { key: S.String },
})

export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  lastKey: '',
  isShifted: false,
}

// UPDATE

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<never>
  outMessage?: never
}>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    PressedKey: ({ key }) => ({
      model: { ...model, lastKey: key, isShifted: false },
    }),
    PressedShiftKey: ({ key }) => ({
      model: { ...model, lastKey: key, isShifted: true },
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
