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

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedFetchCount: () => [model, [fetchCount]],
      SucceededFetchCount: ({ count }) => [Model({ count }), []],
      FailedFetchCount: () => [model, []],
    }),
  )

const fetchCount: Command.Command<
  typeof SucceededFetchCount | typeof FailedFetchCount
> = Effect.gen(function* () {
  const result = yield* Effect.tryPromise(() =>
    fetch('/api/count').then(res => {
      if (!res.ok) throw new Error('API request failed')
      return res.json() as unknown as { count: number }
    }),
  )
  return SucceededFetchCount({ count: result.count })
}).pipe(
  Effect.catchAll(error =>
    Effect.succeed(FailedFetchCount({ error: error.message })),
  ),
  Command.make('FetchCount'),
)
