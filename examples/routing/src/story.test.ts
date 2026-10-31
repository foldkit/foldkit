import { Array, Layer, Option, String } from 'effect'
import { Block } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'

import { describe, expect, it } from '@effect/vitest'

import { ApplicationLive, Message, NavigateInternal } from './application'
import { searchPeople } from './domain/person'
import {
  FetchPeople,
  People,
  PeopleLive,
  SearchResults,
} from './page/people/people'
import {
  ApplicationRoute,
  filesIndexRouter,
  homeRouter,
  nestedRouter,
  peopleRouter,
} from './route'

type PeopleMessage = typeof People.Message.Type

const application = ApplicationLive.pipe(Layer.provide(PeopleLive))

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

const peopleMessage = (message: PeopleMessage) =>
  Block.deliver(People, 'peoplePage', message)

const home = {
  route: ApplicationRoute.Home(),
  peoplePage: initialPeoplePage,
}

const onPeople = (searchInput: string) => ({
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

const startArgs = { url: urlOrThrow('http://localhost/') }

const resolveFetch = (searchText: string) =>
  Command.resolve(
    FetchPeople,
    People.Message.CompletedFetchPeople({
      query: searchText,
      people: searchPeople(searchText),
    }),
  )

describe('update', () => {
  describe('EnteredNavigationShortcut', () => {
    it.effect('GH produces the Home navigation Command', () =>
      story(
        application,
        startArgs,
        given(home),
        message(Message.EnteredNavigationShortcut({ shortcut: 'GH' })),
        Command.expectHas(NavigateInternal({ url: homeRouter() })),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
      ),
    )

    it.effect('GP produces the People navigation Command', () =>
      story(
        application,
        startArgs,
        given(home),
        message(Message.EnteredNavigationShortcut({ shortcut: 'GP' })),
        Command.expectHas(
          NavigateInternal({
            url: peopleRouter({ searchText: Option.none() }),
          }),
        ),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
      ),
    )

    it.effect('GF produces the Files navigation Command', () =>
      story(
        application,
        startArgs,
        given(home),
        message(Message.EnteredNavigationShortcut({ shortcut: 'GF' })),
        Command.expectHas(NavigateInternal({ url: filesIndexRouter() })),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
      ),
    )

    it.effect('GN produces the Nested navigation Command', () =>
      story(
        application,
        startArgs,
        given(home),
        message(Message.EnteredNavigationShortcut({ shortcut: 'GN' })),
        Command.expectHas(NavigateInternal({ url: nestedRouter() })),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
      ),
    )
  })

  describe('ChangedUrl', () => {
    it.effect('navigating to /people parses to a People route', () =>
      story(
        application,
        startArgs,
        given(home),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/people') }),
        ),
        model(model => {
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
        story(
          application,
          startArgs,
          given(home),
          message(
            Message.ChangedUrl({
              url: urlOrThrow('http://localhost/people?searchText=foo'),
            }),
          ),
          model(model => {
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
        story(
          application,
          startArgs,
          given(home),
          message(
            Message.ChangedUrl({
              url: urlOrThrow('http://localhost/people/3'),
            }),
          ),
          model(model => {
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
        story(
          application,
          startArgs,
          given(home),
          message(
            Message.ChangedUrl({ url: urlOrThrow('http://localhost/missing') }),
          ),
          model(model => {
            if (model.route._tag === 'NotFound') {
              expect(model.route.path).toBe('/missing')
            } else {
              throw new Error('Expected NotFound route')
            }
          }),
        ),
    )

    it.effect('the deep nested path resolves to Nested', () =>
      story(
        application,
        startArgs,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/nested/route/is/very/nested'),
          }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Nested')
        }),
      ),
    )

    it.effect('navigating to /files parses to the FilesIndex route', () =>
      story(
        application,
        startArgs,
        given(home),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/files') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('FilesIndex')
        }),
      ),
    )

    it.effect('navigating under /files captures the remaining segments', () =>
      story(
        application,
        startArgs,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/files/documents/taxes'),
          }),
        ),
        model(model => {
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
        story(
          application,
          startArgs,
          given(onPeople('')),
          message(
            Message.ChangedUrl({
              url: urlOrThrow('http://localhost/people?searchText=designer'),
            }),
          ),
          model(model => {
            expect(model.peoplePage.searchInput).toBe('designer')
            expect(model.peoplePage.searchHistory).toStrictEqual(['designer'])
            expect(model.peoplePage.results._tag).toBe('Loading')
          }),
          Command.expectHas(FetchPeople),
          resolveFetch('designer'),
          model(model => {
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
      story(
        application,
        startArgs,
        given(onPeople('designer')),
        message(
          Message.ChangedUrl({
            url: urlOrThrow(
              'http://localhost/people?searchText=designer#results',
            ),
          }),
        ),
        model(model => {
          expect(model.peoplePage.searchInput).toBe('designer')
          expect(model.peoplePage.searchHistory).toStrictEqual(['designer'])
          expect(model.peoplePage.results._tag).toBe('Loading')
        }),
        Command.expectHas(FetchPeople),
        resolveFetch('designer'),
      ),
    )
  })

  describe('generated People Message', () => {
    it.effect('writes through to peoplePage', () =>
      story(
        application,
        startArgs,
        given(onPeople('')),
        message(
          peopleMessage(People.Message.ChangedSearchInput({ value: 'd' })),
        ),
        model(model => {
          expect(model.peoplePage.searchInput).toBe('d')
        }),
      ),
    )
  })
})
