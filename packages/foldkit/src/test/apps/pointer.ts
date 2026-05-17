import { Match as M, Option, Schema as S } from 'effect'

import { type Html, html } from '../../html/index.js'
import { m } from '../../message/index.js'

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

const Message = S.Union([PressedPointerDown, ReleasedPointerUp])
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

export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.button(
        [
          h.AriaLabel('pointer target'),
          h.OnPointerDown(pointerType =>
            Option.some(PressedPointerDown({ pointerType })),
          ),
          h.OnPointerUp((_screenX, _screenY, pointerType, _timeStamp) =>
            Option.some(ReleasedPointerUp({ pointerType })),
          ),
        ],
        [`down=${model.pointerDownCount} up=${model.pointerUpCount}`],
      ),
      h.div(
        [
          h.AriaLabel('nested target'),
          h.OnPointerDown(pointerType =>
            Option.some(PressedPointerDown({ pointerType })),
          ),
        ],
        [h.span([], [`type=${model.lastPointerType}`])],
      ),
      h.span([h.AriaLabel('no handler')], ['orphan']),
    ],
  )
}
