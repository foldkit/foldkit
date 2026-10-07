import { Option } from 'effect'
import { LoadType, UrlChangeType } from 'foldkit/navigation'
import { Command, given, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { Counter } from './island'
import { Message as CounterMessage } from './island/counter'
import {
  AppRoute,
  DisableBrowserScrollRestoration,
  Message,
  Model,
  RestoreScrollPosition,
  ScrollToTop,
  init,
  update,
} from './main'

const home = Model.make({ route: AppRoute.Home(), counter: Counter.init })

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const resolveScrollToTop = () =>
  Command.resolve(ScrollToTop, Message.CompletedScrollToTop())

describe('update', () => {
  describe('ChangedUrl', () => {
    test('navigating to / parses to the Home route', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Home')
        }),
      )
    })

    test('navigating to /posts parses to the Posts route', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/posts'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Posts')
        }),
        resolveScrollToTop(),
      )
    })

    test('navigating to /posts/making-this-blog captures the slug', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/posts/making-this-blog'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        model(model => {
          if (model.route._tag === 'Post') {
            expect(model.route.slug).toBe('making-this-blog')
          } else {
            throw new Error('Expected Post route')
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

    test('a replaced URL keeps the scroll position', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/posts'),
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
            url: urlOrThrow('http://localhost/posts/making-this-blog'),
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
            url: urlOrThrow('http://localhost/posts/making-this-blog'),
            urlChangeType: UrlChangeType.Traverse({
              maybeSavedScrollPosition: Option.none(),
            }),
          }),
        ),
        Command.expectNone(),
      )
    })
  })

  describe('GotCounterMessage', () => {
    test('increments route through the Counter submodel without commands', () => {
      story(
        update,
        given(home),
        message(
          Message.GotCounterMessage({
            message: CounterMessage.ClickedIncrement(),
          }),
        ),
        message(
          Message.GotCounterMessage({
            message: CounterMessage.ClickedIncrement(),
          }),
        ),
        Command.expectNone(),
        model(model => {
          expect(model.counter.count).toBe(2)
        }),
      )
    })

    test('the count survives navigating between routes', () => {
      story(
        update,
        given(home),
        message(
          Message.GotCounterMessage({
            message: CounterMessage.ClickedIncrement(),
          }),
        ),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/posts'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        resolveScrollToTop(),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/posts/making-this-blog'),
            urlChangeType: UrlChangeType.Push(),
          }),
        ),
        resolveScrollToTop(),
        model(model => {
          expect(model.counter.count).toBe(1)
        }),
      )
    })
  })
})

describe('init', () => {
  test('a reload restores the position the reader had on the page', () => {
    const reloadInit = init(
      urlOrThrow('http://localhost/posts/making-this-blog'),
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
      urlOrThrow('http://localhost/posts/making-this-blog'),
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
