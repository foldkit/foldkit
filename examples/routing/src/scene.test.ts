import { Array, Option, String } from 'effect'
import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { AppRoute, Model, update, view } from './main'
import { People } from './page'

const peoplePageWith = (searchInput: string) =>
  People.Model.make({
    searchInput,
    searchHistory: Array.liftPredicate(String.isNonEmpty)(searchInput),
    results: People.SearchResults.Loaded({
      query: searchInput,
      people: People.searchPeople(searchInput),
    }),
  })

const initialPeoplePage = peoplePageWith('')

const home = Model.make({
  route: AppRoute.Home(),
  peoplePage: initialPeoplePage,
})
const people = (searchInput: string) =>
  Model.make({
    route: AppRoute.People({
      searchText: Option.liftPredicate(String.isNonEmpty)(searchInput),
    }),
    peoplePage: peoplePageWith(searchInput),
  })
const person = (personId: number) =>
  Model.make({
    route: AppRoute.Person({ personId }),
    peoplePage: initialPeoplePage,
  })
const nested = Model.make({
  route: AppRoute.Nested(),
  peoplePage: initialPeoplePage,
})
const filesIndex = Model.make({
  route: AppRoute.FilesIndex(),
  peoplePage: initialPeoplePage,
})
const files = (path: Array.NonEmptyReadonlyArray<string>) =>
  Model.make({
    route: AppRoute.Files({ path }),
    peoplePage: initialPeoplePage,
  })
const notFound = (path: string) =>
  Model.make({
    route: AppRoute.NotFound({ path }),
    peoplePage: initialPeoplePage,
  })

describe('view', () => {
  test('the nav bar appears on every route', () => {
    scene(
      { update, view },
      given(home),
      expect(role('link', { name: 'Home' })).toExist(),
      expect(role('link', { name: 'People' })).toExist(),
      expect(role('link', { name: 'Files' })).toExist(),
      expect(role('link', { name: 'Nested' })).toExist(),
    )
  })

  test('the Home route renders its welcome heading', () => {
    scene(
      { update, view },
      given(home),
      expect(role('heading', { name: 'Welcome Home' })).toExist(),
    )
  })

  test('the Nested route renders its deep-route message', () => {
    scene(
      { update, view },
      given(nested),
      expect(role('heading', { name: 'Very Nested Route!' })).toExist(),
    )
  })

  test('the People route renders the People heading', () => {
    scene(
      { update, view },
      given(people('')),
      expect(role('heading', { name: 'People' })).toExist(),
    )
  })

  test('a valid Person route renders the person details', () => {
    scene(
      { update, view },
      given(person(1)),
      expect(role('heading', { name: 'Alice Johnson' })).toExist(),
      expect(text('Designer')).toExist(),
      expect(role('link', { name: '← Back to People' })).toExist(),
    )
  })

  test('an unknown Person id renders the not-found panel', () => {
    scene(
      { update, view },
      given(person(99)),
      expect(role('heading', { name: 'Person Not Found' })).toExist(),
      expect(text('No person found with ID: 99')).toExist(),
    )
  })

  test('the Files index lists the top-level entries', () => {
    scene(
      { update, view },
      given(filesIndex),
      expect(role('link', { name: 'documents' })).toExist(),
      expect(role('link', { name: 'photos' })).toExist(),
      expect(role('link', { name: 'notes.txt' })).toExist(),
    )
  })

  test('a directory path renders breadcrumb links and its entries', () => {
    scene(
      { update, view },
      given(files(['documents', 'taxes'])),
      expect(role('link', { name: 'documents' })).toExist(),
      expect(role('link', { name: '2024.pdf' })).toExist(),
      expect(role('link', { name: '2025.pdf' })).toExist(),
    )
  })

  test('a file path renders the file details', () => {
    scene(
      { update, view },
      given(files(['documents', 'resume.pdf'])),
      expect(role('heading', { name: 'resume.pdf' })).toExist(),
      expect(text('47.1 KB')).toExist(),
    )
  })

  test('an unknown path under files renders the missing panel', () => {
    scene(
      { update, view },
      given(files(['documents', 'missing.txt'])),
      expect(role('heading', { name: 'Nothing Here' })).toExist(),
      expect(role('link', { name: '← Back to Files' })).toExist(),
    )
  })

  test('an unmatched URL renders the NotFound view', () => {
    scene(
      { update, view },
      given(notFound('/missing')),
      expect(role('heading', { name: '404 - Page Not Found' })).toExist(),
      expect(text('The path "/missing" was not found.')).toExist(),
      expect(role('link', { name: '← Go Home' })).toExist(),
    )
  })
})
