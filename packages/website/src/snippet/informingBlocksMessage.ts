import { Schema } from 'effect'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

import { Person } from './informingBlocksModel'
import { ApplicationRoute } from './informingBlocksRoute'

export const InMessage = defineInMessageUnion({
  InformedOfRouteChange: { route: ApplicationRoute.People },
})
export type InMessage = typeof InMessage.Type

export const Message = defineMessageUnion({
  CompletedFetchPeople: { query: Schema.String, people: Schema.Array(Person) },
})
export type Message = typeof Message.Type
