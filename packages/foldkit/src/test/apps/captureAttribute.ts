import { Match as M, Schema as S } from 'effect'

import type { Html } from '../../html/index.js'
import { html } from '../../html/index.js'
import { m } from '../../message/index.js'

// MODEL

export const Model = S.Struct({})
export type Model = typeof Model.Type

// MESSAGE

export const IgnoredInteraction = m('IgnoredInteraction')

export const Message = S.Union([IgnoredInteraction])
export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {}

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      IgnoredInteraction: () => [model, []],
    }),
  )

// VIEW

export const view = (_model: Model): Html => {
  const h = html<Message>()

  return h.input([
    h.DataAttribute('testid', 'capture-input'),
    h.Type('file'),
    h.Accept('image/*'),
    h.Capture('environment'),
  ])
}
