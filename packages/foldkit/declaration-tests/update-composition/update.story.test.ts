import { Effect } from 'effect'
import * as Story from 'foldkit/story'
import { describe, expect, it } from 'vitest'

import { ApplicationBlock, layer } from './block.js'
import { SaveDraft } from './command.js'
import { EditorBinding } from './composition.js'
import { Message } from './definition.js'
import * as Editor from './editor.js'

describe('composed document update', () => {
  it('persists edits and lets completion pass through the same update', async () => {
    await Effect.runPromise(
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(),
        Story.message(Message.UpdatedTitle({ title: 'First draft' })),
        Story.Command.expectExact(SaveDraft({ text: 'First draft\n' })),
        Story.model(model => {
          expect(model.title).toBe('First draft')
          expect(model.dispatchCount).toBe(1)
        }),
        Story.Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.dispatchCount).toBe(2)
        }),
      ),
    )
  })

  it('accepts saved content quietly and persists later child edits after its fold', async () => {
    await Effect.runPromise(
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(),
        Story.message(
          Message.ReceivedDraft({ title: 'Existing', text: 'Loaded' }),
        ),
        Story.Command.expectNone(),
        Story.messageIn(
          EditorBinding,
          Editor.Message.UpdatedText({ text: 'Edited' }),
        ),
        Story.Command.expectExact(SaveDraft({ text: 'Existing\nEdited' })),
        Story.model(model => {
          expect(model.editor.text).toBe('Edited')
          expect(model.editCount).toBe(1)
          expect(model.dispatchCount).toBe(2)
        }),
        Story.Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
        Story.Command.expectNone(),
      ),
    )
  })

  it('provides acquired direct and curried calls without executing effects', async () => {
    await Effect.runPromise(
      Story.withBlock({ block: ApplicationBlock, layer }, block => {
        const applicationInit = block.init()
        const updated = block.update(
          applicationInit.model,
          Message.UpdatedTitle({ title: 'Direct' }),
        )
        const updatedCurried = block.update(
          Message.UpdatedTitle({ title: 'Curried' }),
        )(updated.model)

        expect(updatedCurried.model.title).toBe('Curried')
        expect(updatedCurried.model.dispatchCount).toBe(2)
        expect(updatedCurried.commands).toHaveLength(1)
      }),
    )
  })
})
