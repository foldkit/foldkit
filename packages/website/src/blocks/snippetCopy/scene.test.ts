import { Command, click, expect, init, role, scene, text } from 'foldkit/scene'
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
      scene(
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
        init(),
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
      ),
  )
})
