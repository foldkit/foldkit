import { Deferred, Effect } from 'effect'

export const deferred = Effect.runSync(Deferred.make<void>())
