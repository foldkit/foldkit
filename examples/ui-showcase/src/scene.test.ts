import { Calendar } from 'foldkit'
import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { AppRoute, type Model, update, view } from './main'
import { uiInit } from './ui/init'

const today = Calendar.make(2026, 4, 16)
const uiInit_ = uiInit(today)

const modelForRoute = (route: Model['route']): Model => ({
  route,
  uiModel: uiInit_.model,
})

const homeModel = modelForRoute(AppRoute.Home())

describe('view', () => {
  test('the sidebar nav lists a sample of every component link', () => {
    scene(
      { update, view },
      given(homeModel),
      expect(role('link', { name: 'Button' })).toExist(),
      expect(role('link', { name: 'Calendar' })).toExist(),
      expect(role('link', { name: 'Dialog' })).toExist(),
      expect(role('link', { name: 'Hover Intent' })).toExist(),
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
      AppRoute.Button(),
      AppRoute.Checkbox(),
      AppRoute.Disclosure(),
      AppRoute.Fieldset(),
      AppRoute.HoverIntent(),
      AppRoute.Input(),
      AppRoute.RadioGroup(),
      AppRoute.Select(),
      AppRoute.Switch(),
      AppRoute.Textarea(),
      AppRoute.Animation(),
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
      given(modelForRoute(AppRoute.HoverIntent())),
      expect(role('heading', { name: 'Hover Intent' })).toExist(),
      expect(role('button', { name: 'More information' })).toExist(),
    )
  })

  test('the Disclosure panel stays mounted while collapsed so it can animate', () => {
    scene(
      { update, view },
      given(modelForRoute(AppRoute.Disclosure())),
      expect(
        text('Foldkit is an Elm-inspired UI framework', { exact: false }),
      ).toExist(),
    )
  })

  test('the NotFound route renders the 404 panel and a Go Home link', () => {
    scene(
      { update, view },
      given(modelForRoute(AppRoute.NotFound({ path: '/oops' }))),
      expect(role('heading', { name: '404 — Page Not Found' })).toExist(),
      expect(text('The path "/oops" was not found.')).toExist(),
      expect(role('link', { name: 'Go Home' })).toExist(),
    )
  })
})
