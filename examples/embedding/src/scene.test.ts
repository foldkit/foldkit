import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  CompletedReportCount,
  type Model,
  ReportCount,
  update,
  view,
} from './main'

const initialModel: Model = { count: 10, step: 1 }

describe('view', () => {
  test('initial view shows the count, the tick description, and the advance button', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.text('10')).toExist(),
      Scene.expect(Scene.text('Ticking up by 1 every second')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Advance by 1' })).toExist(),
    )
  })

  test('clicking the advance button moves the count by the step', () => {
    Scene.scene(
      { update, view },
      Scene.with({ ...initialModel, step: 4 }),
      Scene.click(Scene.role('button', { name: 'Advance by 4' })),
      Scene.Command.resolve(ReportCount, CompletedReportCount()),
      Scene.expect(Scene.text('14')).toExist(),
    )
  })
})
