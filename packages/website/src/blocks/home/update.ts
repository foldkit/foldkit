import { makeOutMessageStep } from './block'
import { HomeComposition } from './composition'
import { OutMessage } from './message'

export const update = HomeComposition.makeUpdate({
  UpdatedNewsletterEmail: makeOutMessageStep.fromMessage(({ value }) =>
    OutMessage.UpdatedNewsletterEmail({ value }),
  ),
})
