import { Effect } from 'effect'
import { Command } from 'foldkit'

const FetchCount = Command.define(
  'FetchCount',
  SucceededFetchCount,
  FailedFetchCount,
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
    Effect.catchAll(error =>
      Effect.succeed(FailedFetchCount({ error: error.message })),
    ),
  ),
)
