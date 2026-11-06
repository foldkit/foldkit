import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'

describe('view', () => {
  it.effect('initial view shows the Crash button', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(null),
      Scene.expect(Scene.role('button', { name: 'Crash' })).toExist(),
    ),
  )
})
