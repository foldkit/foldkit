import { Context, Effect, Layer } from 'effect'

import { type Person } from './informingBlocksModel'

export const PeopleDirectory = Context.Service<
  Readonly<{
    search: (query: string) => Effect.Effect<ReadonlyArray<Person>>
  }>
>('PeopleDirectory')

export const PeopleDirectoryLayer = Layer.succeed(PeopleDirectory, {
  search: () => Effect.succeed([{ id: 1, name: 'Ada Lovelace' }]),
})
