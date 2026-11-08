import { Context, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class DraftStore extends Context.Service<
  DraftStore,
  Readonly<{
    save: (id: string, text: string) => Effect.Effect<void>
  }>
>()('TypePerformance/DraftStore') {}

const Model = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  savedText: Schema.String,
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  UpdatedText: { value: Schema.String },
  CompletedSaveDraft: { text: Schema.String },
})
type Message = typeof Message.Type
const InMessage = defineInMessageUnion({
  RequestedClear: {},
  RequestedSave: {},
  InformedOfText: { text: Schema.String },
})
type InMessage = typeof InMessage.Type
const OutMessage = defineMessageUnion({
  Changed: { text: Schema.String },
  Saved: { id: Schema.String, text: Schema.String },
})
type OutMessage = typeof OutMessage.Type

export const EditorKey = Symbol('TypePerformanceEditor')
export const EditorBlock = Block.make('TypePerformanceEditor', {
  key: EditorKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Schema.String]),
  view: {
    kind: 'Element',
    Inputs: Schema.Struct({ label: Schema.String }),
  },
  effects: { services: [DraftStore] },
})

const { makeCommand, makeComposition, makeFieldsStep } = EditorBlock
const SaveDraft = makeCommand('SaveDraft', {
  args: { id: Schema.String, text: Schema.String },
  messages: [Message.CompletedSaveDraft],
  handler: function* () {
    const store = yield* DraftStore

    return ({ id, text }) =>
      store.save(id, text).pipe(Effect.as(Message.CompletedSaveDraft({ text })))
  },
})

const EditorComposition = makeComposition()
const init = EditorComposition.makeInit((id: string) => ({
  model: { id, text: '', savedText: '' },
  commands: [SaveDraft({ id, text: '' })],
}))
const update = EditorComposition.makeUpdate({
  UpdatedText: (model, { value }) => ({
    model: modifyFields(model, { text: () => value }),
    outMessage: OutMessage.Changed({ text: value }),
  }),
  CompletedSaveDraft: (model, { text }) => ({
    model: modifyFields(model, { savedText: () => text }),
    outMessage: OutMessage.Saved({ id: model.id, text }),
  }),
})
const inMessageUpdate = EditorComposition.makeInMessageUpdate({
  RequestedClear: makeFieldsStep(() => ({ text: () => '' })),
  RequestedSave: model => ({
    model,
    commands: [SaveDraft({ id: model.id, text: model.text })],
  }),
  InformedOfText: makeFieldsStep.fromMessage(({ text }) => ({
    text: () => text,
  })),
})
const view = EditorComposition.makeView.withInputs((model, { label }, h) =>
  h.label(
    [],
    [
      label,
      h.input([
        h.Value(model.text),
        h.OnInput(value => Message.UpdatedText({ value })),
      ]),
    ],
  ),
)

export const layer = EditorBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: SaveDraft.layer,
})
