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

const { div, span, OnClick, OnDoubleClick, Role } = html<Message>()

export const view = (model: Model): Html =>
  div(
    [],
    [
      div(
        [Role('option'), OnClick(ClickedContainer())],
        [span([], [`clicks=${model.clicks}`])],
      ),
      div(
        [Role('listitem'), OnDoubleClick(DoubleClickedContainer())],
        [span([], [`dbl=${model.doubleClicks}`])],
      ),
    ],
  )
