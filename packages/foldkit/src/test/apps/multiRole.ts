import { Match as M, Schema as S } from 'effect'

import { type Html, html } from '../../html'
import { m } from '../../message'

// MODEL

export const Model = S.Struct({ clicks: S.Number })
export type Model = typeof Model.Type

// MESSAGE

export const ClickedFallback = m('ClickedFallback')

export const Message = S.Union(ClickedFallback)
export type Message = typeof Message.Type

// INIT

export const initialModel: Model = { clicks: 0 }

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      ClickedFallback: () => [{ ...model, clicks: model.clicks + 1 }, []],
    }),
  )

// VIEW

const { div, OnClick, Role } = html<Message>()

export const view = (model: Model): Html =>
  div(
    [],
    [
      div(
        [Role('doc-subtitle heading'), OnClick(ClickedFallback())],
        [`Fallback element clicks=${model.clicks}`],
      ),
    ],
  )
