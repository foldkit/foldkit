import { expect, role, scene } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { ApplicationLive } from './application'

describe('view', () => {
  it.effect('initial view shows the Crash button', () =>
    scene(ApplicationLive, expect(role('button', { name: 'Crash' })).toExist()),
  )
})
