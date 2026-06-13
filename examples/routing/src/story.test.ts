import { Array, Option, String } from 'effect'
import { Story } from 'foldkit'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import {
  ChangedUrl,
  GotPeopleMessage,
  HomeRoute,
  Model,
  PeopleRoute,
  update,
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

const onPeople = (searchInput: string) =>
  Model.make({
    route: PeopleRoute({
      searchText: Option.liftPredicate(String.isNonEmpty)(searchInput),
    }),
    peoplePage: peoplePageWith(searchInput),
  })

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const resolveFetch = (searchText: string) =>
  Story.Command.resolve(
    People.FetchPeople,
    People.SucceededFetchPeople({
      query: searchText,
      people: People.searchPeople(searchText),
    }),
    message => GotPeopleMessage({ message }),
  )

describe('update', () => {
  describe('ChangedUrl', () => {
    test('navigating to /people parses to a People route', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/people') }),
        ),
        Story.model(model => {
          if (model.route._tag === 'People') {
            expect(model.route.searchText).toStrictEqual(Option.none())
          } else {
            throw new Error('Expected People route')
          }
        }),
        resolveFetch(''),
      )
    })

    test('navigating to /people?searchText=foo captures the query parameter', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/people?searchText=foo'),
          }),
        ),
        Story.model(model => {
          if (model.route._tag === 'People') {
            expect(model.route.searchText).toStrictEqual(Option.some('foo'))
          } else {
            throw new Error('Expected People route')
          }
        }),
        resolveFetch('foo'),
      )
    })

    test('navigating to /people/3 parses to a Person route with numeric id', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/people/3') }),
        ),
        Story.model(model => {
          if (model.route._tag === 'Person') {
            expect(model.route.personId).toBe(3)
          } else {
            throw new Error('Expected Person route')
          }
        }),
      )
    })

    test('an unknown path falls through to NotFound with the path captured', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/missing') }),
        ),
        Story.model(model => {
          if (model.route._tag === 'NotFound') {
            expect(model.route.path).toBe('/missing')
          } else {
            throw new Error('Expected NotFound route')
          }
        }),
      )
    })

    test('the deep nested path resolves to Nested', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/nested/route/is/very/nested'),
          }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Nested')
        }),
      )
    })

    test('navigating to /files parses to the FilesIndex route', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/files') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('FilesIndex')
        }),
      )
    })

    test('navigating under /files captures the remaining segments', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/files/documents/taxes'),
          }),
        ),
        Story.model(model => {
          if (model.route._tag === 'Files') {
            expect(model.route.path).toStrictEqual(['documents', 'taxes'])
          } else {
            throw new Error('Expected Files route')
          }
        }),
      )
    })

    test('a same-page URL change syncs the input, records history, and refetches', () => {
      Story.story(
        update,
        Story.with(onPeople('')),
        Story.message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/people?searchText=designer'),
          }),
        ),
        Story.model(model => {
          expect(model.peoplePage.searchInput).toBe('designer')
          expect(model.peoplePage.searchHistory).toStrictEqual(['designer'])
          expect(model.peoplePage.results._tag).toBe('SearchLoading')
        }),
        Story.Command.expectHas(People.FetchPeople),
        resolveFetch('designer'),
        Story.model(model => {
          if (model.peoplePage.results._tag === 'SearchLoaded') {
            expect(
              model.peoplePage.results.people.map(person => person.name),
            ).toStrictEqual(['Alice Johnson', 'Eva Brown'])
          } else {
            throw new Error('Expected SearchLoaded')
          }
        }),
      )
    })
  })

  describe('GotPeopleMessage', () => {
    test('typing updates the input without recording history or firing a command', () => {
      Story.story(
        update,
        Story.with(onPeople('')),
        Story.message(
          GotPeopleMessage({
            message: People.ChangedSearchInput({ value: 'd' }),
          }),
        ),
        Story.message(
          GotPeopleMessage({
            message: People.ChangedSearchInput({ value: 'de' }),
          }),
        ),
        Story.message(
          GotPeopleMessage({
            message: People.ChangedSearchInput({ value: 'designer' }),
          }),
        ),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.peoplePage.searchInput).toBe('designer')
          expect(model.peoplePage.searchHistory).toStrictEqual([])
        }),
      )
    })

    test('submitting the search pushes the current input to the URL', () => {
      Story.story(
        update,
        Story.with(onPeople('designer')),
        Story.message(GotPeopleMessage({ message: People.SubmittedSearch() })),
        Story.Command.expectHas(People.PushSearchUrl),
        Story.Command.resolve(
          People.PushSearchUrl,
          People.CompletedPushSearchUrl(),
          message => GotPeopleMessage({ message }),
        ),
      )
    })
  })
})
