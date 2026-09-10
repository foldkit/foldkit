import { Match, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Dialog } from '@foldkit/ui'

import { SearchResult } from './message'

const Results = Schema.Array(SearchResult)

export const SearchState = defineTaggedUnion({
  Idle: {},
  Loading: { results: Results },
  Ok: { results: Results },
})
export type SearchState = typeof SearchState.Type

export const resultsFromState = (
  state: SearchState,
): ReadonlyArray<typeof SearchResult.Type> =>
  Match.value(state).pipe(
    Match.tag('Ok', ({ results }) => results),
    Match.tag('Loading', ({ results }) => results),
    Match.orElse(() => []),
  )

export const Model = Schema.Struct({
  dialog: Dialog.Model,
  query: Schema.String,
  searchState: SearchState,
  activeResultIndex: Schema.Number,
})
export type Model = typeof Model.Type
