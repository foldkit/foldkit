import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { toParentMessage } from 'foldkit/test'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { CounterBinding } from './composition'
import { CounterBlock } from './island'
import { Message } from './message'
import { Model } from './model'
import { ApplicationRoute } from './route'
import { update } from './update'

type CounterMessage = typeof CounterBlock.Message.Type

const home = Model.make({
  route: ApplicationRoute.Home(),
  counter: CounterBlock.init().model,
})

const counterMessage = (message: CounterMessage) =>
  toParentMessage(CounterBinding, message)

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('ChangedUrl', () => {
    test('navigating to / parses to the Home route', () => {
      story(
        update,
        given(home),
        message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
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
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/posts') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Posts')
        }),
      )
    })

    test('navigating to /posts/making-this-blog captures the slug', () => {
      story(
        update,
        given(home),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/posts/making-this-blog'),
          }),
        ),
        model(model => {
          if (model.route._tag === 'Post') {
            expect(model.route.slug).toBe('making-this-blog')
          } else {
            throw new Error('Expected Post route')
          }
        }),
      )
    })

    test('an unknown path falls through to NotFound with the path captured', () => {
      story(
        update,
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
      )
    })
  })

  describe('generated Counter Message', () => {
    test('increments route through the Counter Block without commands', () => {
      story(
        update,
        given(home),
        message(counterMessage(CounterBlock.Message.ClickedIncrement())),
        message(counterMessage(CounterBlock.Message.ClickedIncrement())),
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
        message(counterMessage(CounterBlock.Message.ClickedIncrement())),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/posts') }),
        ),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/posts/making-this-blog'),
          }),
        ),
        model(model => {
          expect(model.counter.count).toBe(1)
        }),
      )
    })
  })
})
