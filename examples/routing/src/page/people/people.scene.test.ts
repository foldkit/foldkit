import { Array, Option, String } from 'effect'
import { expect, given, role, scene, text } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { searchPeople } from '../../domain/person'
import { ApplicationRoute } from '../../route'
import { Model, PeopleLive, SearchResults } from './people'

const startArgs = {
  route: ApplicationRoute.People({ searchText: Option.none() }),
}

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
  it.effect('lists every person', () =>
    scene(
      PeopleLive,
      startArgs,
      given(loaded('')),
      expect(role('heading', { name: 'People' })).toExist(),
      expect(text('Alice Johnson')).toExist(),
      expect(text('Bob Smith')).toExist(),
      expect(text('Carol Davis')).toExist(),
      expect(text('David Wilson')).toExist(),
      expect(text('Eva Brown')).toExist(),
    ),
  )

  it.effect('a search filters matches by name or role', () =>
    scene(
      PeopleLive,
      startArgs,
      given(loaded('designer')),
      expect(text('Alice Johnson')).toExist(),
      expect(text('Eva Brown')).toExist(),
      expect(text('Bob Smith')).toBeAbsent(),
      expect(text('2 results', { exact: false })).toExist(),
    ),
  )
})
