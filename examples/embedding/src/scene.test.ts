import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'
import { evo } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { Message, type Model, ReportCount, update, view } from './main'

const initialModel: Model = { count: 10, step: 1 }

describe('view', () => {
  test('initial view shows the count, the tick description, and the advance button', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(text('10')).toExist(),
      expect(text('Ticking up by 1 every second')).toExist(),
      expect(role('button', { name: 'Advance by 1' })).toExist(),
    )
  })

  test('clicking the advance button moves the count by the step', () => {
    scene(
      { update, view },
      given(evo(initialModel, { step: () => 4 })),
      click(role('button', { name: 'Advance by 4' })),
      Command.resolve(ReportCount, Message.CompletedReportCount()),
      expect(text('14')).toExist(),
    )
  })
})
