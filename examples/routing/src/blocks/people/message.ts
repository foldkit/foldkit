import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Person } from './model'

export const Message = defineMessageUnion({
  ChangedSearchInput: { value: Schema.String },
  SubmittedSearch: {},
  CompletedFetchPeople: {
    query: Schema.String,
    people: Schema.Array(Person),
  },
  CompletedPushSearchUrl: {},
})
export type Message = typeof Message.Type
