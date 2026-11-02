import { Effect, Layer, Schema } from 'effect'

import { describe, expect, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import {
  Command as StoryCommand,
  expectOutMessage,
  message,
} from '../test/story.js'
import { Block, deliver } from './block.js'
import { story } from './testing.js'

const EditorMessage = defineMessageUnion({ ClickedSave: {} })

class Editor extends Block<Editor>()('Editor', {
  Model: Schema.Struct({}),
  Message: EditorMessage,
  OutMessage: defineMessageUnion({ RequestedSave: {} }),
}) {}

const EditorLive = Editor.toLayer(() => ({
  init: () => ({}),
  update: {
    ClickedSave: model => ({
      model,
      outMessage: Editor.OutMessage.RequestedSave(),
    }),
  },
}))

const ForeignMessage = defineMessageUnion({ CompletedSave: {} })

const ForeignSave = Command.define('ForeignSave', {
  messages: [ForeignMessage.CompletedSave],
})

const DocumentMessage = defineMessageUnion({ CompletedSaveDocument: {} })

const SaveDocument = Command.define('SaveDocument', {
  messages: [DocumentMessage.CompletedSaveDocument],
})

class Document extends Block<Document>()('Document', {
  Model: Schema.Struct({ editor: Editor }),
  Message: DocumentMessage,
  OutMessage: defineMessageUnion({ Saved: {} }),
  Command: [SaveDocument],
}) {}

const DocumentLive = Document.toLayer(() => ({
  init: () => ({ editor: new Editor('editor') }),
  update: {
    ...Editor.onAll({
      RequestedSave: model => ({
        model,
        commands: [SaveDocument()],
        outMessage: Document.OutMessage.Saved(),
      }),
    }),
    CompletedSaveDocument: model => ({ model }),
  },
  commands: {
    SaveDocument: () =>
      Effect.succeed(Document.Message.CompletedSaveDocument()),
  },
})).pipe(Layer.provide(EditorLive))

class Shell extends Block<Shell>()('Shell', {
  Model: Schema.Struct({ editor: Editor }),
}) {}

describe('Block OutMessage handler results', () => {
  it.effect('returns the parent Commands and OutMessages', () =>
    story(
      DocumentLive,
      message(deliver(Editor, 'editor', Editor.Message.ClickedSave())),
      StoryCommand.expectExact(SaveDocument),
      expectOutMessage(Document.OutMessage.Saved()),
      StoryCommand.resolve(
        SaveDocument,
        Document.Message.CompletedSaveDocument(),
      ),
    ),
  )

  it('rejects a Command the parent does not declare', () => {
    const ShellLive = Shell.toLayer(() => ({
      init: () => ({ editor: new Editor('editor') }),
      update: {
        ...Editor.on({
          // @ts-expect-error ForeignSave reports a Message Shell does not declare
          RequestedSave: model => ({
            model,
            commands: [ForeignSave()],
          }),
        }),
      },
    }))
    expect(Layer.isLayer(ShellLive)).toBe(true)
  })

  it('rejects an OutMessage the parent does not declare', () => {
    const ShellLive = Shell.toLayer(() => ({
      init: () => ({ editor: new Editor('editor') }),
      update: {
        ...Editor.onAll({
          RequestedSave: model => ({
            model,
            // @ts-expect-error Shell declares no OutMessage
            outMessage: { _tag: 'UndeclaredParentEvent' },
          }),
        }),
      },
    }))
    expect(Layer.isLayer(ShellLive)).toBe(true)
  })
})
