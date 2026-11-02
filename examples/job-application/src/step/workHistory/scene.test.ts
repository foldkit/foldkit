import { Effect } from 'effect'
import { Calendar } from 'foldkit'
import { init } from 'foldkit/scene'
import { expect, label, role, scene } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { WorkHistoryBlock, layer } from './block'

const today = Calendar.make(2026, 4, 16)

describe('workHistory', () => {
  test('renders the first position fields and the add control', async () => {
    await Effect.runPromise(
      scene(
        WorkHistoryBlock,
        init(today, 'work-history-entry-1'),
        expect(label('Company')).toExist(),
        expect(label('Job Title')).toExist(),
        expect(role('button', { name: '+ Add Position' })).toExist(),
      ).pipe(Effect.provide(layer)),
    )
  })
})
