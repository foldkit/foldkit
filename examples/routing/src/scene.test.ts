import { Array, Layer, Option, String } from 'effect'
import { expect, given, role, scene, text } from 'foldkit/scene'
import { fromString } from 'foldkit/url'

import { describe, it } from '@effect/vitest'

import { ApplicationLive } from './application'
import { searchPeople } from './domain/person'
import { People, PeopleLive, SearchResults } from './page/people/people'
import { ApplicationRoute } from './route'

const application = ApplicationLive.pipe(Layer.provide(PeopleLive))

const startArgs = {
  url: Option.getOrThrow(fromString('http://localhost/')),
}

const peoplePageWith = (searchInput: string) =>
  People.Model.make({
    searchInput,
    searchHistory: Array.liftPredicate(String.isNonEmpty)(searchInput),
    results: SearchResults.Loaded({
      query: searchInput,
      people: searchPeople(searchInput),
    }),
  })

const initialPeoplePage = peoplePageWith('')

const home = {
  route: ApplicationRoute.Home(),
  peoplePage: initialPeoplePage,
}
const people = (searchInput: string) => ({
  route: ApplicationRoute.People({
    searchText: Option.liftPredicate(String.isNonEmpty)(searchInput),
  }),
  peoplePage: peoplePageWith(searchInput),
})
const person = (personId: number) => ({
  route: ApplicationRoute.Person({ personId }),
  peoplePage: initialPeoplePage,
})
const nested = {
  route: ApplicationRoute.Nested(),
  peoplePage: initialPeoplePage,
}
const filesIndex = {
  route: ApplicationRoute.FilesIndex(),
  peoplePage: initialPeoplePage,
}
const files = (path: Array.NonEmptyReadonlyArray<string>) => ({
  route: ApplicationRoute.Files({ path }),
  peoplePage: initialPeoplePage,
})
const notFound = (path: string) => ({
  route: ApplicationRoute.NotFound({ path }),
  peoplePage: initialPeoplePage,
})

describe('view', () => {
  it.effect('the nav bar appears on every route', () =>
    scene(
      application,
      startArgs,
      given(home),
      expect(role('link', { name: 'Home' })).toExist(),
      expect(role('link', { name: 'People' })).toExist(),
      expect(role('link', { name: 'Files' })).toExist(),
      expect(role('link', { name: 'Nested' })).toExist(),
    ),
  )

  it.effect('the Home route renders its welcome heading', () =>
    scene(
      application,
      startArgs,
      given(home),
      expect(role('heading', { name: 'Welcome Home' })).toExist(),
    ),
  )

  it.effect('the Nested route renders its deep-route message', () =>
    scene(
      application,
      startArgs,
      given(nested),
      expect(role('heading', { name: 'Very Nested Route!' })).toExist(),
    ),
  )

  it.effect('the People route renders the People heading', () =>
    scene(
      application,
      startArgs,
      given(people('')),
      expect(role('heading', { name: 'People' })).toExist(),
    ),
  )

  it.effect('a valid Person route renders the person details', () =>
    scene(
      application,
      startArgs,
      given(person(1)),
      expect(role('heading', { name: 'Alice Johnson' })).toExist(),
      expect(text('Designer')).toExist(),
      expect(role('link', { name: '← Back to People' })).toExist(),
    ),
  )

  it.effect('an unknown Person id renders the not-found panel', () =>
    scene(
      application,
      startArgs,
      given(person(99)),
      expect(role('heading', { name: 'Person Not Found' })).toExist(),
      expect(text('No person found with ID: 99')).toExist(),
    ),
  )

  it.effect('the Files index lists the top-level entries', () =>
    scene(
      application,
      startArgs,
      given(filesIndex),
      expect(role('link', { name: 'documents' })).toExist(),
      expect(role('link', { name: 'photos' })).toExist(),
      expect(role('link', { name: 'notes.txt' })).toExist(),
    ),
  )

  it.effect('a directory path renders breadcrumb links and its entries', () =>
    scene(
      application,
      startArgs,
      given(files(['documents', 'taxes'])),
      expect(role('link', { name: 'documents' })).toExist(),
      expect(role('link', { name: '2024.pdf' })).toExist(),
      expect(role('link', { name: '2025.pdf' })).toExist(),
    ),
  )

  it.effect('a file path renders the file details', () =>
    scene(
      application,
      startArgs,
      given(files(['documents', 'resume.pdf'])),
      expect(role('heading', { name: 'resume.pdf' })).toExist(),
      expect(text('47.1 KB')).toExist(),
    ),
  )

  it.effect('an unknown path under files renders the missing panel', () =>
    scene(
      application,
      startArgs,
      given(files(['documents', 'missing.txt'])),
      expect(role('heading', { name: 'Nothing Here' })).toExist(),
      expect(role('link', { name: '← Back to Files' })).toExist(),
    ),
  )

  it.effect('an unmatched URL renders the NotFound view', () =>
    scene(
      application,
      startArgs,
      given(notFound('/missing')),
      expect(role('heading', { name: '404 - Page Not Found' })).toExist(),
      expect(text('The path "/missing" was not found.')).toExist(),
      expect(role('link', { name: '← Go Home' })).toExist(),
    ),
  )
})
