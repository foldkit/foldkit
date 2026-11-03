import { Effect, Option } from 'effect'
import { Calendar } from 'foldkit'
import { click, expect, init, role, scene, text } from 'foldkit/scene'
import { fromString } from 'foldkit/url'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock } from './block'

const today = Calendar.make(2026, 4, 16)
const initialRoute = (path: string) =>
  init({ today }, Option.getOrThrow(fromString(`http://localhost${path}`)))

describe('view', () => {
  it.effect('the sidebar nav lists a sample of every component link', () =>
    scene(
      ApplicationBlock,
      initialRoute('/'),
      expect(role('link', { name: 'Button' })).toExist(),
      expect(role('link', { name: 'Calendar' })).toExist(),
      expect(role('link', { name: 'Dialog' })).toExist(),
      expect(role('link', { name: 'Hover Intent' })).toExist(),
      expect(role('link', { name: 'Meter' })).toExist(),
      expect(role('link', { name: 'Progress' })).toExist(),
      expect(role('link', { name: 'Toast' })).toExist(),
      expect(role('link', { name: 'Virtual List' })).toExist(),
    ),
  )

  it.effect('the Home route shows the showcase heading and description', () =>
    scene(
      ApplicationBlock,
      initialRoute('/'),
      expect(role('heading', { name: 'Foldkit UI Showcase' })).toExist(),
      expect(
        text('This is a showcase of every Foldkit UI component.', {
          exact: false,
        }),
      ).toExist(),
    ),
  )

  it.effect('simple component routes render the sidebar nav', () =>
    Effect.gen(function* () {
      const routes: ReadonlyArray<string> = [
        '/button',
        '/checkbox',
        '/disclosure',
        '/fieldset',
        '/hover-intent',
        '/input',
        '/meter',
        '/progress',
        '/radio-group',
        '/select',
        '/switch',
        '/textarea',
        '/animation',
      ]

      for (const route of routes) {
        yield* scene(
          ApplicationBlock,
          initialRoute(route),
          expect(role('link', { name: 'Button' })).toExist(),
        )
      }
    }),
  )

  it.effect('the Hover Intent route renders its interactive trigger', () =>
    scene(
      ApplicationBlock,
      initialRoute('/hover-intent'),
      expect(role('heading', { name: 'Hover Intent' })).toExist(),
      expect(role('button', { name: 'More information' })).toExist(),
    ),
  )

  it.effect(
    'the Disclosure panel stays mounted while collapsed so it can animate',
    () =>
      scene(
        ApplicationBlock,
        initialRoute('/disclosure'),
        expect(
          text('Foldkit is an Elm-inspired UI framework', { exact: false }),
        ).toExist(),
      ),
  )

  it.effect(
    'the Disclosure collapsed preview expands from its own control',
    () =>
      scene(
        ApplicationBlock,
        initialRoute('/disclosure'),
        expect(role('heading', { name: 'Basic' })).toExist(),
        expect(role('heading', { name: 'Animated' })).toExist(),
        expect(role('heading', { name: 'Collapsed preview' })).toExist(),
        click(role('button', { name: 'Read more' })),
        expect(role('button', { name: 'Show less' })).toExist(),
      ),
  )

  it.effect('the NotFound route renders the 404 panel and a Go Home link', () =>
    scene(
      ApplicationBlock,
      initialRoute('/oops'),
      expect(role('heading', { name: '404 — Page Not Found' })).toExist(),
      expect(text('The path "/oops" was not found.')).toExist(),
      expect(role('link', { name: 'Go Home' })).toExist(),
    ),
  )
})
