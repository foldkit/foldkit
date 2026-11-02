import { Array, Effect, Option, String } from 'effect'
import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { ApplicationBlock } from './block'
import { Model } from './model'
import { PeopleBlock } from './page'
import { SearchResults, searchPeople } from './page/people/model'
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
  test('the nav bar appears on every route', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(home),
        expect(role('link', { name: 'Home' })).toExist(),
        expect(role('link', { name: 'People' })).toExist(),
        expect(role('link', { name: 'Files' })).toExist(),
        expect(role('link', { name: 'Nested' })).toExist(),
      ),
    )
  })

  test('the Home route renders its welcome heading', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(home),
        expect(role('heading', { name: 'Welcome Home' })).toExist(),
      ),
    )
  })

  test('the Nested route renders its deep-route message', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(nested),
        expect(role('heading', { name: 'Very Nested Route!' })).toExist(),
      ),
    )
  })

  test('the People route renders the People heading', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(people('')),
        expect(role('heading', { name: 'People' })).toExist(),
      ),
    )
  })

  test('a valid Person route renders the person details', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(person(1)),
        expect(role('heading', { name: 'Alice Johnson' })).toExist(),
        expect(text('Designer')).toExist(),
        expect(role('link', { name: '← Back to People' })).toExist(),
      ),
    )
  })

  test('an unknown Person id renders the not-found panel', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(person(99)),
        expect(role('heading', { name: 'Person Not Found' })).toExist(),
        expect(text('No person found with ID: 99')).toExist(),
      ),
    )
  })

  test('the Files index lists the top-level entries', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(filesIndex),
        expect(role('link', { name: 'documents' })).toExist(),
        expect(role('link', { name: 'photos' })).toExist(),
        expect(role('link', { name: 'notes.txt' })).toExist(),
      ),
    )
  })

  test('a directory path renders breadcrumb links and its entries', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(files(['documents', 'taxes'])),
        expect(role('link', { name: 'documents' })).toExist(),
        expect(role('link', { name: '2024.pdf' })).toExist(),
        expect(role('link', { name: '2025.pdf' })).toExist(),
      ),
    )
  })

  test('a file path renders the file details', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(files(['documents', 'resume.pdf'])),
        expect(role('heading', { name: 'resume.pdf' })).toExist(),
        expect(text('47.1 KB')).toExist(),
      ),
    )
  })

  test('an unknown path under files renders the missing panel', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(files(['documents', 'missing.txt'])),
        expect(role('heading', { name: 'Nothing Here' })).toExist(),
        expect(role('link', { name: '← Back to Files' })).toExist(),
      ),
    )
  })

  test('an unmatched URL renders the NotFound view', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(notFound('/missing')),
        expect(role('heading', { name: '404 - Page Not Found' })).toExist(),
        expect(text('The path "/missing" was not found.')).toExist(),
        expect(role('link', { name: '← Go Home' })).toExist(),
      ),
    )
  })
})
