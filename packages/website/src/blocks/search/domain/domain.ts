import { Match, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const SearchResult = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  excerpt: Schema.String,
  section: Schema.String,
  kind: Schema.String,
})
export type SearchResult = typeof SearchResult.Type

const Results = Schema.Array(SearchResult)
type Results = typeof Results.Type

export const SearchState = defineTaggedUnion({
  Idle: {},
  Loading: { results: Results },
  Ok: { results: Results },
})
export type SearchState = typeof SearchState.Type

export const resultsFromState = (
  state: SearchState,
): ReadonlyArray<SearchResult> =>
  Match.value(state).pipe(
    Match.tag('Ok', ({ results }) => results),
    Match.tag('Loading', ({ results }) => results),
    Match.orElse(() => []),
  )
