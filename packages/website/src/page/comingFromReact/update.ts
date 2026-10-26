import { Record } from 'effect'

import { ComingFromReactComposition } from './composition'

export const update = ComingFromReactComposition.makeUpdate({
  ToggledFaq: (model, { id, isOpen }) => ({
    model: Record.set(model, id, isOpen),
  }),
})
