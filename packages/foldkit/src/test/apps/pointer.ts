import { Match as M, Option, Schema as S } from 'effect'

import { type Html, html } from '../../html'
import { m } from '../../message'

// MODEL

export const Model = S.Struct({
  pointerDownCount: S.Number,
  pointerUpCount: S.Number,
  lastPointerType: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

const PressedPointerDown = m('PressedPointerDown', { pointerType: S.String })
const ReleasedPointerUp = m('ReleasedPointerUp', { pointerType: S.String })

const Message = S.Union(PressedPointerDown, ReleasedPointerUp)
type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  pointerDownCount: 0,
  pointerUpCount: 0,
  lastPointerType: '',
}

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      PressedPointerDown: ({ pointerType }) => [
        {
          ...model,
          pointerDownCount: model.pointerDownCount + 1,
          lastPointerType: pointerType,
        },
        [],
      ],
      ReleasedPointerUp: ({ pointerType }) => [
        {
          ...model,
          pointerUpCount: model.pointerUpCount + 1,
          lastPointerType: pointerType,
        },
        [],
      ],
    }),
  )

// VIEW

const { div, span, button, OnPointerDown, OnPointerUp, AriaLabel } =
  html<Message>()

export const view = (model: Model): Html =>
  div(
    [],
    [
      button(
        [
          AriaLabel('pointer target'),
          OnPointerDown(
            (pointerType, _button, _screenX, _screenY, _timeStamp) =>
              Option.some(PressedPointerDown({ pointerType })),
          ),
          OnPointerUp((_screenX, _screenY, pointerType, _timeStamp) =>
            Option.some(ReleasedPointerUp({ pointerType })),
          ),
        ],
        [`down=${model.pointerDownCount} up=${model.pointerUpCount}`],
      ),
      div(
        [
          AriaLabel('nested target'),
          OnPointerDown(
            (pointerType, _button, _screenX, _screenY, _timeStamp) =>
              Option.some(PressedPointerDown({ pointerType })),
          ),
        ],
        [span([], [`type=${model.lastPointerType}`])],
      ),
      span([AriaLabel('no handler')], ['orphan']),
    ],
  )
