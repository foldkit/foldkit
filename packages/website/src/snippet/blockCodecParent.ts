import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Program from 'foldkit/program'

import {
  LegacyEditorBlock,
  MessageMigration,
  layer as editorLayer,
} from './blockCodecChild'

const Model = Schema.Struct({ editor: LegacyEditorBlock.Model })
type Model = typeof Model.Type
const Message = defineMessageUnion({ ClickedReload: {} })
type Message = typeof Message.Type
export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  codec: {
    decoding: [MessageMigration],
    encoding: [MessageMigration],
  },
})
const { makeBinding, makeComposition, makeNoopStep } = ApplicationBlock
const EditorBinding = makeBinding(LegacyEditorBlock, { field: 'editor' })
const ApplicationComposition = makeComposition({ bindings: [EditorBinding] })

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const editor = yield* EditorBinding

    return {
      children: [editor],
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

const MigrationLayer = Layer.succeed(MessageMigration, {
  decodeLabel: label => label.trim(),
  encodeLabel: label => label,
})

export const dispatchProgram = Program.makeElement({
  block: ApplicationBlock,
  layer,
  container: null,
  devTools: { dispatch: true },
}).provide(MigrationLayer)

export const quietProgram = Program.makeElement({
  block: ApplicationBlock,
  layer,
  container: null,
})
