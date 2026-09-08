import { Option } from 'effect'
import { expect, given, placeholder, role, scene, text } from 'foldkit/scene'
import { evo } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { Listbox } from '@foldkit/ui'

import { AppRoute, type Model, Sorting, update, view } from './main'

const browseModel: Model = {
  route: AppRoute.Browse({
    search: Option.none(),
    sorting: Sorting.Unsorted(),
    diet: Option.none(),
    period: Option.none(),
  }),
  dietListbox: Listbox.init({ id: 'diet-filter' }),
  periodListbox: Listbox.init({ id: 'period-filter' }),
}

describe('view', () => {
  test('the Browse route renders the heading and search input', () => {
    scene(
      { update, view },
      given(browseModel),
      expect(role('heading', { name: 'Dinosaur Explorer' })).toExist(),
      expect(placeholder('Search by name…')).toExist(),
    )
  })

  test('rendering shows the total dinosaur count', () => {
    scene(
      { update, view },
      given(browseModel),
      expect(text('Showing', { exact: false })).toContainText('dinosaurs'),
    )
  })

  test('typing in the search input updates its rendered value', () => {
    scene(
      { update, view },
      given(
        evo(browseModel, {
          route: () =>
            AppRoute.Browse({
              search: Option.some('Tyranno'),
              sorting: Sorting.Unsorted(),
              diet: Option.none(),
              period: Option.none(),
            }),
        }),
      ),
      expect(placeholder('Search by name…')).toHaveValue('Tyranno'),
    )
  })

  test('a search with no matches shows the empty-state copy', () => {
    scene(
      { update, view },
      given(
        evo(browseModel, {
          route: () =>
            AppRoute.Browse({
              search: Option.some('zzzNoMatch'),
              sorting: Sorting.Unsorted(),
              diet: Option.none(),
              period: Option.none(),
            }),
        }),
      ),
      expect(text('No dinosaurs match your filters.')).toExist(),
    )
  })

  test('NotFound shows a friendly 404 and a back link', () => {
    scene(
      { update, view },
      given(
        evo(browseModel, {
          route: () => AppRoute.NotFound({ path: '/oops' }),
        }),
      ),
      expect(role('heading', { name: '404 — Page Not Found' })).toExist(),
      expect(text('The path "/oops" was not found.')).toExist(),
      expect(role('link', { name: '← Back to Dinosaur Explorer' })).toExist(),
    )
  })
})
