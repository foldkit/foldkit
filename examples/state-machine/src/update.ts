import { Match } from 'effect'

import { ApplicationComposition } from './composition'
import { stepMachine } from './transition'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Match.value(message).pipe(
    Match.tag(
      'ClickedContinue',
      'ClickedBack',
      'ClickedCancel',
      'ClickedPlaceOrder',
      'ClickedStartOver',
      'ToggledPaymentMethod',
      'SelectedEdition',
      'ToggledTermsAccepted',
      'UpdatedPromoCode',
      'SubmittedPromoCode',
      'CompletedPlaceOrder',
      () => stepMachine(message)(model),
    ),
    Match.exhaustive,
  ),
)
