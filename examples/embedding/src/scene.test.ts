import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import {
  ApplicationLive,
  Message,
  type Model,
  ReportCount,
} from './application'

const flags = { flags: { initialCount: 10 } }

const initialModel: Model = { count: 10, step: 1 }

describe('view', () => {
  it.effect(
    'initial view shows the count, the tick description, and the advance button',
    () =>
      scene(
        ApplicationLive,
        flags,
        given(initialModel),
        expect(text('10')).toExist(),
        expect(text('Ticking up by 1 every second')).toExist(),
        expect(role('button', { name: 'Advance by 1' })).toExist(),
      ),
  )

  it.effect('clicking the advance button moves the count by the step', () =>
    scene(
      ApplicationLive,
      flags,
      given(modifyFields(initialModel, { step: () => 4 })),
      click(role('button', { name: 'Advance by 4' })),
      Command.resolve(ReportCount, Message.CompletedReportCount()),
      expect(text('14')).toExist(),
    ),
  )
})
