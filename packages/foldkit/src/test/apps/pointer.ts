import { Number, Option, Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  pointerDownCount: Schema.Number,
  pointerUpCount: Schema.Number,
  lastPointerType: Schema.String,
})
export type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  PressedPointerDown: { pointerType: Schema.String },
  ReleasedPointerUp: { pointerType: Schema.String },
})
type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  pointerDownCount: 0,
  pointerUpCount: 0,
  lastPointerType: '',
}

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    PressedPointerDown: ({ pointerType }) => ({
      model: evo(model, {
        pointerDownCount: Number.increment,
        lastPointerType: () => pointerType,
      }),
    }),
    ReleasedPointerUp: ({ pointerType }) => ({
      model: evo(model, {
        pointerUpCount: Number.increment,
        lastPointerType: () => pointerType,
      }),
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
