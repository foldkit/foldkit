import { Effect, Match as M, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'

const ClickedFetchCount = m('ClickedFetchCount')
const SucceededFetchCount = m('SucceededFetchCount', {
  count: S.Number,
})
const FailedFetchCount = m('FailedFetchCount', {
  error: S.String,
})

const FetchCount = Command.define(
  'FetchCount',
  SucceededFetchCount,
  FailedFetchCount,
)

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedFetchCount: () => [model, [fetchCount]],
      SucceededFetchCount: ({ count }) => [{ count }, []],
      FailedFetchCount: () => [model, []],
    }),
  )

const fetchCount = FetchCount(
  Effect.gen(function* () {
    const result = yield* Effect.tryPromise(() =>
      fetch('/api/count').then(res => {
        if (!res.ok) throw new Error('API request failed')
        return res.json() as unknown as { count: number }
      }),
    )
    return SucceededFetchCount({ count: result.count })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(FailedFetchCount({ error: error.message })),
    ),
  ),
)
