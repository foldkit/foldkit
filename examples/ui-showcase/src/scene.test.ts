import { Effect, Option } from 'effect'
import { Calendar, Scene } from 'foldkit'
import { fromString } from 'foldkit/url'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './index'

const application = { block: ApplicationBlock, layer }

const today = Calendar.make(2026, 4, 16)
const initialRoute = (path: string) =>
  Scene.init(
    { today },
    Option.getOrThrow(fromString(`http://localhost${path}`)),
  )

describe('view', () => {
  it.effect('the sidebar nav lists a sample of every component link', () =>
    Scene.scene(
      application,
      initialRoute('/'),
      Scene.expect(Scene.role('link', { name: 'Button' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Calendar' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Dialog' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Hover Intent' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Meter' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Progress' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Toast' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Virtual List' })).toExist(),
    ),
  )

  it.effect('the Home route shows the showcase heading and description', () =>
    Scene.scene(
      application,
      initialRoute('/'),
      Scene.expect(
        Scene.role('heading', { name: 'Foldkit UI Showcase' }),
      ).toExist(),
      Scene.expect(
        Scene.text('This is a showcase of every Foldkit UI component.', {
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
        yield* Scene.scene(
          application,
          initialRoute(route),
          Scene.expect(Scene.role('link', { name: 'Button' })).toExist(),
        )
      }
    }),
  )

  it.effect('the Hover Intent route renders its interactive trigger', () =>
    Scene.scene(
      application,
      initialRoute('/hover-intent'),
      Scene.expect(Scene.role('heading', { name: 'Hover Intent' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'More information' }),
      ).toExist(),
    ),
  )

  it.effect(
    'the Disclosure panel stays mounted while collapsed so it can animate',
    () =>
      Scene.scene(
        application,
        initialRoute('/disclosure'),
        Scene.expect(
          Scene.text('Foldkit is an Elm-inspired UI framework', {
            exact: false,
          }),
        ).toExist(),
      ),
  )

  it.effect(
    'the Disclosure collapsed preview expands from its own control',
    () =>
      Scene.scene(
        application,
        initialRoute('/disclosure'),
        Scene.expect(Scene.role('heading', { name: 'Basic' })).toExist(),
        Scene.expect(Scene.role('heading', { name: 'Animated' })).toExist(),
        Scene.expect(
          Scene.role('heading', { name: 'Collapsed preview' }),
        ).toExist(),
        Scene.click(Scene.role('button', { name: 'Read more' })),
        Scene.expect(Scene.role('button', { name: 'Show less' })).toExist(),
      ),
  )

  it.effect('the NotFound route renders the 404 panel and a Go Home link', () =>
    Scene.scene(
      application,
      initialRoute('/oops'),
      Scene.expect(
        Scene.role('heading', { name: '404 — Page Not Found' }),
      ).toExist(),
      Scene.expect(Scene.text('The path "/oops" was not found.')).toExist(),
      Scene.expect(Scene.role('link', { name: 'Go Home' })).toExist(),
    ),
  )
})
