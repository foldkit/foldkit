import { Context, Effect } from 'effect'

export class DraftStore extends Context.Service<
  DraftStore,
  Readonly<{ save: (draft: string) => Effect.Effect<void, Error> }>
>()('DraftStore') {}
