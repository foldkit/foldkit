import { Array, Duration, Option, Schema, String, pipe } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import type { PeopleRoute } from '../../route'

export const Person = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  role: Schema.String,
})
export type Person = typeof Person.Type

const people: ReadonlyArray<Person> = [
  { id: 1, name: 'Alice Johnson', role: 'Designer' },
  { id: 2, name: 'Bob Smith', role: 'Developer' },
  { id: 3, name: 'Carol Davis', role: 'Manager' },
  { id: 4, name: 'David Wilson', role: 'Developer' },
  { id: 5, name: 'Eva Brown', role: 'Designer' },
]

const SEARCH_HISTORY_LIMIT = 5
export const SEARCH_LATENCY = Duration.millis(300)

const matchesQuery = (person: Person, query: string): boolean => {
  const lowerQuery = query.toLowerCase()
  return (
    person.name.toLowerCase().includes(lowerQuery) ||
    person.role.toLowerCase().includes(lowerQuery)
  )
}

export const searchPeople = (searchText: string): ReadonlyArray<Person> =>
  pipe(
    searchText,
    Option.liftPredicate(String.isNonEmpty),
    Option.match({
      onNone: () => people,
      onSome: query =>
        Array.filter(people, person => matchesQuery(person, query)),
    }),
  )

export const addSearchToHistory = (
  history: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> => {
  if (String.isEmpty(value)) {
    return history
  }

  return Array.take(Array.dedupe([value, ...history]), SEARCH_HISTORY_LIMIT)
}

export const routeSearchText = (route: PeopleRoute): string =>
  Option.getOrElse(route.searchText, () => '')

export const findPerson = (id: number) =>
  Array.findFirst(people, person => person.id === id)

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
