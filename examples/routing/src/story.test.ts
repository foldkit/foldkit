import { Array, Option, String } from 'effect'
import { Story } from 'foldkit'
import { fromString } from 'foldkit/url'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { PeopleBlock } from './blocks'
import { FetchPeople } from './blocks/people/command'
import { SearchResults, searchPeople } from './blocks/people/model'
import { NavigateInternal } from './command'
import { PeoplePageBinding } from './composition'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { Model } from './model'
import {
  ApplicationRoute,
  filesIndexRouter,
  homeRouter,
  nestedRouter,
  peopleRouter,
} from './route'

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

const onPeople = (searchInput: string) =>
  Model.make({
    route: ApplicationRoute.People({
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
    FetchPeople,
    PeopleBlock.Message.CompletedFetchPeople({
      query: searchText,
      people: searchPeople(searchText),
    }),
  )

describe('update', () => {
  describe('EnteredNavigationShortcut', () => {
    it.effect('GH produces the Home navigation Command', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(home),
        Story.message(Message.EnteredNavigationShortcut({ shortcut: 'GH' })),
        Story.Command.expectHas(NavigateInternal({ url: homeRouter() })),
        Story.Command.resolve(
          NavigateInternal,
          Message.CompletedNavigateInternal(),
        ),
      ),
    )

    it.effect('GP produces the People navigation Command', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(home),
        Story.message(Message.EnteredNavigationShortcut({ shortcut: 'GP' })),
        Story.Command.expectHas(
          NavigateInternal({
            url: peopleRouter({ searchText: Option.none() }),
          }),
        ),
        Story.Command.resolve(
          NavigateInternal,
          Message.CompletedNavigateInternal(),
        ),
      ),
    )

    it.effect('GF produces the Files navigation Command', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(home),
        Story.message(Message.EnteredNavigationShortcut({ shortcut: 'GF' })),
        Story.Command.expectHas(NavigateInternal({ url: filesIndexRouter() })),
        Story.Command.resolve(
          NavigateInternal,
          Message.CompletedNavigateInternal(),
        ),
      ),
    )

    it.effect('GN produces the Nested navigation Command', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(home),
        Story.message(Message.EnteredNavigationShortcut({ shortcut: 'GN' })),
        Story.Command.expectHas(NavigateInternal({ url: nestedRouter() })),
        Story.Command.resolve(
          NavigateInternal,
          Message.CompletedNavigateInternal(),
        ),
      ),
    )
  })

  describe('ChangedUrl', () => {
    it.effect('navigating to /people parses to a People route', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(home),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/people') }),
        ),
        Story.model(model => {
          if (model.route._tag === 'People') {
            expect(model.route.searchText).toStrictEqual(Option.none())
          } else {
            throw new Error('Expected People route')
          }
        }),
        resolveFetch(''),
      ),
    )

    it.effect(
      'navigating to /people?searchText=foo captures the query parameter',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(home),
          Story.message(
            Message.ChangedUrl({
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
        ),
    )

    it.effect(
      'navigating to /people/3 parses to a Person route with numeric id',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(home),
          Story.message(
            Message.ChangedUrl({
              url: urlOrThrow('http://localhost/people/3'),
            }),
          ),
          Story.model(model => {
            if (model.route._tag === 'Person') {
              expect(model.route.personId).toBe(3)
            } else {
              throw new Error('Expected Person route')
            }
          }),
        ),
    )

    it.effect(
      'an unknown path falls through to NotFound with the path captured',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(home),
          Story.message(
            Message.ChangedUrl({ url: urlOrThrow('http://localhost/missing') }),
          ),
          Story.model(model => {
            if (model.route._tag === 'NotFound') {
              expect(model.route.path).toBe('/missing')
            } else {
              throw new Error('Expected NotFound route')
            }
          }),
        ),
    )

    it.effect('the deep nested path resolves to Nested', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(home),
        Story.message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/nested/route/is/very/nested'),
          }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Nested')
        }),
      ),
    )

    it.effect('navigating to /files parses to the FilesIndex route', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(home),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/files') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('FilesIndex')
        }),
      ),
    )

    it.effect('navigating under /files captures the remaining segments', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(home),
        Story.message(
          Message.ChangedUrl({
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
      ),
    )

    it.effect(
      'a same-page URL change syncs the input, records history, and refetches',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(onPeople('')),
          Story.message(
            Message.ChangedUrl({
              url: urlOrThrow('http://localhost/people?searchText=designer'),
            }),
          ),
          Story.model(model => {
            expect(model.peoplePage.searchInput).toBe('designer')
            expect(model.peoplePage.searchHistory).toStrictEqual(['designer'])
            expect(model.peoplePage.results._tag).toBe('Loading')
          }),
          Story.Command.expectHas(FetchPeople),
          resolveFetch('designer'),
          Story.model(model => {
            if (model.peoplePage.results._tag === 'Loaded') {
              expect(
                model.peoplePage.results.people.map(person => person.name),
              ).toStrictEqual(['Alice Johnson', 'Eva Brown'])
            } else {
              throw new Error('Expected SearchLoaded')
            }
          }),
        ),
    )

    it.effect('a hash-only URL change keeps the People page in sync', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(onPeople('designer')),
        Story.message(
          Message.ChangedUrl({
            url: urlOrThrow(
              'http://localhost/people?searchText=designer#results',
            ),
          }),
        ),
        Story.model(model => {
          expect(model.peoplePage.searchInput).toBe('designer')
          expect(model.peoplePage.searchHistory).toStrictEqual(['designer'])
          expect(model.peoplePage.results._tag).toBe('Loading')
        }),
        Story.Command.expectHas(FetchPeople),
        resolveFetch('designer'),
      ),
    )
  })

  describe('generated People Message', () => {
    it.effect('writes through to peoplePage', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(onPeople('')),
        Story.messageIn(
          PeoplePageBinding,
          PeopleBlock.Message.ChangedSearchInput({ value: 'd' }),
        ),
        Story.model(model => {
          expect(model.peoplePage.searchInput).toBe('d')
        }),
      ),
    )
  })
})
