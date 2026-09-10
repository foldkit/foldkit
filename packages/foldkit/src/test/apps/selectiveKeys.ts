import { Effect, Number, Option, Schema } from 'effect'

import * as Command from '../../command/index.js'
import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  commits: Schema.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  Committed: {},
  Reset: {},
  CompletedRecordReset: {},
})
export type Message = typeof Message.Type

/** Left unresolved by a test that wants a bookkeeping violation alongside a
 *  fall-through, so the two end-of-scene checks can be ordered. */
export const RecordReset = Command.define('RecordReset', {
  messages: [Message.CompletedRecordReset],
  execute: Effect.sync(() => Message.CompletedRecordReset()),
})

// INIT

export const initialModel: Model = { commits: 0 }

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    Committed: () => ({ model: evo(model, { commits: Number.increment }) }),
    Reset: () => ({
      model: evo(model, { commits: () => 0 }),
      commands: [RecordReset()],
    }),
    CompletedRecordReset: () => ({ model }),
  })

// VIEW

export const appId = 'selective-keys'
export const resetId = 'selective-keys-reset'

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Id(appId),
      h.OnKeyDownPreventDefault(key =>
        key === 'Enter' ? Option.some(Message.Committed()) : Option.none(),
      ),
    ],
    [
      h.span([h.Class('commits')], [`${model.commits}`]),
      h.button([h.Id(resetId), h.OnClick(Message.Reset())], ['Reset']),
    ],
  )
