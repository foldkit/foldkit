import { Schema } from 'effect'

import type { Document, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import { defineView } from '../../submodel/public.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  tick: Schema.Number,
  listCount: Schema.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  IncrementedTick: {},
})
export type Message = typeof Message.Type

const counterView = defineView<{ tick: number }, Message>((model, h) =>
  h.div([h.Id('counter-panel')], [`tick ${model.tick}`]),
)

const listView = defineView<{ listCount: number }, Message>((model, h) =>
  h.div([h.Id('list-panel')], [`items ${model.listCount}`]),
)

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    IncrementedTick: () => ({
      model: evo(model, {
        tick: tick => tick + 1,
      }),
    }),
  })

export const initialModel: Model = { tick: 0, listCount: 3 }

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Outline test',
  body: h.div(
    [],
    [
      h.button([h.OnClick(Message.IncrementedTick())], ['Increment tick']),
      h.submodel({
        slotId: 'counter',
        model: { tick: model.tick },
        view: counterView,
        toParentMessage: message => message,
      }),
      h.submodel({
        slotId: 'list',
        model: { listCount: model.listCount },
        view: listView,
        toParentMessage: message => message,
      }),
    ],
  ),
})
