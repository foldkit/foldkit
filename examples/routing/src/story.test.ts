import { Array, Option, String } from 'effect'
import { LoadType, UrlChangeType } from 'foldkit/navigation'
import { Command, given, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import {
  AppRoute,
  DisableBrowserScrollRestoration,
  Message,
  Model,
  NavigateInternal,
  RestoreScrollPosition,
  ScrollToTop,
  init,
  update,
} from './main'
import { People } from './page'
import {
  filesIndexRouter,
  homeRouter,
  nestedRouter,
  peopleRouter,
} from './route'

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

const onPeople = (searchInput: string) =>
  Model.make({
    route: AppRoute.People({
      searchText: Option.liftPredicate(String.isNonEmpty)(searchInput),
    }),
    peoplePage: peoplePageWith(searchInput),
  })

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const resolveScrollToTop = () =>
  Command.resolve(ScrollToTop, Message.CompletedScrollToTop())

const resolveFetch = (searchText: string) =>
  Command.resolve(
    People.FetchPeople,
    People.Message.SucceededFetchPeople({
      query: searchText,
      people: People.searchPeople(searchText),
    }),
  )

describe('update', () => {
  describe('EnteredNavigationShortcut', () => {
    test('GH produces the Home navigation Command', () => {
      story(
        update,
        given(home),
        message(Message.EnteredNavigationShortcut({ shortcut: 'GH' })),
        Command.expectHas(NavigateInternal({ url: homeRouter() })),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
      )
    })

    test('GP produces the People navigation Command', () => {
      story(
        update,
        given(home),
        message(Message.EnteredNavigationShortcut({ shortcut: 'GP' })),
        Command.expectHas(
          NavigateInternal({
            url: peopleRouter({ searchText: Option.none() }),
          }),
        ),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
      )
    })

    test('GF produces the Files navigation Command', () => {
      story(
        update,
        given(home),
        message(Message.EnteredNavigationShortcut({ shortcut: 'GF' })),
        Command.expectHas(NavigateInternal({ url: filesIndexRouter() })),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
      )
    })

    test('GN produces the Nested navigation Command', () => {
      story(
        update,
        given(home),
        message(Message.EnteredNavigationShortcut({ shortcut: 'GN' })),
        Command.expectHas(NavigateInternal({ url: nestedRouter() })),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
      )
    })
  })

  describe('ChangedUrl', () => {
    test('navigating to /people parses to a People route', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/people'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        model(model => {
          if (model.route._tag === 'People') {
            expect(model.route.searchText).toStrictEqual(Option.none())
          } else {
            throw new Error('Expected People route')
          }
        }),
        resolveFetch(''),
        resolveScrollToTop(),
      )
    })

    test('navigating to /people?searchText=foo captures the query parameter', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/people?searchText=foo'),
            urlChangeType: UrlChangeType.Push(),
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
        resolveScrollToTop(),
      )
    })

    test('navigating to /people/3 parses to a Person route with numeric id', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/people/3'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        model(model => {
          if (model.route._tag === 'Person') {
            expect(model.route.personId).toBe(3)
          } else {
            throw new Error('Expected Person route')
          }
        }),
        resolveScrollToTop(),
      )
    })

    test('an unknown path falls through to NotFound with the path captured', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/missing'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        model(model => {
          if (model.route._tag === 'NotFound') {
            expect(model.route.path).toBe('/missing')
          } else {
            throw new Error('Expected NotFound route')
          }
        }),
        resolveScrollToTop(),
      )
    })

    test('the deep nested path resolves to Nested', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/nested/route/is/very/nested'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Nested')
        }),
        resolveScrollToTop(),
      )
    })

    test('navigating to /files parses to the FilesIndex route', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/files'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        model(model => {
          expect(model.route._tag).toBe('FilesIndex')
        }),
        resolveScrollToTop(),
      )
    })

    test('navigating under /files captures the remaining segments', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/files/documents/taxes'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        model(model => {
          if (model.route._tag === 'Files') {
            expect(model.route.path).toStrictEqual(['documents', 'taxes'])
          } else {
            throw new Error('Expected Files route')
          }
        }),
        resolveScrollToTop(),
      )
    })

    test('a same-page URL change syncs the input, records history, and refetches', () => {
      story(
        update,
        given(onPeople('')),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/people?searchText=designer'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        model(model => {
          expect(model.peoplePage.searchInput).toBe('designer')
          expect(model.peoplePage.searchHistory).toStrictEqual(['designer'])
          expect(model.peoplePage.results._tag).toBe('Loading')
        }),
        Command.expectHas(People.FetchPeople),
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
      )
    })

    test('a search that changes only the query keeps the scroll position', () => {
      story(
        update,
        given(onPeople('')),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/people?searchText=designer'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        Command.expectExact(People.FetchPeople),
        resolveFetch('designer'),
      )
    })

    test('a link from one person to another scrolls to the top', () => {
      story(
        update,
        given(
          Model.make({
            route: AppRoute.Person({ personId: 1 }),
            peoplePage: initialPeoplePage,
          }),
        ),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/people/3'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        Command.expectExact(ScrollToTop()),
        resolveScrollToTop(),
      )
    })

    test('a replaced URL keeps the scroll position', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/nested/route/is/very/nested'),
            urlChangeType: UrlChangeType.Replace(),
          }),
        ),
        Command.expectNone(),
      )
    })

    test('Back and Forward restore the position the reader left instead of scrolling to the top', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/people/3'),
            urlChangeType: UrlChangeType.Traverse({
              maybeSavedScrollPosition: Option.some({ x: 0, y: 1500 }),
            }),
          }),
        ),
        Command.expectExact(RestoreScrollPosition({ x: 0, y: 1500 })),
        Command.resolve(
          RestoreScrollPosition,
          Message.CompletedRestoreScrollPosition(),
        ),
      )
    })

    test('Back or Forward to an entry without a recorded position keeps the scroll position', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/people/3'),
            urlChangeType: UrlChangeType.Traverse({
              maybeSavedScrollPosition: Option.none(),
            }),
          }),
        ),
        Command.expectNone(),
      )
    })
  })

  describe('GotPeopleMessage', () => {
    test('GotPeopleMessage writes through to peoplePage', () => {
      story(
        update,
        given(onPeople('')),
        message(
          Message.GotPeopleMessage({
            message: People.Message.ChangedSearchInput({ value: 'd' }),
          }),
        ),
        model(model => {
          expect(model.peoplePage.searchInput).toBe('d')
        }),
      )
    })
  })
})

describe('init', () => {
  test('a reload restores the position the reader had on the page', () => {
    const reloadInit = init(
      urlOrThrow('http://localhost/people/3'),
      LoadType.Reload({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 2400 }),
      }),
    )

    expect(reloadInit.commands).toContainEqual(
      expect.objectContaining({
        name: RestoreScrollPosition.name,
        args: { x: 0, y: 2400 },
      }),
    )
    expect(reloadInit.commands).toContainEqual(
      expect.objectContaining({ name: DisableBrowserScrollRestoration.name }),
    )
  })

  test('a new visit turns off browser scroll restoration without restoring a position', () => {
    const visitInit = init(
      urlOrThrow('http://localhost/people/3'),
      LoadType.Push(),
    )

    expect(visitInit.commands).toContainEqual(
      expect.objectContaining({ name: DisableBrowserScrollRestoration.name }),
    )
    expect(visitInit.commands).not.toContainEqual(
      expect.objectContaining({ name: RestoreScrollPosition.name }),
    )
  })
})
