import { ApplicationComposition } from './composition'
import type { Message } from './message'
import type { Model } from './model'
import { stepMachine } from './transition'

const handleMachineMessage = (
  model: typeof Model.Type,
  message: typeof Message.Type,
) => stepMachine(message)(model)

export const update = ApplicationComposition.makeUpdate({
  ClickedContinue: handleMachineMessage,
  ClickedBack: handleMachineMessage,
  ClickedCancel: handleMachineMessage,
  ClickedPlaceOrder: handleMachineMessage,
  ClickedStartOver: handleMachineMessage,
  ToggledPaymentMethod: handleMachineMessage,
  SelectedEdition: handleMachineMessage,
  ToggledTermsAccepted: handleMachineMessage,
  UpdatedPromoCode: handleMachineMessage,
  SubmittedPromoCode: handleMachineMessage,
  CompletedPlaceOrder: handleMachineMessage,
})
