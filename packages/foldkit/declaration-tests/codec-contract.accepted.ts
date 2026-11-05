import { Context, Effect, Layer, Schema, SchemaTransformation } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Program from 'foldkit/program'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

export class DispatchDecoder extends Context.Service<
  DispatchDecoder,
  Readonly<{ decode: (value: string) => string }>
>()('CodecContract/DispatchDecoder') {}
export class DispatchEncoder extends Context.Service<
  DispatchEncoder,
  Readonly<{ encode: (value: string) => string }>
>()('CodecContract/DispatchEncoder') {}
export const ServiceDecodedLabel = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value =>
        Effect.map(DispatchDecoder, service => service.decode(value)),
      encode: value =>
        Effect.map(DispatchEncoder, service => service.encode(value)),
    }),
  ),
)
export const ChildModel = Schema.Struct({ label: Schema.String })
export type ChildModel = typeof ChildModel.Type
export const ChildMessage = defineMessageUnion({
  SubmittedLabel: { label: ServiceDecodedLabel },
})
export type ChildMessage = typeof ChildMessage.Type
export const EditorKey = Symbol('CodecEditor')
export const EditorBlock = Block.make('CodecEditor', {
  key: EditorKey,
  Model: ChildModel,
  Message: ChildMessage,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const childComposition = EditorBlock.makeComposition()
export const editorLayer = EditorBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: childComposition.makeInit(() => ({
      model: ChildModel.make({ label: '' }),
    })),
    update: childComposition.makeUpdate({
      SubmittedLabel: (model, { label }) => ({
        model: modifyFields(model, { label: () => label }),
      }),
    }),
    view: childComposition.makeView((model, h) => h.div([], [model.label])),
  }),
)
export const Model = Schema.Struct({ editor: EditorBlock.Model })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({ ClickedReload: {} })
export type Message = typeof Message.Type
export const ApplicationKey = Symbol('CodecApplication')
export const ApplicationBlock = Block.make('CodecApplication', {
  key: ApplicationKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  codec: { decoding: [DispatchDecoder], encoding: [DispatchEncoder] },
})
export const EditorBinding = ApplicationBlock.makeBinding(EditorBlock, {
  field: 'editor',
})
const composition = ApplicationBlock.makeComposition({
  bindings: [EditorBinding],
})
export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const editor = yield* EditorBinding

    return {
      children: [editor],
      init: composition.makeInit(() => ({ model: {} })),
      update: composition.makeUpdate({
        ClickedReload: ApplicationBlock.makeNoopStep(),
      }),
      view: composition.makeView((model, h) =>
        h.div(
          [],
          [
            h.block(
              EditorBinding.embedView({
                slotId: 'editor',
                model: model.editor,
              }),
            ),
          ],
        ),
      ),
    }
  }),
).pipe(Layer.provide(editorLayer))
export const subject = { block: ApplicationBlock, layer }
export const DecoderLayer = Layer.succeed(DispatchDecoder, {
  decode: value => `decoded:${value}`,
})
export const EncoderLayer = Layer.succeed(DispatchEncoder, {
  encode: value => `encoded:${value}`,
})
export const dispatchProgram = Program.makeElement({
  ...subject,
  container: null,
  devTools: { dispatch: true },
})
export const quietProgram = Program.makeElement({ ...subject, container: null })
export const suppliedDispatchProgram = dispatchProgram.provide(DecoderLayer)
export const decoding = Story.withBlock(subject, executable =>
  Schema.decodeUnknownEffect(executable.Message)({
    _tag: 'GotEditorMessage',
    placement: 'editor',
    generation: 0,
    message: { _tag: 'SubmittedLabel', label: 'legacy' },
  }),
)
export const encoding = Story.withBlock(subject, executable =>
  Schema.encodeEffect(executable.Message)(Message.ClickedReload()),
)
