import { Effect } from 'effect'
import { Calendar } from 'foldkit'
import { expect, label, role, scene } from 'foldkit/scene'

import { BrowserCrypto } from '@effect/platform-browser'
import { describe, it } from '@effect/vitest'

import { EducationLive } from './education'

const today = Calendar.make(2026, 4, 16)

describe('education', () => {
  it.effect('renders the first school fields and the add control', () =>
    scene(
      EducationLive,
      { today, initialEntryId: 'education-entry-1' },
      expect(label('School')).toExist(),
      expect(label('Degree')).toExist(),
      expect(role('button', { name: '+ Add Education' })).toExist(),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )
})
