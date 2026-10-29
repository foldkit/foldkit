import { Machine } from 'foldkit/experimental'

const CheckoutDefinition = Machine.makeDefinition({
  State: CheckoutState,
  Message,
})

const { ignore, otherwise, to, when } = CheckoutDefinition
