import { Effect } from 'effect'
import { Command } from 'foldkit'

const fetchCount: Command.Command<
  typeof SucceededCountFetch | typeof FailedCountFetch
> = Effect.gen(function* () {
  const result = yield* Effect.tryPromise(() =>
    fetch('/api/count').then(res => {
      if (!res.ok) throw new Error('API request failed')
      // In a real app, decode with Effect Schema instead of casting
      return res.json() as unknown as { count: number }
    }),
  )

  return SucceededCountFetch({ count: result.count })
}).pipe(
  // Commands must always return a Message. They should never fail.
  // catchAll recovers from errors by returning a FailedCountFetch Message.
  Effect.catchAll(error =>
    Effect.succeed(FailedCountFetch({ error: error.message })),
  ),
  Command.make('FetchCount'),
)
