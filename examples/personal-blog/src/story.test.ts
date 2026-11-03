import { Effect, Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { messageFrom } from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { ApplicationBlock } from './block'
import { CounterBlock } from './blocks'
import { CounterBinding } from './composition'
import { Message } from './message'
import { Model } from './model'
import { ApplicationRoute } from './route'

type CounterMessage = typeof CounterBlock.Message.Type

const home = Model.make({
  route: ApplicationRoute.Home(),
  counter: CounterBlock.Model.make({ count: 0 }),
})

const counterMessage = (message: CounterMessage) =>
  messageFrom(CounterBinding, message)

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('ChangedUrl', () => {
    test('navigating to / parses to the Home route', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(home),
          message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
          model(model => {
            expect(model.route._tag).toBe('Home')
          }),
        ),
      )
    })

    test('navigating to /posts parses to the Posts route', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(home),
          message(
            Message.ChangedUrl({ url: urlOrThrow('http://localhost/posts') }),
          ),
          model(model => {
            expect(model.route._tag).toBe('Posts')
          }),
        ),
      )
    })

    test('navigating to /posts/making-this-blog captures the slug', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
  })

  describe('generated Counter Message', () => {
    test('increments route through the Counter Block without commands', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(home),
          counterMessage(CounterBlock.Message.ClickedIncrement()),
          counterMessage(CounterBlock.Message.ClickedIncrement()),
          Command.expectNone(),
          model(model => {
            expect(model.counter.count).toBe(2)
          }),
        ),
      )
    })

    test('the count survives navigating between routes', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(home),
          counterMessage(CounterBlock.Message.ClickedIncrement()),
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
        ),
      )
    })
  })
})
