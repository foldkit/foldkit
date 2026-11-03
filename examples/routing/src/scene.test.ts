import { Array, Option, String } from 'effect'
import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock } from './block'
import { PeopleBlock } from './blocks'
import { SearchResults, searchPeople } from './blocks/people/model'
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
    scene(
      ApplicationBlock,
      given(home),
      expect(role('link', { name: 'Home' })).toExist(),
      expect(role('link', { name: 'People' })).toExist(),
      expect(role('link', { name: 'Files' })).toExist(),
      expect(role('link', { name: 'Nested' })).toExist(),
    ),
  )

  it.effect('the Home route renders its welcome heading', () =>
    scene(
      ApplicationBlock,
      given(home),
      expect(role('heading', { name: 'Welcome Home' })).toExist(),
    ),
  )

  it.effect('the Nested route renders its deep-route message', () =>
    scene(
      ApplicationBlock,
      given(nested),
      expect(role('heading', { name: 'Very Nested Route!' })).toExist(),
    ),
  )

  it.effect('the People route renders the People heading', () =>
    scene(
      ApplicationBlock,
      given(people('')),
      expect(role('heading', { name: 'People' })).toExist(),
    ),
  )

  it.effect('a valid Person route renders the person details', () =>
    scene(
      ApplicationBlock,
      given(person(1)),
      expect(role('heading', { name: 'Alice Johnson' })).toExist(),
      expect(text('Designer')).toExist(),
      expect(role('link', { name: '← Back to People' })).toExist(),
    ),
  )

  it.effect('an unknown Person id renders the not-found panel', () =>
    scene(
      ApplicationBlock,
      given(person(99)),
      expect(role('heading', { name: 'Person Not Found' })).toExist(),
      expect(text('No person found with ID: 99')).toExist(),
    ),
  )

  it.effect('the Files index lists the top-level entries', () =>
    scene(
      ApplicationBlock,
      given(filesIndex),
      expect(role('link', { name: 'documents' })).toExist(),
      expect(role('link', { name: 'photos' })).toExist(),
      expect(role('link', { name: 'notes.txt' })).toExist(),
    ),
  )

  it.effect('a directory path renders breadcrumb links and its entries', () =>
    scene(
      ApplicationBlock,
      given(files(['documents', 'taxes'])),
      expect(role('link', { name: 'documents' })).toExist(),
      expect(role('link', { name: '2024.pdf' })).toExist(),
      expect(role('link', { name: '2025.pdf' })).toExist(),
    ),
  )

  it.effect('a file path renders the file details', () =>
    scene(
      ApplicationBlock,
      given(files(['documents', 'resume.pdf'])),
      expect(role('heading', { name: 'resume.pdf' })).toExist(),
      expect(text('47.1 KB')).toExist(),
    ),
  )

  it.effect('an unknown path under files renders the missing panel', () =>
    scene(
      ApplicationBlock,
      given(files(['documents', 'missing.txt'])),
      expect(role('heading', { name: 'Nothing Here' })).toExist(),
      expect(role('link', { name: '← Back to Files' })).toExist(),
    ),
  )

  it.effect('an unmatched URL renders the NotFound view', () =>
    scene(
      ApplicationBlock,
      given(notFound('/missing')),
      expect(role('heading', { name: '404 - Page Not Found' })).toExist(),
      expect(text('The path "/missing" was not found.')).toExist(),
      expect(role('link', { name: '← Go Home' })).toExist(),
    ),
  )
})
