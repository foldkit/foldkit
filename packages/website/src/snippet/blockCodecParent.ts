import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Program from 'foldkit/program'

import { LabelEditorBlock, layer as editorLayer } from './blockCodecChild'

const Model = Schema.Struct({ editor: LabelEditorBlock.Model })
type Model = typeof Model.Type
const Message = defineMessageUnion({ ClickedReload: {} })
type Message = typeof Message.Type
export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const { makeRequiredFieldBinding, makeComposition, makeNoopStep } =
  ApplicationBlock
const EditorBinding = makeRequiredFieldBinding(LabelEditorBlock, {
  field: 'editor',
})
const ApplicationComposition = makeComposition({ bindings: [EditorBinding] })

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* ApplicationComposition.acquireChildren()

    return {
      children,
      init: ApplicationComposition.makeInit(() => ({ model: {} })),
      update: ApplicationComposition.makeUpdate({
        ClickedReload: makeNoopStep(),
      }),
      view: ApplicationComposition.makeView((model, h) =>
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

export const dispatchProgram = Program.makeElement({
  block: ApplicationBlock,
  layer,
  container: null,
  devTools: { dispatch: true },
})
