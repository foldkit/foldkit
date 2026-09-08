import * as Scene from 'foldkit/scene'
import { evo } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { initialModel, update, view, viewWithDialog } from './disabledButton.js'

describe('disabled button cleanup', () => {
  describe('plain button (no dialog)', () => {
    test('submit becomes clickable after toggle', () => {
      Scene.scene(
        { update, view },
        Scene.given(initialModel),
        Scene.expect(Scene.text('Submit')).toBeDisabled(),
        Scene.click(Scene.text('Toggle')),
        Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
        Scene.click(Scene.text('Submit')),
      )
    })

    test('submit starts enabled when model says so', () => {
      Scene.scene(
        { update, view },
        Scene.given(evo(initialModel, { isEnabled: () => true })),
        Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
        Scene.click(Scene.text('Submit')),
      )
    })
  })

  describe('button inside Dialog.view', () => {
    test('submit becomes clickable after toggle', () => {
      Scene.scene(
        { update, view: viewWithDialog },
        Scene.given(initialModel),
        Scene.expect(Scene.text('Submit')).toBeDisabled(),
        Scene.click(Scene.text('Toggle')),
        Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
        Scene.click(Scene.text('Submit')),
      )
    })
  })
})
