import { Option } from 'effect'
import { Story } from 'foldkit'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import {
  ChangedUrl,
  GotPeopleMessage,
  HomeRoute,
  type Model,
  PeopleRoute,
  update,
} from './main'
import { People } from './page'

const initialPeoplePage: People.Model = {
  searchInput: '',
  searchHistory: [],
}

const home: Model = { route: HomeRoute(), peoplePage: initialPeoplePage }

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
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
      )
    })

    test('navigating to /people?searchText=foo syncs the submodel input', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/people?searchText=foo'),
          }),
        ),
        Story.model(model => {
          expect(model.peoplePage.searchInput).toBe('foo')
          expect(model.peoplePage.searchHistory).toStrictEqual(['foo'])
        }),
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
  })

  describe('GotPeopleMessage', () => {
    test('typing search text fires a URL replacement command', () => {
      Story.story(
        update,
        Story.with({
          route: PeopleRoute({ searchText: Option.none() }),
          peoplePage: initialPeoplePage,
        }),
        Story.message(
          GotPeopleMessage({
            message: People.ChangedSearchInput({ value: 'designer' }),
          }),
        ),
        Story.Command.expectHas(People.ReplaceSearchUrl),
        Story.Command.resolve(
          People.ReplaceSearchUrl,
          People.CompletedReplaceUrl(),
          message => GotPeopleMessage({ message }),
        ),
        Story.model(model => {
          expect(model.peoplePage.searchInput).toBe('designer')
        }),
      )
    })
  })
})
