import { Match as M, Schema as S } from 'effect'

import type { Html } from '../../html/index.js'
import { html } from '../../html/index.js'
import { m } from '../../message/index.js'

// MODEL

export const Model = S.Struct({
  lastKey: S.String,
})

export type Model = typeof Model.Type

// MESSAGE

export const PressedSelfKey = m('PressedSelfKey', { key: S.String })

export type Message = typeof PressedSelfKey.Type

// INIT

export const initialModel: Model = {
  lastKey: '',
}

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      PressedSelfKey: ({ key }) => [{ ...model, lastKey: key }, []],
    }),
  )

// VIEW

export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Id('key-app'),
      h.Role('application'),
      h.AriaLabel('Self key press area'),
      h.OnKeyDownSelf(key => PressedSelfKey({ key })),
    ],
    [h.span([h.AriaLabel('Last key')], [model.lastKey])],
  )
}
