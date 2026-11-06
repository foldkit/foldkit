import { Array, Option, String } from 'effect'
import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { PeopleBlock } from './blocks'
import { SearchResults, searchPeople } from './blocks/people/model'
import { ApplicationBlock, layer } from './index'
import { Model } from './model'
import { ApplicationRoute } from './route'

const peoplePageWith = (searchInput: string) =>
  PeopleBlock.Model.make({
    searchInput,
    searchHistory: Array.liftPredicate(String.isNonEmpty)(searchInput),
    results: SearchResults.Loaded({
      query: searchInput,
      people: searchPeople(searchInput),
    }),
  })

const initialPeoplePage = peoplePageWith('')

const home = Model.make({
  route: ApplicationRoute.Home(),
  peoplePage: initialPeoplePage,
})
const people = (searchInput: string) =>
  Model.make({
    route: ApplicationRoute.People({
      searchText: Option.liftPredicate(String.isNonEmpty)(searchInput),
    }),
    peoplePage: peoplePageWith(searchInput),
  })
const person = (personId: number) =>
  Model.make({
    route: ApplicationRoute.Person({ personId }),
    peoplePage: initialPeoplePage,
  })
const nested = Model.make({
  route: ApplicationRoute.Nested(),
  peoplePage: initialPeoplePage,
})
const filesIndex = Model.make({
  route: ApplicationRoute.FilesIndex(),
  peoplePage: initialPeoplePage,
})
const files = (path: Array.NonEmptyReadonlyArray<string>) =>
  Model.make({
    route: ApplicationRoute.Files({ path }),
    peoplePage: initialPeoplePage,
  })
const notFound = (path: string) =>
  Model.make({
    route: ApplicationRoute.NotFound({ path }),
    peoplePage: initialPeoplePage,
  })

describe('view', () => {
  it.effect('the nav bar appears on every route', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(home),
      Scene.expect(Scene.role('link', { name: 'Home' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'People' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Files' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Nested' })).toExist(),
    ),
  )

  it.effect('the Home route renders its welcome heading', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(home),
      Scene.expect(Scene.role('heading', { name: 'Welcome Home' })).toExist(),
    ),
  )

  it.effect('the Nested route renders its deep-route message', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(nested),
      Scene.expect(
        Scene.role('heading', { name: 'Very Nested Route!' }),
      ).toExist(),
    ),
  )

  it.effect('the People route renders the People heading', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(people('')),
      Scene.expect(Scene.role('heading', { name: 'People' })).toExist(),
    ),
  )

  it.effect('a valid Person route renders the person details', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(person(1)),
      Scene.expect(Scene.role('heading', { name: 'Alice Johnson' })).toExist(),
      Scene.expect(Scene.text('Designer')).toExist(),
      Scene.expect(Scene.role('link', { name: '← Back to People' })).toExist(),
    ),
  )

  it.effect('an unknown Person id renders the not-found panel', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(person(99)),
      Scene.expect(
        Scene.role('heading', { name: 'Person Not Found' }),
      ).toExist(),
      Scene.expect(Scene.text('No person found with ID: 99')).toExist(),
    ),
  )

  it.effect('the Files index lists the top-level entries', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(filesIndex),
      Scene.expect(Scene.role('link', { name: 'documents' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'photos' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'notes.txt' })).toExist(),
    ),
  )

  it.effect('a directory path renders breadcrumb links and its entries', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(files(['documents', 'taxes'])),
      Scene.expect(Scene.role('link', { name: 'documents' })).toExist(),
      Scene.expect(Scene.role('link', { name: '2024.pdf' })).toExist(),
      Scene.expect(Scene.role('link', { name: '2025.pdf' })).toExist(),
    ),
  )

  it.effect('a file path renders the file details', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(files(['documents', 'resume.pdf'])),
      Scene.expect(Scene.role('heading', { name: 'resume.pdf' })).toExist(),
      Scene.expect(Scene.text('47.1 KB')).toExist(),
    ),
  )

  it.effect('an unknown path under files renders the missing panel', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(files(['documents', 'missing.txt'])),
      Scene.expect(Scene.role('heading', { name: 'Nothing Here' })).toExist(),
      Scene.expect(Scene.role('link', { name: '← Back to Files' })).toExist(),
    ),
  )

  it.effect('an unmatched URL renders the NotFound view', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(notFound('/missing')),
      Scene.expect(
        Scene.role('heading', { name: '404 - Page Not Found' }),
      ).toExist(),
      Scene.expect(Scene.text('The path "/missing" was not found.')).toExist(),
      Scene.expect(Scene.role('link', { name: '← Go Home' })).toExist(),
    ),
  )
})
