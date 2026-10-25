import { HomeComposition } from './composition'
import { HomeDefinition } from './definition'
import { OutMessage } from './message'

export const update = HomeComposition.makeUpdate({
  UpdatedNewsletterEmail: HomeDefinition.makeOutMessageStep.fromMessage(
    ({ value }) => OutMessage.UpdatedNewsletterEmail({ value }),
  ),
})
