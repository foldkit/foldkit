import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { SnippetCopyBlock, layer } from './index'
import { Message } from './message'
import { CopySnippet, WaitBeforeHidingCopiedIndicator } from './update'

const snippetId = 'counter-example'

describe('snippet copy', () => {
  it.effect(
    'copies a snippet and clears its confirmation after the delay',
    () =>
      Scene.scene(
        {
          block: SnippetCopyBlock,
          layer,
          viewInputs: {
            snippetId,
            text: 'const count = 0',
            ariaLabel: 'Copy counter state',
            positionClass: 'top-2 right-2',
            variant: 'Header',
          },
        },
        Scene.init(),
        Scene.expect(Scene.text('Copied')).not.toExist(),
        Scene.expect(
          Scene.role('button', { name: 'Copy counter state' }),
        ).toHaveAttr('type', 'button'),
        Scene.click(Scene.role('button', { name: 'Copy counter state' })),
        Scene.Command.resolve(
          CopySnippet,
          Message.SucceededCopySnippet({ snippetId }),
        ),
        Scene.expect(Scene.text('Copied')).toExist(),
        Scene.Command.resolve(
          WaitBeforeHidingCopiedIndicator,
          Message.CompletedWaitBeforeHidingCopiedIndicator({ snippetId }),
        ),
        Scene.expect(Scene.text('Copied')).not.toExist(),
      ),
  )
})
