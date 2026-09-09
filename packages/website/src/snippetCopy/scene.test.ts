import {
  Command,
  click,
  expect,
  given,
  role,
  scene,
  text,
  withViewInputs,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { init } from './init'
import { Message } from './message'
import { CopySnippet, WaitBeforeHidingCopiedIndicator, update } from './update'
import { view } from './view'

const snippetId = 'counter-example'

const sceneView = withViewInputs(view, {
  snippetId,
  text: 'const count = 0',
  ariaLabel: 'Copy counter example',
  positionClass: 'top-2 right-2',
})

describe('snippet copy', () => {
  test('copies a snippet and clears its confirmation after the delay', () => {
    scene(
      { update, view: sceneView() },
      given(init().model),
      expect(text('Copied')).not.toExist(),
      click(role('button', { name: 'Copy counter example' })),
      Command.resolve(CopySnippet, Message.SucceededCopySnippet({ snippetId })),
      expect(text('Copied')).toExist(),
      Command.resolve(
        WaitBeforeHidingCopiedIndicator,
        Message.CompletedWaitBeforeHidingCopiedIndicator({ snippetId }),
      ),
      expect(text('Copied')).not.toExist(),
    )
  })
})
