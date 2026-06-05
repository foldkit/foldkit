import { Array, Option, String } from 'effect'
import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  HomeRoute,
  Model,
  NestedRoute,
  NotFoundRoute,
  PeopleRoute,
  PersonRoute,
  update,
  view,
} from './main'
import { People } from './page'

const peoplePageWith = (searchInput: string) =>
  People.Model.make({
    searchInput,
    searchHistory: Array.liftPredicate(String.isNonEmpty)(searchInput),
    results: People.SearchLoaded({
      query: searchInput,
      people: People.searchPeople(searchInput),
    }),
  })

const initialPeoplePage = peoplePageWith('')

const home = Model.make({ route: HomeRoute(), peoplePage: initialPeoplePage })
const people = (searchInput: string) =>
  Model.make({
    route: PeopleRoute({
      searchText: Option.liftPredicate(String.isNonEmpty)(searchInput),
    }),
    peoplePage: peoplePageWith(searchInput),
  })
const person = (personId: number) =>
  Model.make({
    route: PersonRoute({ personId }),
    peoplePage: initialPeoplePage,
  })
const nested = Model.make({
  route: NestedRoute(),
  peoplePage: initialPeoplePage,
})
const notFound = (path: string) =>
  Model.make({
    route: NotFoundRoute({ path }),
    peoplePage: initialPeoplePage,
  })

describe('scene', () => {
  test('the nav bar appears on every route', () => {
    Scene.scene(
      { update, view },
      Scene.with(home),
      Scene.expect(Scene.role('link', { name: 'Home' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'People' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Nested' })).toExist(),
    )
  })

  test('the Home route renders its welcome heading', () => {
    Scene.scene(
      { update, view },
      Scene.with(home),
      Scene.expect(Scene.role('heading', { name: 'Welcome Home' })).toExist(),
    )
  })

  test('the Nested route renders its deep-route message', () => {
    Scene.scene(
      { update, view },
      Scene.with(nested),
      Scene.expect(
        Scene.role('heading', { name: 'Very Nested Route!' }),
      ).toExist(),
    )
  })

  test('the People route lists every person', () => {
    Scene.scene(
      { update, view },
      Scene.with(people('')),
      Scene.expect(Scene.text('Alice Johnson')).toExist(),
      Scene.expect(Scene.text('Bob Smith')).toExist(),
      Scene.expect(Scene.text('Carol Davis')).toExist(),
      Scene.expect(Scene.text('David Wilson')).toExist(),
      Scene.expect(Scene.text('Eva Brown')).toExist(),
    )
  })

  test('a search filters People to matches by name or role', () => {
    Scene.scene(
      { update, view },
      Scene.with(people('designer')),
      Scene.expect(Scene.text('Alice Johnson')).toExist(),
      Scene.expect(Scene.text('Eva Brown')).toExist(),
      Scene.expect(Scene.text('Bob Smith')).toBeAbsent(),
      Scene.expect(Scene.text('2 results', { exact: false })).toExist(),
    )
  })

  test('a valid Person route renders the person details', () => {
    Scene.scene(
      { update, view },
      Scene.with(person(1)),
      Scene.expect(Scene.role('heading', { name: 'Alice Johnson' })).toExist(),
      Scene.expect(Scene.text('Designer')).toExist(),
      Scene.expect(Scene.role('link', { name: '← Back to People' })).toExist(),
    )
  })

  test('an unknown Person id renders the not-found panel', () => {
    Scene.scene(
      { update, view },
      Scene.with(person(99)),
      Scene.expect(
        Scene.role('heading', { name: 'Person Not Found' }),
      ).toExist(),
      Scene.expect(Scene.text('No person found with ID: 99')).toExist(),
    )
  })

  test('an unmatched URL renders the NotFound view', () => {
    Scene.scene(
      { update, view },
      Scene.with(notFound('/missing')),
      Scene.expect(
        Scene.role('heading', { name: '404 - Page Not Found' }),
      ).toExist(),
      Scene.expect(Scene.text('The path "/missing" was not found.')).toExist(),
      Scene.expect(Scene.role('link', { name: '← Go Home' })).toExist(),
    )
  })
})
