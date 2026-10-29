import { Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { Machine } from 'foldkit/experimental'
import { modifyFields } from 'foldkit/struct'

import { CheckoutState, Message, checkoutMachine } from './machineDefinition'

export const Model = Schema.Struct({
  checkout: CheckoutState,
  isHelpOpen: Schema.Boolean,
})
export type Model = typeof Model.Type

const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

export const initialModel = Model.make({
  checkout: checkoutMachine.initial,
  isHelpOpen: false,
})

export const foldCheckout = Machine.fold({
  machine: checkoutMachine,
  read: (model: Model) => Option.some(model.checkout),
  write: (model, nextCheckout) =>
    modifyFields(model, { checkout: () => nextCheckout }),
})

export const update = ApplicationComposition.makeUpdate({
  ToggledHelp: (model, { isOpen }) => ({
    model: modifyFields(model, { isHelpOpen: () => isOpen }),
  }),
  SelectedEdition: foldCheckout,
  ClickedContinue: foldCheckout,
  ClickedBack: foldCheckout,
  ClickedCancel: foldCheckout,
})
