import { ApplicationComposition } from './composition'
import { checkoutMachine } from './machine'

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    checkout: checkoutMachine.initial,
    transitionLog: [],
    nextTransitionLogId: 0,
  },
}))
