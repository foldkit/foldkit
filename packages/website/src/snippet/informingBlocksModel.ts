import { Array, Option, Schema, String } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const Person = Schema.Struct({ id: Schema.Number, name: Schema.String })
export type Person = typeof Person.Type

export const SearchResults = defineTaggedUnion({
  Loading: {},
  Loaded: { query: Schema.String, people: Schema.Array(Person) },
})
export type SearchResults = typeof SearchResults.Type

export const Model = Schema.Struct({
  searchInput: Schema.String,
  searchHistory: Schema.Array(Schema.String),
  results: SearchResults,
})
export type Model = typeof Model.Type

export const routeSearchText = (value: Option.Option<string>): string =>
  Option.getOrElse(value, () => '')

export const addSearchToHistory = (
  history: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
  String.isEmpty(value)
    ? history
    : Array.take(Array.dedupe([value, ...history]), 5)
