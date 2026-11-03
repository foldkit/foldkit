import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { messageFrom } from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

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
    it.effect('navigating to / parses to the Home route', () =>
      story(
        ApplicationBlock,
        given(home),
        message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
        model(model => {
          expect(model.route._tag).toBe('Home')
        }),
      ),
    )

    it.effect('navigating to /posts parses to the Posts route', () =>
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

    it.effect('navigating to /posts/making-this-blog captures the slug', () =>
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

    it.effect(
      'an unknown path falls through to NotFound with the path captured',
      () =>
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

  describe('generated Counter Message', () => {
    it.effect(
      'increments route through the Counter Block without commands',
      () =>
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

    it.effect('the count survives navigating between routes', () =>
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
