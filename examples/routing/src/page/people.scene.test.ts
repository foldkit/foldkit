import { Array, String } from 'effect'
import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Model, SearchResults, searchPeople, update, view } from './people'

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
  test('lists every person', () => {
    scene(
      { update, view },
      given(loaded('')),
      expect(role('heading', { name: 'People' })).toExist(),
      expect(text('Alice Johnson')).toExist(),
      expect(text('Bob Smith')).toExist(),
      expect(text('Carol Davis')).toExist(),
      expect(text('David Wilson')).toExist(),
      expect(text('Eva Brown')).toExist(),
    )
  })

  test('a search filters matches by name or role', () => {
    scene(
      { update, view },
      given(loaded('designer')),
      expect(text('Alice Johnson')).toExist(),
      expect(text('Eva Brown')).toExist(),
      expect(text('Bob Smith')).toBeAbsent(),
      expect(text('2 results', { exact: false })).toExist(),
    )
  })
})
