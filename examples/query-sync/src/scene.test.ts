import { Option } from 'effect'
import { expect, given, placeholder, role, scene, text } from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './index'
import { DietListboxBlock, type Model, PeriodListboxBlock } from './model'
import { ApplicationRoute, Sorting } from './route'

const browseModel: Model = {
  route: ApplicationRoute.Browse({
    search: Option.none(),
    sorting: Sorting.Unsorted(),
    diet: Option.none(),
    period: Option.none(),
  }),
  dietListbox: DietListboxBlock.Model.make({
    id: 'diet-filter',
    isOpen: false,
    isAnimated: false,
    isModal: false,
    orientation: 'Vertical',
    animation: {
      id: 'diet-filter' + '-listbox',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeActiveItemIndex: Option.none(),
    activationTrigger: 'Keyboard',
    searchQuery: '',
    searchVersion: 0,
    maybeLastPointerPosition: Option.none(),
    maybeLastButtonPointerType: Option.none(),
  }),
  periodListbox: PeriodListboxBlock.Model.make({
    id: 'period-filter',
    isOpen: false,
    isAnimated: false,
    isModal: false,
    orientation: 'Vertical',
    animation: {
      id: 'period-filter' + '-listbox',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeActiveItemIndex: Option.none(),
    activationTrigger: 'Keyboard',
    searchQuery: '',
    searchVersion: 0,
    maybeLastPointerPosition: Option.none(),
    maybeLastButtonPointerType: Option.none(),
  }),
}

describe('view', () => {
  it.effect('the Browse route renders the heading and search input', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(browseModel),
      expect(role('heading', { name: 'Dinosaur Explorer' })).toExist(),
      expect(placeholder('Search by name…')).toExist(),
    ),
  )

  it.effect('rendering shows the total dinosaur count', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(browseModel),
      expect(text('Showing', { exact: false })).toContainText('dinosaurs'),
    ),
  )

  it.effect('typing in the search input updates its rendered value', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(
        modifyFields(browseModel, {
          route: () =>
            ApplicationRoute.Browse({
              search: Option.some('Tyranno'),
              sorting: Sorting.Unsorted(),
              diet: Option.none(),
              period: Option.none(),
            }),
        }),
      ),
      expect(placeholder('Search by name…')).toHaveValue('Tyranno'),
    ),
  )

  it.effect('a search with no matches shows the empty-state copy', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(
        modifyFields(browseModel, {
          route: () =>
            ApplicationRoute.Browse({
              search: Option.some('zzzNoMatch'),
              sorting: Sorting.Unsorted(),
              diet: Option.none(),
              period: Option.none(),
            }),
        }),
      ),
      expect(text('No dinosaurs match your filters.')).toExist(),
    ),
  )

  it.effect('NotFound shows a friendly 404 and a back link', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(
        modifyFields(browseModel, {
          route: () => ApplicationRoute.NotFound({ path: '/oops' }),
        }),
      ),
      expect(role('heading', { name: '404 — Page Not Found' })).toExist(),
      expect(text('The path "/oops" was not found.')).toExist(),
      expect(role('link', { name: '← Back to Dinosaur Explorer' })).toExist(),
    ),
  )
})
