import { Effect, Match as M, Number, Option, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import type { Html, HtmlBuilder } from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// MODEL

export const Model = S.Struct({
  commits: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

const Committed = m('Committed')
const Reset = m('Reset')
const CompletedRecordReset = m('CompletedRecordReset')

export const Message = S.Union([Committed, Reset, CompletedRecordReset])
export type Message = typeof Message.Type

/** Left unresolved by a test that wants a bookkeeping violation alongside a
 *  fall-through, so the two end-of-scene checks can be ordered. */
export const RecordReset = Command.define('RecordReset', {
  messages: [CompletedRecordReset],
  execute: Effect.sync(() => CompletedRecordReset()),
})

// INIT

export const initialModel: Model = { commits: 0 }

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      Committed: () => [evo(model, { commits: Number.increment }), []],
      Reset: () => [evo(model, { commits: () => 0 }), [RecordReset()]],
      CompletedRecordReset: () => [model, []],
    }),
  )

// VIEW

export const appId = 'selective-keys'
export const resetId = 'selective-keys-reset'

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Id(appId),
      h.OnKeyDownPreventDefault(key =>
        key === 'Enter' ? Option.some(Committed()) : Option.none(),
      ),
    ],
    [
      h.span([h.Class('commits')], [`${model.commits}`]),
      h.button([h.Id(resetId), h.OnClick(Reset())], ['Reset']),
    ],
  )
