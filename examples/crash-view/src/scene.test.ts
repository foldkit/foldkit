import { expect, given, role, scene } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { update, view } from './main'

describe('view', () => {
  test('initial view shows the Crash button', () => {
    scene(
      { update, view },
      given(null),
      expect(role('button', { name: 'Crash' })).toExist(),
    )
  })
})
