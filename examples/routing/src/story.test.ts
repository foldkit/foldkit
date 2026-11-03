import { Array, Effect, Option, String } from 'effect'
import {
  Command,
  given,
  message,
  messageFrom,
  model,
  story,
} from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { ApplicationBlock } from './block'
import { PeopleBlock } from './blocks'
import { FetchPeople } from './blocks/people/command'
import { SearchResults, searchPeople } from './blocks/people/model'
import { NavigateInternal } from './command'
import { PeoplePageBinding } from './composition'
import { Message } from './message'
import { Model } from './model'
import {
  ApplicationRoute,
  filesIndexRouter,
  homeRouter,
  nestedRouter,
  peopleRouter,
} from './route'

type PeopleMessage = typeof PeopleBlock.Message.Type

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

const peopleMessage = (message: PeopleMessage) =>
  messageFrom(PeoplePageBinding, message)

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
  Command.resolve(
    FetchPeople,
    PeopleBlock.Message.CompletedFetchPeople({
      query: searchText,
      people: searchPeople(searchText),
    }),
  )

describe('update', () => {
  describe('EnteredNavigationShortcut', () => {
    test('GH produces the Home navigation Command', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(home),
          message(Message.EnteredNavigationShortcut({ shortcut: 'GH' })),
          Command.expectHas(NavigateInternal({ url: homeRouter() })),
          Command.resolve(
            NavigateInternal,
            Message.CompletedNavigateInternal(),
          ),
        ),
      )
    })

    test('GP produces the People navigation Command', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(home),
          message(Message.EnteredNavigationShortcut({ shortcut: 'GP' })),
          Command.expectHas(
            NavigateInternal({
              url: peopleRouter({ searchText: Option.none() }),
            }),
          ),
          Command.resolve(
            NavigateInternal,
            Message.CompletedNavigateInternal(),
          ),
        ),
      )
    })

    test('GF produces the Files navigation Command', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(home),
          message(Message.EnteredNavigationShortcut({ shortcut: 'GF' })),
          Command.expectHas(NavigateInternal({ url: filesIndexRouter() })),
          Command.resolve(
            NavigateInternal,
            Message.CompletedNavigateInternal(),
          ),
        ),
      )
    })

    test('GN produces the Nested navigation Command', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(home),
          message(Message.EnteredNavigationShortcut({ shortcut: 'GN' })),
          Command.expectHas(NavigateInternal({ url: nestedRouter() })),
          Command.resolve(
            NavigateInternal,
            Message.CompletedNavigateInternal(),
          ),
        ),
      )
    })
  })

  describe('ChangedUrl', () => {
    test('navigating to /people parses to a People route', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('navigating to /people?searchText=foo captures the query parameter', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('navigating to /people/3 parses to a Person route with numeric id', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('an unknown path falls through to NotFound with the path captured', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('the deep nested path resolves to Nested', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('navigating to /files parses to the FilesIndex route', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(home),
          message(
            Message.ChangedUrl({ url: urlOrThrow('http://localhost/files') }),
          ),
          model(model => {
            expect(model.route._tag).toBe('FilesIndex')
          }),
        ),
      )
    })

    test('navigating under /files captures the remaining segments', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('a same-page URL change syncs the input, records history, and refetches', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('a hash-only URL change keeps the People page in sync', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
  })

  describe('generated People Message', () => {
    test('writes through to peoplePage', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(onPeople('')),
          peopleMessage(PeopleBlock.Message.ChangedSearchInput({ value: 'd' })),
          model(model => {
            expect(model.peoplePage.searchInput).toBe('d')
          }),
        ),
      )
    })
  })
})
