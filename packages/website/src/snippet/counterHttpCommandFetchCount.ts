import { Effect } from 'effect'
import { Command } from 'foldkit/command'

const fetchCount: Command<
  typeof SucceededCountFetch | typeof FailedCountFetch
> = Effect.gen(function* () {
  // tryPromise creates an Effect that represents an asynchronous computation
  // that might fail. If the Promise rejects, it is propagated to the error channel
  // in the Effect as UnknownException.
  // https://effect.website/docs/getting-started/creating-effects/#trypromise
  const result = yield* Effect.tryPromise(() =>
    fetch('/api/count').then(res => {
      if (!res.ok) throw new Error('API request failed')
      // NOTE: We would not cast in a real application. Instead, we would
      // decode the JSON using Effect Schema. For simplicity, we skip that here.
      return res.json() as unknown as { count: number }
    }),
  )

  // If we reach this, the Effect above that uses tryPromise succeeded,
  // and we can return the SucceededCountFetch message
  return SucceededCountFetch({ count: result.count })
}).pipe(
  // We are forced by the type system to handle the error case because
  // Commands may not fail. They must always return a Message. Here, we recover
  // from failure by returning a FailedCountFetch Message with the error message.
  // In a real application, we might log the error to an external service,
  // retry the request, etc.
  Effect.catchAll(error =>
    Effect.succeed(FailedCountFetch({ error: error.message })),
  ),
)
