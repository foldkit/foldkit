import { Calendar } from 'foldkit'
import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import {
  AnimationRoute,
  ButtonRoute,
  CheckboxRoute,
  DisclosureRoute,
  FieldsetRoute,
  HomeRoute,
  InputRoute,
  type Model,
  NotFoundRoute,
  RadioGroupRoute,
  SelectRoute,
  SwitchRoute,
  TextareaRoute,
  update,
  view,
} from './main'
import { uiInit } from './ui/init'

const today = Calendar.make(2026, 4, 16)
const uiInitResult = uiInit(today)

const modelForRoute = (route: Model['route']): Model => ({
  route,
  uiModel: uiInitResult.model,
})

const homeModel = modelForRoute(HomeRoute())

describe('view', () => {
  test('the sidebar nav lists a sample of every component link', () => {
    scene(
      { update, view },
      given(homeModel),
      expect(role('link', { name: 'Button' })).toExist(),
      expect(role('link', { name: 'Calendar' })).toExist(),
      expect(role('link', { name: 'Dialog' })).toExist(),
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
      ButtonRoute(),
      CheckboxRoute(),
      DisclosureRoute(),
      FieldsetRoute(),
      InputRoute(),
      RadioGroupRoute(),
      SelectRoute(),
      SwitchRoute(),
      TextareaRoute(),
      AnimationRoute(),
    ]

    routes.forEach(route => {
      scene(
        { update, view },
        given(modelForRoute(route)),
        expect(role('link', { name: 'Button' })).toExist(),
      )
    })
  })

  test('the Disclosure panel stays mounted while collapsed so it can animate', () => {
    scene(
      { update, view },
      given(modelForRoute(DisclosureRoute())),
      expect(
        text('Foldkit is an Elm-inspired UI framework', { exact: false }),
      ).toExist(),
    )
  })

  test('the NotFound route renders the 404 panel and a Go Home link', () => {
    scene(
      { update, view },
      given(modelForRoute(NotFoundRoute({ path: '/oops' }))),
      expect(role('heading', { name: '404 — Page Not Found' })).toExist(),
      expect(text('The path "/oops" was not found.')).toExist(),
      expect(role('link', { name: 'Go Home' })).toExist(),
    )
  })
})
