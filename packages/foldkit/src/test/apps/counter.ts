import { Effect, Match as M, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import { m } from '../../message/index.js'

// MODEL

export const Model = S.Struct({
  count: S.Number,
  log: S.Array(S.Number),
})
export type Model = typeof Model.Type

// MESSAGE

export const ClickedIncrement = m('ClickedIncrement')
export const ClickedDecrement = m('ClickedDecrement')
export const ClickedFetch = m('ClickedFetch')
export const ClickedFetchById = m('ClickedFetchById', { id: S.Number })
export const StartedThreeFetches = m('StartedThreeFetches')
export const StartedThreeFetchesById = m('StartedThreeFetchesById')
export const StartedMixedFetches = m('StartedMixedFetches')
export const SucceededFetchCount = m('SucceededFetchCount', { count: S.Number })
export const FailedFetchCount = m('FailedFetchCount', { error: S.String })

export const Message = S.Union([
  ClickedIncrement,
  ClickedDecrement,
  ClickedFetch,
  ClickedFetchById,
  StartedThreeFetches,
  StartedThreeFetchesById,
  StartedMixedFetches,
  SucceededFetchCount,
  FailedFetchCount,
])
export type Message = typeof Message.Type

// COMMAND

export const FetchCount = Command.define(
  'FetchCount',
  SucceededFetchCount,
  FailedFetchCount,
)(Effect.sync(() => SucceededFetchCount({ count: 0 })))

export const FetchCountById = Command.define(
  'FetchCountById',
  { id: S.Number },
  SucceededFetchCount,
  FailedFetchCount,
)(({ id }) => Effect.sync(() => SucceededFetchCount({ count: id })))

// INIT

export const initialModel: Model = { count: 0, log: [] }

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedIncrement: () => [{ ...model, count: model.count + 1 }, []],
      ClickedDecrement: () => [{ ...model, count: model.count - 1 }, []],
      ClickedFetch: () => [model, [FetchCount()]],
      ClickedFetchById: ({ id }) => [model, [FetchCountById({ id })]],
      StartedThreeFetches: () => [
        model,
        [FetchCount(), FetchCount(), FetchCount()],
      ],
      StartedThreeFetchesById: () => [
        model,
        [FetchCountById({ id: 5 }), FetchCountById({ id: 5 })],
      ],
      StartedMixedFetches: () => [
        model,
        [
          FetchCount(),
          FetchCount(),
          FetchCountById({ id: 99 }),
          FetchCountById({ id: 99 }),
        ],
      ],
      SucceededFetchCount: ({ count }) => [
        { count, log: [...model.log, count] },
        [],
      ],
      FailedFetchCount: () => [model, []],
    }),
  )
