import { Match as M, Schema as S } from 'effect'

import type { Html } from '../../html/index.js'
import { html } from '../../html/index.js'
import { m } from '../../message/index.js'

// MODEL

export const Model = S.Struct({
  lastKey: S.String,
  isShifted: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

export const PressedKey = m('PressedKey', { key: S.String })
export const PressedShiftKey = m('PressedShiftKey', { key: S.String })

export const Message = S.Union([PressedKey, PressedShiftKey])
export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  lastKey: '',
  isShifted: false,
}

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      PressedKey: ({ key }) => [
        { ...model, lastKey: key, isShifted: false },
        [],
      ],
      PressedShiftKey: ({ key }) => [
        { ...model, lastKey: key, isShifted: true },
        [],
      ],
    }),
  )

// VIEW

export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Id('key-app'),
      h.Role('application'),
      h.AriaLabel('Key press area'),
      h.OnKeyDown((key, modifiers) =>
        modifiers.shiftKey ? PressedShiftKey({ key }) : PressedKey({ key }),
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
