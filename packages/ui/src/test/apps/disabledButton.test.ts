import { Option } from 'effect'
import type { Resolved } from 'foldkit/block'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { type DisabledButton, DisabledButtonLive } from './disabledButton.js'

const openDialogModel: Resolved<typeof DisabledButton.Model.Type> = {
  isEnabled: false,
  dialog: {
    id: 'test-dialog',
    isOpen: true,
    isAnimated: false,
    animation: {
      id: 'test-dialog-panel',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeFocusSelector: Option.none(),
  },
}

describe('disabled button cleanup', () => {
  describe('plain button (no dialog)', () => {
    it.effect('submit becomes clickable after toggle', () =>
      Scene.scene(
        DisabledButtonLive,
        { isInDialog: false },
        Scene.expect(Scene.text('Submit')).toBeDisabled(),
        Scene.click(Scene.text('Toggle')),
        Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
        Scene.click(Scene.text('Submit')),
      ),
    )

    it.effect('submit starts enabled when model says so', () =>
      Scene.scene(
        DisabledButtonLive,
        { isInDialog: false },
        Scene.given({ ...openDialogModel, isEnabled: true }),
        Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
        Scene.click(Scene.text('Submit')),
      ),
    )
  })

  describe('button inside Dialog.view', () => {
    it.effect('submit becomes clickable after toggle', () =>
      Scene.scene(
        DisabledButtonLive,
        { isInDialog: true },
        Scene.given(openDialogModel),
        Scene.expect(Scene.text('Submit')).toBeDisabled(),
        Scene.click(Scene.text('Toggle')),
        Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
        Scene.click(Scene.text('Submit')),
      ),
    )
  })
})
