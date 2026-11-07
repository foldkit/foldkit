import { Option } from 'effect'
import { Story } from 'foldkit'
import { fromString } from 'foldkit/url'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { CounterBlock } from './blocks'
import { CounterBinding } from './composition'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { Model } from './model'
import { ApplicationRoute } from './route'

const home = Model.make({
  route: ApplicationRoute.Home(),
  counter: CounterBlock.Model.make({ count: 0 }),
})

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('ChangedUrl', () => {
    it.effect('navigating to / parses to the Home route', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(home),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Home')
        }),
      ),
    )

    it.effect('navigating to /posts parses to the Posts route', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(home),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/posts') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Posts')
        }),
      ),
    )

    it.effect('navigating to /posts/making-this-blog captures the slug', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(home),
        Story.message(
          Message.ChangedUrl({
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
  })

  describe('generated Counter Message', () => {
    it.effect(
      'increments route through the Counter Block without commands',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(home),
          Story.messageIn(
            CounterBinding,
            CounterBlock.Message.ClickedIncrement(),
          ),
          Story.messageIn(
            CounterBinding,
            CounterBlock.Message.ClickedIncrement(),
          ),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.counter.count).toBe(2)
          }),
        ),
    )

    it.effect('the count survives navigating between routes', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(home),
        Story.messageIn(
          CounterBinding,
          CounterBlock.Message.ClickedIncrement(),
        ),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/posts') }),
        ),
        Story.message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/posts/making-this-blog'),
          }),
        ),
        Story.model(model => {
          expect(model.counter.count).toBe(1)
        }),
      ),
    )
  })
})
