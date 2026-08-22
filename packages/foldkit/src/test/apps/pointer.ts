import { Option, Schema as S } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'

// MODEL

export const Model = S.Struct({
  pointerDownCount: S.Number,
  pointerUpCount: S.Number,
  lastPointerType: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  PressedPointerDown: { pointerType: S.String },
  ReleasedPointerUp: { pointerType: S.String },
})
type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  pointerDownCount: 0,
  pointerUpCount: 0,
  lastPointerType: '',
}

// UPDATE

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<never>
  outMessage?: never
}>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    PressedPointerDown: ({ pointerType }) => ({
      model: {
        ...model,
        pointerDownCount: model.pointerDownCount + 1,
        lastPointerType: pointerType,
      },
    }),
    ReleasedPointerUp: ({ pointerType }) => ({
      model: {
        ...model,
        pointerUpCount: model.pointerUpCount + 1,
        lastPointerType: pointerType,
      },
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.button(
        [
          h.AriaLabel('pointer target'),
          h.OnPointerDown(pointerType =>
            Option.some(Message.PressedPointerDown({ pointerType })),
          ),
          h.OnPointerUp((_screenX, _screenY, pointerType, _timeStamp) =>
            Option.some(Message.ReleasedPointerUp({ pointerType })),
          ),
        ],
        [`down=${model.pointerDownCount} up=${model.pointerUpCount}`],
      ),
      h.div(
        [
          h.AriaLabel('nested target'),
          h.OnPointerDown(pointerType =>
            Option.some(Message.PressedPointerDown({ pointerType })),
          ),
        ],
        [h.span([], [`type=${model.lastPointerType}`])],
      ),
      h.span([h.AriaLabel('no handler')], ['orphan']),
    ],
  )
}
