import { Context, Effect } from 'effect'

/** Effect service tag that provides message dispatching to the view layer. */
export class Dispatch extends Context.Service<
  Dispatch,
  {
    readonly dispatchAsync: (message: unknown) => Effect.Effect<void>
    readonly dispatchSync: (message: unknown) => void
  }
>()('@foldkit/Dispatch') {}
