import { Match as M, Schema as S } from 'effect'

import { type Html, html } from '../../html/index.js'
import { m } from '../../message/index.js'

// MODEL

export const Model = S.Struct({
  clicks: S.Number,
  doubleClicks: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

const ClickedContainer = m('ClickedContainer')
const DoubleClickedContainer = m('DoubleClickedContainer')

const Message = S.Union([ClickedContainer, DoubleClickedContainer])
type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  clicks: 0,
  doubleClicks: 0,
}

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      ClickedContainer: () => [{ ...model, clicks: model.clicks + 1 }, []],
      DoubleClickedContainer: () => [
        { ...model, doubleClicks: model.doubleClicks + 1 },
        [],
      ],
    }),
  )

// VIEW

export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.div(
        [h.Role('option'), h.OnClick(ClickedContainer())],
        [h.span([], [`clicks=${model.clicks}`])],
      ),
      h.div(
        [h.Role('listitem'), h.OnDoubleClick(DoubleClickedContainer())],
        [h.span([], [`dbl=${model.doubleClicks}`])],
      ),
    ],
  )
}
