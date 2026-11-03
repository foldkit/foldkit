import { HomeComposition } from './composition'
import { makeOutMessageStep } from './definition'
import { OutMessage } from './message'

export const update = HomeComposition.makeUpdate({
  UpdatedNewsletterEmail: makeOutMessageStep.fromMessage(({ value }) =>
    OutMessage.UpdatedNewsletterEmail({ value }),
  ),
})
