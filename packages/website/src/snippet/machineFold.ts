import { Match, Option, Schema } from 'effect'
import { Update } from 'foldkit'
import { Machine } from 'foldkit/experimental'
import { evo } from 'foldkit/struct'

import { CheckoutState, Message, checkoutMachine } from './machineDefinition'

export const Model = Schema.Struct({
  checkout: CheckoutState,
  isHelpOpen: Schema.Boolean,
})
export type Model = typeof Model.Type

export const initialModel = Model.make({
  checkout: checkoutMachine.initial,
  isHelpOpen: false,
})

export const foldCheckout = Machine.fold({
  machine: checkoutMachine,
  read: (model: Model) => Option.some(model.checkout),
  write: (model, nextCheckout) => evo(model, { checkout: () => nextCheckout }),
})

export const update = (model: Model, message: Message) =>
  Match.value(message).pipe(
    Match.withReturnType<Update.Return<Model, Message>>(),
    Match.tag('ToggledHelp', ({ isOpen }) => ({
      model: evo(model, { isHelpOpen: () => isOpen }),
    })),
    Match.tag(
      'SelectedEdition',
      'ClickedContinue',
      'ClickedBack',
      'ClickedCancel',
      () => foldCheckout(model, message),
    ),
    Match.exhaustive,
  )
