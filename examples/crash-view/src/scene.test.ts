import { expect, given, role, scene } from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'

describe('view', () => {
  it.effect('initial view shows the Crash button', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(null),
      expect(role('button', { name: 'Crash' })).toExist(),
    ),
  )
})
