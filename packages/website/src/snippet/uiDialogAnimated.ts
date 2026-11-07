import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog } from '@foldkit/ui'

// Add a field to your Model for the Dialog Block:
const Model = Schema.Struct({
  dialog: Dialog.DialogBlock.Model,
  // ...your other fields
})
type Model = typeof Model.Type
// This excerpt has no parent-owned facts. The Composition derives Dialog
// delivery; open from a trigger with `DialogBinding.requestOpen()` as in the
// basic Dialog example.
const Message = defineMessageUnion({})
type Message = typeof Message.Type

export const AnimatedDialogExampleKey = Symbol('AnimatedDialogExample')
export const AnimatedDialogExampleBlock = Block.make('AnimatedDialogExample', {
  key: AnimatedDialogExampleKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const {
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeComposition,
} = AnimatedDialogExampleBlock

const DialogBinding = makeRequiredFieldBinding(Dialog.DialogBlock, {
  field: 'dialog',
  init: {
    contextToArgs: () => [{ id: 'confirm', isAnimated: true }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Dialog.DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: makeNoopStep,
  }),
})

const AnimatedDialogExampleComposition = makeComposition({
  bindings: [DialogBinding],
})

// In your init function, set isAnimated: true to coordinate CSS transitions:
const init = AnimatedDialogExampleComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

const update = AnimatedDialogExampleComposition.makeUpdate({})

// Inside your view function, use data-[closed] for enter/leave transitions and
// spread the `closeButton` bundle onto your dismiss buttons:
const view = AnimatedDialogExampleComposition.makeView((model, h) => {
  const dialogView = ({
    dialog,
    backdrop,
    panel,
    title,
    description,
    closeButton,
    isVisible,
  }: Dialog.RenderInfo) =>
    h.dialog(
      [
        ...dialog,
        h.Class('bg-transparent p-0 open:flex items-center justify-center'),
      ],
      isVisible
        ? [
            h.div([
              ...backdrop,
              h.Class(
                'fixed inset-0 bg-black/50 transition duration-150 ease-out data-[closed]:opacity-0',
              ),
            ]),
            h.div(
              [
                ...panel,
                h.Class(
                  'rounded-lg p-6 max-w-md mx-auto shadow-xl transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
                ),
              ],
              [
                h.h2([...title], ['Confirm Action']),
                h.p([...description], ['Are you sure you want to proceed?']),
                h.div(
                  [h.Class('flex gap-2 justify-end mt-4')],
                  [
                    h.button(
                      [...closeButton, h.Class('px-4 py-2 rounded-lg border')],
                      ['Cancel'],
                    ),
                    h.button(
                      [
                        ...closeButton,
                        h.Class('px-4 py-2 rounded-lg bg-blue-600 text-white'),
                      ],
                      ['Confirm'],
                    ),
                  ],
                ),
              ],
            ),
          ]
        : [],
    )

  return h.block(
    DialogBinding.embedView({
      slotId: model.dialog.id,
      model: model.dialog,
      viewInputs: {
        hasDescription: true,
        toView: dialogView,
      },
    }),
  )
})

export const layer = AnimatedDialogExampleBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* AnimatedDialogExampleComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Dialog.layer))
