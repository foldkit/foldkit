// ✅ Bind the public contract and resolve the original Mount Definition.
import { Effect, Layer, Schema } from 'effect'
import { Block, Scene } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  DialogBlock,
  layer as DialogLayer,
  test as DialogTest,
} from '@foldkit/ui/dialog'

const Model = Schema.Struct({ dialog: DialogBlock.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedOpenConfirm: {} })
type Message = typeof Message.Type

export const ConfirmKey = Symbol('Confirm')
export const ConfirmBlock = Block.make('Confirm', {
  key: ConfirmKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const { makeNoopStep, makeBinding, makeOutMessageFold, makeComposition } =
  ConfirmBlock

const DialogBinding = makeBinding(DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'confirm' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: makeNoopStep,
  }),
})
const ConfirmComposition = makeComposition({
  bindings: [DialogBinding],
})

const init = ConfirmComposition.makeInit(() => ({ model: {} }))
const update = ConfirmComposition.makeUpdate({
  ClickedOpenConfirm: DialogBinding.requestOpen(),
})
const view = ConfirmComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.button(
        [h.OnClick(Message.ClickedOpenConfirm())],
        ['Open confirmation'],
      ),
      h.block(
        DialogBinding.embedView({
          slotId: 'confirm',
          model: model.dialog,
          viewInputs: {
            toView: ({ dialog, panel, isVisible }) =>
              isVisible
                ? h.dialog([...dialog], [h.div([...panel], ['Confirm?'])])
                : h.empty,
          },
        }),
      ),
    ],
  ),
)

export const layer = ConfirmBlock.makeLayer(
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

await Effect.runPromise(
  Scene.scene(
    { block: ConfirmBlock, layer },
    Scene.init(),
    Scene.click(Scene.role('button', { name: 'Open confirmation' })),
    Scene.Command.resolve(
      DialogTest.ShowDialog,
      DialogBlock.Message.SucceededShowDialog(),
    ),
    Scene.Mount.resolve(
      DialogTest.AcquireResources,
      DialogBlock.Message.SucceededAcquireResources(),
    ),
  ),
)
