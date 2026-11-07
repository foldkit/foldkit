import { Context, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

const SaveState = defineTaggedUnion({
  Idle: {},
  Saving: {},
  Saved: {},
  Failed: { reason: Schema.String },
})
type SaveState = typeof SaveState.Type

const Model = Schema.Struct({ contents: Schema.String, save: SaveState })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedSave: {},
  SucceededSaveDocument: {},
  FailedSaveDocument: { reason: Schema.String },
})
type Message = typeof Message.Type

export class EditorStorage extends Context.Service<
  EditorStorage,
  Readonly<{ saveDocument: (contents: string) => Effect.Effect<void, Error> }>
>()('EditorStorage') {}

export const EditorStartup = Schema.Struct({ contents: Schema.String })
export type EditorStartup = typeof EditorStartup.Type

export const EditorKey = Symbol('Editor')
export const EditorBlock = Block.make('Editor', {
  key: EditorKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([EditorStartup]),
  view: { kind: 'Element' },
  effects: { services: [EditorStorage] },
})

const { makeFieldsStep, makeComposition, makeCommand } = EditorBlock
const EditorComposition = makeComposition()

export const SaveDocument = makeCommand('SaveDocument', {
  args: { contents: Schema.String },
  messages: [Message.SucceededSaveDocument, Message.FailedSaveDocument],
  handler: function* () {
    const storage = yield* EditorStorage

    return ({ contents }) =>
      storage.saveDocument(contents).pipe(
        Effect.as(Message.SucceededSaveDocument()),
        Effect.catch(error =>
          Effect.succeed(Message.FailedSaveDocument({ reason: error.message })),
        ),
      )
  },
})

const init = EditorComposition.makeInit(({ contents }) => ({
  model: { contents, save: SaveState.Idle() },
}))

const update = EditorComposition.makeUpdate({
  ClickedSave: model => ({
    model: modifyFields(model, { save: () => SaveState.Saving() }),
    commands: [SaveDocument({ contents: model.contents })],
  }),
  SucceededSaveDocument: makeFieldsStep(() => ({
    save: () => SaveState.Saved(),
  })),
  FailedSaveDocument: makeFieldsStep.fromMessage(({ reason }) => ({
    save: () => SaveState.Failed({ reason }),
  })),
})

const view = EditorComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.pre([], [model.contents]),
      h.button([h.OnClick(Message.ClickedSave())], ['Save']),
    ],
  ),
)

export const layer = EditorBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: SaveDocument.layer,
})
