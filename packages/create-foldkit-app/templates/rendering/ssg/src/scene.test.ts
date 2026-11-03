import { click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Model } from './application'
import { ApplicationRoute } from './route'

const initialModel = Model.make({
  route: ApplicationRoute.Home(),
  count: 0,
})

describe('view', () => {
  it.effect('renders the statically generated home page', () =>
    scene(
      ApplicationBlock,
      given(initialModel),
      expect(text('Statically generated home')).toExist(),
      expect(role('button', { name: 'Count: 0' })).toExist(),
    ),
  )

  it.effect('clicking the counter increments the count', () =>
    scene(
      ApplicationBlock,
      given(initialModel),
      click(role('button', { name: 'Count: 0' })),
      expect(role('button', { name: 'Count: 1' })).toExist(),
    ),
  )
})
