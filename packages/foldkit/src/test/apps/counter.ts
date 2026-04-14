import { Effect, Match as M, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import { m } from '../../message/index.js'

// MODEL

export const Model = S.Struct({ count: S.Number })
export type Model = typeof Model.Type

// MESSAGE

export const ClickedIncrement = m('ClickedIncrement')
export const ClickedDecrement = m('ClickedDecrement')
export const ClickedFetch = m('ClickedFetch')
export const SucceededFetchCount = m('SucceededFetchCount', { count: S.Number })
export const FailedFetchCount = m('FailedFetchCount', { error: S.String })

export const Message = S.Union(
  ClickedIncrement,
  ClickedDecrement,
  ClickedFetch,
  SucceededFetchCount,
  FailedFetchCount,
)
export type Message = typeof Message.Type

// COMMAND

export const FetchCount = Command.define(
  'FetchCount',
  SucceededFetchCount,
  FailedFetchCount,
)

export const fetchCount = FetchCount(
  Effect.sync(() => SucceededFetchCount({ count: 0 })),
)

// INIT

export const initialModel: Model = { count: 0 }

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
      ClickedIncrement: () => [{ count: model.count + 1 }, []],
      ClickedDecrement: () => [{ count: model.count - 1 }, []],
      ClickedFetch: () => [model, [fetchCount]],
      SucceededFetchCount: ({ count }) => [{ count }, []],
      FailedFetchCount: () => [model, []],
    }),
  )
