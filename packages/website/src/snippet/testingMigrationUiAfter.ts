// ✅ Bind the completed Block and use its public test Definition.
import { Schema, Tuple } from 'effect'
import { Block, Scene } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog } from '@foldkit/ui'

const Model = Schema.Struct({ dialog: Dialog.DialogBlock.Model })

const Message = defineMessageUnion({})
const ConfirmDefinition = Block.makeDefinition('Confirm', { Model, Message })

const { makeNoopStep } = ConfirmDefinition

const DialogBinding = ConfirmDefinition.makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => Tuple.make({ id: 'confirm' }) },
}).withOutMessagePolicy({
  fold: ConfirmDefinition.makeOutMessageFold(Dialog.DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: makeNoopStep,
  }),
})
const ConfirmComposition = ConfirmDefinition.makeComposition({
  bindings: [DialogBinding],
})

const init = ConfirmComposition.makeInit(() => ({ model: {} }))
export const dialog: typeof Dialog.DialogBlock.Model.Type = init().model.dialog

Scene.Mount.resolve(
  Dialog.test.AcquireResources,
  Dialog.DialogBlock.Message.SucceededAcquireResources(),
)
