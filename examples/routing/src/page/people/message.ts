import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { ApplicationRoute } from '../../route'
import { Person } from './model'

export const Message = defineMessageUnion({
  ChangedSearchInput: { value: Schema.String },
  SubmittedSearch: {},
  InformedOfRouteChange: { route: ApplicationRoute.People },
  CompletedFetchPeople: {
    query: Schema.String,
    people: Schema.Array(Person),
  },
  CompletedPushSearchUrl: {},
})
export type Message = typeof Message.Type
