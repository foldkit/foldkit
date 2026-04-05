import { describe, test } from 'vitest'

import * as Scene from '../scene'
import {
  initialModel,
  update,
  view,
  viewWithDialog,
  viewWithLazyDialog,
} from './disabledButton'

describe('disabled button cleanup', () => {
  describe('plain button (no dialog)', () => {
    test('submit becomes clickable after toggle', () => {
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.expect(Scene.text('Submit')).toBeDisabled(),
        Scene.click(Scene.text('Toggle')),
        Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
        Scene.click(Scene.text('Submit')),
      )
    })

    test('submit starts enabled when model says so', () => {
      Scene.scene(
        { update, view },
        Scene.with({ ...initialModel, isEnabled: true }),
        Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
        Scene.click(Scene.text('Submit')),
      )
    })
  })

  describe('button inside Dialog.view', () => {
    test('submit becomes clickable after toggle', () => {
      Scene.scene(
        { update, view: viewWithDialog },
        Scene.with(initialModel),
        Scene.expect(Scene.text('Submit')).toBeDisabled(),
        Scene.click(Scene.text('Toggle')),
        Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
        Scene.click(Scene.text('Submit')),
      )
    })
  })

  describe('button inside Dialog.lazy', () => {
    test('submit becomes clickable after toggle', () => {
      Scene.scene(
        { update, view: viewWithLazyDialog },
        Scene.with(initialModel),
        Scene.expect(Scene.text('Submit')).toBeDisabled(),
        Scene.click(Scene.text('Toggle')),
        Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
        Scene.click(Scene.text('Submit')),
      )
    })
  })
})
