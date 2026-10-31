import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { Command, click, expect, role, scene, text } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { SnippetCopy, SnippetCopyLive } from './block'
import { CopySnippet, WaitBeforeHidingCopiedIndicator } from './command'
import { Message } from './message'

const snippetId = 'counter-example'

class SnippetCopyHost extends Block<SnippetCopyHost>()('SnippetCopyHost', {
  Model: Schema.Struct({ snippetCopy: SnippetCopy }),
}) {}

const SnippetCopyHostLive = SnippetCopyHost.make(
  Effect.fn(function* () {
    const snippetCopy = yield* new SnippetCopy('snippetCopy')

    return {
      model: { snippetCopy },
      view: model =>
        model.snippetCopy.view({
          snippetId,
          text: 'const count = 0',
          ariaLabel: 'Copy counter state',
          positionClass: 'top-2 right-2',
          variant: 'Header',
        }),
    }
  }),
).pipe(Layer.provide(SnippetCopyLive))

describe('snippet copy', () => {
  it.effect(
    'copies a snippet and clears its confirmation after the delay',
    () =>
      scene(
        SnippetCopyHostLive,
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
