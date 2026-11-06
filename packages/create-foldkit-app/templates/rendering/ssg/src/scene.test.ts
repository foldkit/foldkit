import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Model, layer } from './block'
import { ApplicationRoute } from './route'

const initialModel = Model.make({
  route: ApplicationRoute.Home(),
  count: 0,
})

describe('view', () => {
  it.effect('renders the statically generated home page', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.expect(Scene.text('Statically generated home')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Count: 0' })).toExist(),
    ),
  )

  it.effect('clicking the counter increments the count', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.click(Scene.role('button', { name: 'Count: 0' })),
      Scene.expect(Scene.role('button', { name: 'Count: 1' })).toExist(),
    ),
  )
})
