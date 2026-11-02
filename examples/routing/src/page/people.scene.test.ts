import { Array, Effect, String } from 'effect'
import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { PeopleBlock, layer } from './people/block'
import { Model, SearchResults, searchPeople } from './people/model'

const loaded = (searchInput: string) =>
  Model.make({
    searchInput,
    searchHistory: Array.liftPredicate(String.isNonEmpty)(searchInput),
    results: SearchResults.Loaded({
      query: searchInput,
      people: searchPeople(searchInput),
    }),
  })

describe('people', () => {
  test('lists every person', async () => {
    await Effect.runPromise(
      scene(
        PeopleBlock,
        given(loaded('')),
        expect(role('heading', { name: 'People' })).toExist(),
        expect(text('Alice Johnson')).toExist(),
        expect(text('Bob Smith')).toExist(),
        expect(text('Carol Davis')).toExist(),
        expect(text('David Wilson')).toExist(),
        expect(text('Eva Brown')).toExist(),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('a search filters matches by name or role', async () => {
    await Effect.runPromise(
      scene(
        PeopleBlock,
        given(loaded('designer')),
        expect(text('Alice Johnson')).toExist(),
        expect(text('Eva Brown')).toExist(),
        expect(text('Bob Smith')).toBeAbsent(),
        expect(text('2 results', { exact: false })).toExist(),
      ).pipe(Effect.provide(layer)),
    )
  })
})
