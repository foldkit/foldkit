import { Effect } from 'effect'
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
import { type TestBlock, withBlock } from 'foldkit/story'
import { describe, test } from 'vitest'

import { SnippetCopyBlock, layer } from './block'
import { Message } from './message'
import { CopySnippet, WaitBeforeHidingCopiedIndicator } from './update'

const snippetId = 'counter-example'

const makeFixture = (block: TestBlock<typeof SnippetCopyBlock>) => {
  const init = block.init
  const update = block.update
  const view = block.view
  const sceneView = withViewInputs(view, {
    snippetId,
    text: 'const count = 0',
    ariaLabel: 'Copy counter state',
    positionClass: 'top-2 right-2',
    variant: 'Header',
  })
  return { block, init, update, view, sceneView }
}

describe('snippet copy', () => {
  test('copies a snippet and clears its confirmation after the delay', async () => {
    await Effect.runPromise(
      withBlock(SnippetCopyBlock, executable => {
        const { init, update, sceneView } = makeFixture(executable)

        scene(
          { update, view: sceneView() },
          given(init().model),
          expect(text('Copied')).not.toExist(),
          expect(role('button', { name: 'Copy counter state' })).toHaveAttr(
            'type',
            'button',
          ),
          click(role('button', { name: 'Copy counter state' })),
          Command.resolve(
            CopySnippet,
            Message.SucceededCopySnippet({ snippetId }),
          ),
          expect(text('Copied')).toExist(),
          Command.resolve(
            WaitBeforeHidingCopiedIndicator,
            Message.CompletedWaitBeforeHidingCopiedIndicator({ snippetId }),
          ),
          expect(text('Copied')).not.toExist(),
        )
      }).pipe(Effect.provide(layer)),
    )
  })
})
