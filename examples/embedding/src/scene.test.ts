import { Effect } from 'effect'
import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import {
  ApplicationBlock,
  Message,
  type Model,
  ReportCount,
} from './application'

const initialModel: Model = { count: 10, step: 1 }

describe('view', () => {
  test('initial view shows the count, the tick description, and the advance button', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        expect(text('10')).toExist(),
        expect(text('Ticking up by 1 every second')).toExist(),
        expect(role('button', { name: 'Advance by 1' })).toExist(),
      ),
    )
  })

  test('clicking the advance button moves the count by the step', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(modifyFields(initialModel, { step: () => 4 })),
        click(role('button', { name: 'Advance by 4' })),
        Command.resolve(ReportCount, Message.CompletedReportCount()),
        expect(text('14')).toExist(),
      ),
    )
  })
})
