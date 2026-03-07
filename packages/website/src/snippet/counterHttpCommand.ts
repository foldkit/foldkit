import { Effect, Match as M, Schema } from 'effect'
import { Command } from 'foldkit/command'
import { m } from 'foldkit/message'

const ClickedFetchCount = m('ClickedFetchCount')
const SucceededCountFetch = m('SucceededCountFetch', {
  count: Schema.Number,
})
const FailedCountFetch = m('FailedCountFetch', {
  error: Schema.String,
})

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedFetchCount: () => [model, [fetchCount]],
      SucceededCountFetch: ({ count }) => [count, []],
      FailedCountFetch: () => [model, []],
    }),
  )

const fetchCount: Command<
  typeof SucceededCountFetch | typeof FailedCountFetch
> = Effect.gen(function* () {
  const result = yield* Effect.tryPromise(() =>
    fetch('/api/count').then(res => {
      if (!res.ok) throw new Error('API request failed')
      return res.json() as unknown as { count: number }
    }),
  )
  return SucceededCountFetch({ count: result.count })
}).pipe(
  Effect.catchAll(error =>
    Effect.succeed(FailedCountFetch({ error: error.message })),
  ),
)
