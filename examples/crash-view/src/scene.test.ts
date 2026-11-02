import { Effect } from 'effect'
import { expect, given, role, scene } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { ApplicationBlock } from './application'

describe('view', () => {
  test('initial view shows the Crash button', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(null),
        expect(role('button', { name: 'Crash' })).toExist(),
      ),
    )
  })
})
