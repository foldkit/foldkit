import { Deferred } from 'effect'

export const deferred = Deferred.makeUnsafe<void>()
