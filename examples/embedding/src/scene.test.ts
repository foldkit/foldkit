import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  Message,
  type Model,
  ReportCount,
  layer,
} from './block'

const initialModel: Model = { count: 10, step: 1 }

describe('view', () => {
  it.effect(
    'initial view shows the count, the tick description, and the advance button',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.expect(Scene.text('10')).toExist(),
        Scene.expect(Scene.text('Ticking up by 1 every second')).toExist(),
        Scene.expect(Scene.role('button', { name: 'Advance by 1' })).toExist(),
      ),
  )

  it.effect('clicking the advance button moves the count by the step', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(modifyFields(initialModel, { step: () => 4 })),
      Scene.click(Scene.role('button', { name: 'Advance by 4' })),
      Scene.Command.resolve(ReportCount, Message.CompletedReportCount()),
      Scene.expect(Scene.text('14')).toExist(),
    ),
  )
})
