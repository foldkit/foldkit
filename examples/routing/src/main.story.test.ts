import { Option } from 'effect'
import { Story } from 'foldkit'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import {
  ChangedSearchInput,
  ChangedUrl,
  CompletedNavigateInternal,
  HomeRoute,
  type Model,
  PeopleRoute,
  ReplaceSearchUrl,
  update,
} from './main'

const home: Model = { route: HomeRoute() }

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

  describe('ChangedSearchInput', () => {
    test('typing search text fires a URL replacement command', () => {
      Story.story(
        update,
        Story.with({ route: PeopleRoute({ searchText: Option.none() }) }),
        Story.message(ChangedSearchInput({ value: 'designer' })),
        Story.Command.expectHas(ReplaceSearchUrl),
        Story.Command.resolve(ReplaceSearchUrl, CompletedNavigateInternal()),
      )
    })

    test('clearing the search input still fires a URL replacement', () => {
      Story.story(
        update,
        Story.with({
          route: PeopleRoute({ searchText: Option.some('foo') }),
        }),
        Story.message(ChangedSearchInput({ value: '' })),
        Story.Command.expectHas(ReplaceSearchUrl),
        Story.Command.resolve(ReplaceSearchUrl, CompletedNavigateInternal()),
      )
    })
  })
})
