import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  DialogBlock,
  layer as DialogLayer,
  type RenderInfo as DialogRenderInfo,
} from '@foldkit/ui/dialog'

// Add a field to your Model for the Dialog Block:
const Model = Schema.Struct({
  dialog: DialogBlock.Model,
  // ...your other fields
})
type Model = typeof Model.Type
// A fact for the trigger, plus the Dialog Message embedded in your parent
// Message for the block delegation:
const Message = defineMessageUnion({
  ClickedOpenDialog: {},
})
type Message = typeof Message.Type

export const DialogExampleKey = Symbol('DialogExample')

export const DialogExampleBlock = Block.make('DialogExample', {
  key: DialogExampleKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const { makeNoopStep } = DialogExampleBlock

// One boundary handles Dialog Messages, Commands, and OutMessages. Replace
// either no-op arm with the parent transition that should follow that event.
const foldDialogOutMessage = DialogExampleBlock.makeOutMessageFold(
  DialogBlock,
  {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: makeNoopStep,
  },
)

const DialogBinding = DialogExampleBlock.makeBinding(DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'confirm' }] },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

const DialogExampleComposition = DialogExampleBlock.makeComposition({
  bindings: [DialogBinding],
})

// In your init function, initialize the Dialog Block with a unique id:
const init = DialogExampleComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

const update = DialogExampleComposition.makeUpdate({
  ClickedOpenDialog: DialogBinding.requestOpen(),
})

// In your view, open from a trigger with the fact, and dismiss from a Cancel
// button by spreading the `closeButton` bundle, no parent message needed:
const view = DialogExampleComposition.makeView((model, h) => {
  const dialogView = ({
    dialog,
    backdrop,
    panel,
    title,
    description,
    closeButton,
    isVisible,
  }: DialogRenderInfo) =>
    h.dialog(
      [...dialog],
      isVisible
        ? [
            h.div([...backdrop, h.Class('fixed inset-0 bg-black/50')]),
            h.div(
              [...panel, h.Class('rounded-lg p-6 max-w-md mx-auto shadow-xl')],
              [
                h.h2([...title], ['Confirm Action']),
                h.p([...description], ['Are you sure you want to proceed?']),
                h.button(
                  [...closeButton, h.Class('px-4 py-2 rounded-lg border')],
                  ['Cancel'],
                ),
              ],
            ),
          ]
        : [],
    )

  return h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedOpenDialog())], ['Open Dialog']),
      h.block(
        DialogBinding.embedView({
          slotId: model.dialog.id,
          model: model.dialog,
          viewInputs: {
            hasDescription: true,
            toView: dialogView,
          },
        }),
      ),
    ],
  )
})

export const layer = DialogExampleBlock.makeLayer(
  Effect.gen(function* () {
    const dialog = yield* DialogBinding

    return {
      children: [dialog],
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(DialogLayer))
