import { Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { Machine } from 'foldkit/experimental'
import { modifyFields } from 'foldkit/struct'

import { CheckoutState, Message, checkoutMachine } from './machineDefinition'

export const Model = Schema.Struct({
  checkout: CheckoutState,
  isHelpOpen: Schema.Boolean,
})
export type Model = typeof Model.Type

export const foldCheckout = Machine.fold({
  machine: checkoutMachine,
  read: (model: Model) => Option.some(model.checkout),
  write: (model, nextCheckout) =>
    modifyFields(model, { checkout: () => nextCheckout }),
})

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: {
        checkout: checkoutMachine.initial,
        isHelpOpen: false,
      },
      update: {
        ToggledHelp: (model, { isOpen }) => ({
          model: modifyFields(model, { isHelpOpen: () => isOpen }),
        }),
        SelectedEdition: foldCheckout,
        ClickedContinue: foldCheckout,
        ClickedBack: foldCheckout,
        ClickedCancel: foldCheckout,
      },
    }
  }),
)
