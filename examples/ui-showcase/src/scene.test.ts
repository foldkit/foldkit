import { Effect, Option } from 'effect'
import { Calendar } from 'foldkit'
import { click, expect, role, scene, text } from 'foldkit/scene'
import { fromString } from 'foldkit/url'

import { describe, it } from '@effect/vitest'

import { ApplicationLive } from './application'
import {
  animationRouter,
  buttonRouter,
  checkboxRouter,
  disclosureRouter,
  fieldsetRouter,
  homeRouter,
  hoverIntentRouter,
  inputRouter,
  meterRouter,
  progressRouter,
  radioGroupRouter,
  selectRouter,
  switchRouter,
  textareaRouter,
} from './route'

const today = Calendar.make(2026, 4, 16)

const argsForPath = (path: string) => ({
  flags: { today },
  url: Option.getOrThrowWith(
    fromString(`http://localhost${path}`),
    () => new Error(`Failed to parse path: ${path}`),
  ),
})

describe('view', () => {
  it.effect('the sidebar nav lists a sample of every component link', () =>
    scene(
      ApplicationLive,
      argsForPath(homeRouter()),
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
      ApplicationLive,
      argsForPath(homeRouter()),
      expect(role('heading', { name: 'Foldkit UI Showcase' })).toExist(),
      expect(
        text('This is a showcase of every Foldkit UI component.', {
          exact: false,
        }),
      ).toExist(),
    ),
  )

  it.effect('simple component routes render the sidebar nav', () => {
    const paths: ReadonlyArray<string> = [
      buttonRouter(),
      checkboxRouter(),
      disclosureRouter(),
      fieldsetRouter(),
      hoverIntentRouter(),
      inputRouter(),
      meterRouter(),
      progressRouter(),
      radioGroupRouter(),
      selectRouter(),
      switchRouter(),
      textareaRouter(),
      animationRouter(),
    ]

    return Effect.forEach(
      paths,
      path =>
        scene(
          ApplicationLive,
          argsForPath(path),
          expect(role('link', { name: 'Button' })).toExist(),
        ),
      { discard: true },
    )
  })

  it.effect('the Hover Intent route renders its interactive trigger', () =>
    scene(
      ApplicationLive,
      argsForPath(hoverIntentRouter()),
      expect(role('heading', { name: 'Hover Intent' })).toExist(),
      expect(role('button', { name: 'More information' })).toExist(),
    ),
  )

  it.effect(
    'the Disclosure panel stays mounted while collapsed so it can animate',
    () =>
      scene(
        ApplicationLive,
        argsForPath(disclosureRouter()),
        expect(
          text('Foldkit is an Elm-inspired UI framework', { exact: false }),
        ).toExist(),
      ),
  )

  it.effect(
    'the Disclosure collapsed preview expands from its own control',
    () =>
      scene(
        ApplicationLive,
        argsForPath(disclosureRouter()),
        expect(role('heading', { name: 'Basic' })).toExist(),
        expect(role('heading', { name: 'Animated' })).toExist(),
        expect(role('heading', { name: 'Collapsed preview' })).toExist(),
        click(role('button', { name: 'Read more' })),
        expect(role('button', { name: 'Show less' })).toExist(),
      ),
  )

  it.effect('the NotFound route renders the 404 panel and a Go Home link', () =>
    scene(
      ApplicationLive,
      argsForPath('/oops'),
      expect(role('heading', { name: '404 — Page Not Found' })).toExist(),
      expect(text('The path "/oops" was not found.')).toExist(),
      expect(role('link', { name: 'Go Home' })).toExist(),
    ),
  )
})
