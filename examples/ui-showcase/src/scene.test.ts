import { Effect, Option } from 'effect'
import { Calendar } from 'foldkit'
import { click, expect, init, role, scene, text } from 'foldkit/scene'
import { fromString } from 'foldkit/url'
import { describe, test } from 'vitest'

import { ApplicationBlock } from './block'

const today = Calendar.make(2026, 4, 16)
const initialRoute = (path: string) =>
  init({ today }, Option.getOrThrow(fromString(`http://localhost${path}`)))

describe('view', () => {
  test('the sidebar nav lists a sample of every component link', async () => {
    await Effect.runPromise(
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
  })

  test('the Home route shows the showcase heading and description', async () => {
    await Effect.runPromise(
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
  })

  test('simple component routes render the sidebar nav', async () => {
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
      await Effect.runPromise(
        scene(
          ApplicationBlock,
          initialRoute(route),
          expect(role('link', { name: 'Button' })).toExist(),
        ),
      )
    }
  })

  test('the Hover Intent route renders its interactive trigger', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        initialRoute('/hover-intent'),
        expect(role('heading', { name: 'Hover Intent' })).toExist(),
        expect(role('button', { name: 'More information' })).toExist(),
      ),
    )
  })

  test('the Disclosure panel stays mounted while collapsed so it can animate', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        initialRoute('/disclosure'),
        expect(
          text('Foldkit is an Elm-inspired UI framework', { exact: false }),
        ).toExist(),
      ),
    )
  })

  test('the Disclosure collapsed preview expands from its own control', async () => {
    await Effect.runPromise(
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
  })

  test('the NotFound route renders the 404 panel and a Go Home link', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        initialRoute('/oops'),
        expect(role('heading', { name: '404 — Page Not Found' })).toExist(),
        expect(text('The path "/oops" was not found.')).toExist(),
        expect(role('link', { name: 'Go Home' })).toExist(),
      ),
    )
  })
})
