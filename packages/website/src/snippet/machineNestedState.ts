import { defineTaggedUnion } from 'foldkit/schema'

import { CheckoutState } from './machineDefinition'

export const OrderFlow = defineTaggedUnion({
  Browsing: {},
  CheckingOut: { checkout: CheckoutState },
  Complete: {},
})
export type OrderFlow = typeof OrderFlow.Type
