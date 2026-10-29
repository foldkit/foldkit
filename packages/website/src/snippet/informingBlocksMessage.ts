import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Person } from './informingBlocksModel'
import { ApplicationRoute } from './informingBlocksRoute'

export const Message = defineMessageUnion({
  InformedOfRouteChange: { route: ApplicationRoute.People },
  CompletedFetchPeople: { query: Schema.String, people: Schema.Array(Person) },
})
export type Message = typeof Message.Type
