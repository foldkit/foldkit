import { ApplicationComposition } from './composition'
import { checkoutMachine } from './machine'
import { Model } from './model'

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    checkout: checkoutMachine.initial,
    transitionLog: [],
    nextTransitionLogId: 0,
  },
}))

export const initialModel: Model = init().model
