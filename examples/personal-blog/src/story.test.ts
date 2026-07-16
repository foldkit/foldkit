import { Option } from 'effect'
import { Story } from 'foldkit'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { Counter } from './island'
import { ChangedUrl, GotCounterMessage, HomeRoute, Model, update } from './main'

const home = Model.make({ route: HomeRoute(), counter: Counter.init })

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('ChangedUrl', () => {
    test('navigating to / parses to the Home route', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(ChangedUrl({ url: urlOrThrow('http://localhost/') })),
        Story.model(model => {
          expect(model.route._tag).toBe('Home')
        }),
      )
    })

    test('navigating to /posts parses to the Posts route', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/posts') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Posts')
        }),
      )
    })

    test('navigating to /posts/making-this-blog captures the slug', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/posts/making-this-blog'),
          }),
        ),
        Story.model(model => {
          if (model.route._tag === 'Post') {
            expect(model.route.slug).toBe('making-this-blog')
          } else {
            throw new Error('Expected Post route')
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
  })

  describe('GotCounterMessage', () => {
    test('increments route through the Counter submodel without commands', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(
          GotCounterMessage({ message: Counter.ClickedIncrement() }),
        ),
        Story.message(
          GotCounterMessage({ message: Counter.ClickedIncrement() }),
        ),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.counter.count).toBe(2)
        }),
      )
    })

    test('the count survives navigating between routes', () => {
      Story.story(
        update,
        Story.with(home),
        Story.message(
          GotCounterMessage({ message: Counter.ClickedIncrement() }),
        ),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/posts') }),
        ),
        Story.message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/posts/making-this-blog'),
          }),
        ),
        Story.model(model => {
          expect(model.counter.count).toBe(1)
        }),
      )
    })
  })
})
