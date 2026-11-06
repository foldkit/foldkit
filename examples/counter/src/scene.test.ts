import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Model, layer } from './block'

const initialModel = Model.make({ count: 0 })

describe('view', () => {
  it.effect('renders the initial count and three buttons', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.expect(Scene.text('0')).toExist(),
      Scene.expect(Scene.role('button', { name: '+' })).toExist(),
      Scene.expect(Scene.role('button', { name: '-' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Reset' })).toExist(),
    ),
  )

  it.effect('clicking + increments the displayed count', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.click(Scene.role('button', { name: '+' })),
      Scene.expect(Scene.text('1')).toExist(),
      Scene.click(Scene.role('button', { name: '+' })),
      Scene.expect(Scene.text('2')).toExist(),
    ),
  )

  it.effect('clicking - decrements the displayed count', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given({ count: 3 }),
      Scene.click(Scene.role('button', { name: '-' })),
      Scene.expect(Scene.text('2')).toExist(),
    ),
  )

  it.effect('clicking - past zero produces a negative count', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.click(Scene.role('button', { name: '-' })),
      Scene.expect(Scene.text('-1')).toExist(),
    ),
  )

  it.effect('Reset returns the count to zero', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given({ count: 42 }),
      Scene.click(Scene.role('button', { name: 'Reset' })),
      Scene.expect(Scene.text('0')).toExist(),
    ),
  )
})
