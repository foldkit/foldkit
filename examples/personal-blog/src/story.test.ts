import { Layer, Option } from 'effect'
import { Block } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'

import { describe, expect, it } from '@effect/vitest'

import { ApplicationLive, Message } from './application'
import { Counter, CounterLive } from './counter'

type CounterMessage = typeof Counter.Message.Type

const application = ApplicationLive.pipe(Layer.provide(CounterLive))

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const startArgs = { url: urlOrThrow('http://localhost/') }

const counterMessage = (counterMessage: CounterMessage) =>
  Block.deliver(Counter, 'counter', counterMessage)

describe('update', () => {
  describe('ChangedUrl', () => {
    it.effect('navigating to / parses to the Home route', () =>
      story(
        application,
        startArgs,
        message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
        model(model => {
          expect(model.route._tag).toBe('Home')
        }),
      ),
    )

    it.effect('navigating to /posts parses to the Posts route', () =>
      story(
        application,
        startArgs,
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/posts') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Posts')
        }),
      ),
    )

    it.effect('navigating to /posts/making-this-blog captures the slug', () =>
      story(
        application,
        startArgs,
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

    it.effect(
      'an unknown path falls through to NotFound with the path captured',
      () =>
        story(
          application,
          startArgs,
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

  describe('Counter Message', () => {
    it.effect(
      'increments route through the Counter Block without commands',
      () =>
        story(
          application,
          startArgs,
          message(counterMessage(Counter.Message.ClickedIncrement())),
          message(counterMessage(Counter.Message.ClickedIncrement())),
          Command.expectNone(),
          model(model => {
            expect(model.counter.count).toBe(2)
          }),
        ),
    )

    it.effect('the count survives navigating between routes', () =>
      story(
        application,
        startArgs,
        message(counterMessage(Counter.Message.ClickedIncrement())),
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
