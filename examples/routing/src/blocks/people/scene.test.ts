import { Array, String } from 'effect'
import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { PeopleBlock, layer } from './index'
import { Model, SearchResults, searchPeople } from './model'

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
    Scene.scene(
      { block: PeopleBlock, layer },
      Scene.given(loaded('')),
      Scene.expect(Scene.role('heading', { name: 'People' })).toExist(),
      Scene.expect(Scene.text('Alice Johnson')).toExist(),
      Scene.expect(Scene.text('Bob Smith')).toExist(),
      Scene.expect(Scene.text('Carol Davis')).toExist(),
      Scene.expect(Scene.text('David Wilson')).toExist(),
      Scene.expect(Scene.text('Eva Brown')).toExist(),
    ),
  )

  it.effect('a search filters matches by name or role', () =>
    Scene.scene(
      { block: PeopleBlock, layer },
      Scene.given(loaded('designer')),
      Scene.expect(Scene.text('Alice Johnson')).toExist(),
      Scene.expect(Scene.text('Eva Brown')).toExist(),
      Scene.expect(Scene.text('Bob Smith')).toBeAbsent(),
      Scene.expect(Scene.text('2 results', { exact: false })).toExist(),
    ),
  )
})
