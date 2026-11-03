import * as Scene from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import * as Dialog from '../../dialog/block.js'
import { block, initialModel, view } from './disabledButton.js'

describe('disabled button cleanup', () => {
  describe('plain button (no dialog)', () => {
    it.effect('submit becomes clickable after toggle', () =>
      Scene.withBlock(block, application =>
        Scene.scene(
          { update: application.update, view },
          Scene.given(initialModel),
          Scene.expect(Scene.text('Submit')).toBeDisabled(),
          Scene.click(Scene.text('Toggle')),
          Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
          Scene.click(Scene.text('Submit')),
        ),
      ),
    )

    it.effect('submit starts enabled when model says so', () =>
      Scene.withBlock(block, application =>
        Scene.scene(
          { update: application.update, view },
          Scene.given(modifyFields(initialModel, { isEnabled: () => true })),
          Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
          Scene.click(Scene.text('Submit')),
        ),
      ),
    )
  })

  describe('button inside Dialog.view', () => {
    it.effect('submit becomes clickable after toggle', () =>
      Scene.scene(
        block,
        Scene.given(initialModel),
        Scene.Mount.resolve(
          Dialog.AcquireResources,
          Dialog.Message.SucceededAcquireResources(),
        ),
        Scene.expect(Scene.text('Submit')).toBeDisabled(),
        Scene.click(Scene.text('Toggle')),
        Scene.expect(Scene.text('Submit')).not.toBeDisabled(),
        Scene.click(Scene.text('Submit')),
      ),
    )
  })
})
