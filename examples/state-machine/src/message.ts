import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { RadioGroup } from '@foldkit/ui'

export const Message = defineMessageUnion({
  ClickedContinue: {},
  ClickedBack: {},
  ClickedCancel: {},
  ClickedPlaceOrder: {},
  ClickedStartOver: {},
  ToggledPaymentMethod: { isSelected: Schema.Boolean },
  SelectedEdition: { isShippingRequired: Schema.Boolean },
  GotEditionRadioGroupMessage: { message: RadioGroup.Message },
  ToggledTermsAccepted: { isAccepted: Schema.Boolean },
  UpdatedPromoCode: { value: Schema.String },
  SubmittedPromoCode: {},
  CompletedPlaceOrder: { orderId: Schema.String },
})

export type Message = typeof Message.Type
