// @vitest-environment node
import { describe, test } from 'vitest'

import { initialModel, update, view } from './apps/contextMenuPosition.js'
import * as Scene from './scene.js'

describe('scene contextMenu without a DOM', () => {
  test('contextMenu passes the given position to an OnContextMenu function', () => {
    Scene.scene(
      { update, view },
      Scene.given(initialModel),
      Scene.contextMenu(Scene.label('Bar label'), {
        clientX: 320,
        clientY: 48,
        elementX: 250,
        elementWidth: 400,
      }),
      Scene.expect(Scene.role('menu')).toHaveText(
        'client 320,48 element 250,0 size 400x0 shift false',
      ),
    )
  })
})
