import { Effect } from 'effect'
import { Calendar } from 'foldkit'
import { expect, label, role, scene } from 'foldkit/scene'

import { BrowserCrypto } from '@effect/platform-browser'
import { describe, it } from '@effect/vitest'

import { WorkHistoryLive } from './workHistory'

const today = Calendar.make(2026, 4, 16)

describe('workHistory', () => {
  it.effect('renders the first position fields and the add control', () =>
    scene(
      WorkHistoryLive,
      { today, initialEntryId: 'work-history-entry-1' },
      expect(label('Company')).toExist(),
      expect(label('Job Title')).toExist(),
      expect(role('button', { name: '+ Add Position' })).toExist(),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )
})
