import { Calendar } from 'foldkit'
import { click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { type Model } from './model'
import { ApplicationRoute } from './route'
import { init as initUi } from './ui/init'
import { update } from './update'
import { view } from './view'

const today = Calendar.make(2026, 4, 16)
const uiInit = initUi(today)

const modelForRoute = (route: Model['route']): Model => ({
  route,
  uiModel: uiInit.model,
})

const homeModel = modelForRoute(ApplicationRoute.Home())

describe('view', () => {
  test('the sidebar nav lists a sample of every component link', () => {
    scene(
      { update, view },
      given(homeModel),
      expect(role('link', { name: 'Button' })).toExist(),
      expect(role('link', { name: 'Calendar' })).toExist(),
      expect(role('link', { name: 'Dialog' })).toExist(),
      expect(role('link', { name: 'Hover Intent' })).toExist(),
      expect(role('link', { name: 'Meter' })).toExist(),
      expect(role('link', { name: 'Progress' })).toExist(),
      expect(role('link', { name: 'Toast' })).toExist(),
      expect(role('link', { name: 'Virtual List' })).toExist(),
    )
  })

  test('the Home route shows the showcase heading and description', () => {
    scene(
      { update, view },
      given(homeModel),
      expect(role('heading', { name: 'Foldkit UI Showcase' })).toExist(),
      expect(
        text('This is a showcase of every Foldkit UI component.', {
          exact: false,
        }),
      ).toExist(),
    )
  })

  test('simple component routes render the sidebar nav', () => {
    const routes: ReadonlyArray<Model['route']> = [
      ApplicationRoute.Button(),
      ApplicationRoute.Checkbox(),
      ApplicationRoute.Disclosure(),
      ApplicationRoute.Fieldset(),
      ApplicationRoute.HoverIntent(),
      ApplicationRoute.Input(),
      ApplicationRoute.Meter(),
      ApplicationRoute.Progress(),
      ApplicationRoute.RadioGroup(),
      ApplicationRoute.Select(),
      ApplicationRoute.Switch(),
      ApplicationRoute.Textarea(),
      ApplicationRoute.Animation(),
    ]

    routes.forEach(route => {
      scene(
        { update, view },
        given(modelForRoute(route)),
        expect(role('link', { name: 'Button' })).toExist(),
      )
    })
  })

  test('the Hover Intent route renders its interactive trigger', () => {
    scene(
      { update, view },
      given(modelForRoute(ApplicationRoute.HoverIntent())),
      expect(role('heading', { name: 'Hover Intent' })).toExist(),
      expect(role('button', { name: 'More information' })).toExist(),
    )
  })

  test('the Disclosure panel stays mounted while collapsed so it can animate', () => {
    scene(
      { update, view },
      given(modelForRoute(ApplicationRoute.Disclosure())),
      expect(
        text('Foldkit is an Elm-inspired UI framework', { exact: false }),
      ).toExist(),
    )
  })

  test('the Disclosure collapsed preview expands from its own control', () => {
    scene(
      { update, view },
      given(modelForRoute(ApplicationRoute.Disclosure())),
      expect(role('heading', { name: 'Basic' })).toExist(),
      expect(role('heading', { name: 'Animated' })).toExist(),
      expect(role('heading', { name: 'Collapsed preview' })).toExist(),
      click(role('button', { name: 'Read more' })),
      expect(role('button', { name: 'Show less' })).toExist(),
    )
  })

  test('the NotFound route renders the 404 panel and a Go Home link', () => {
    scene(
      { update, view },
      given(modelForRoute(ApplicationRoute.NotFound({ path: '/oops' }))),
      expect(role('heading', { name: '404 — Page Not Found' })).toExist(),
      expect(text('The path "/oops" was not found.')).toExist(),
      expect(role('link', { name: 'Go Home' })).toExist(),
    )
  })
})
